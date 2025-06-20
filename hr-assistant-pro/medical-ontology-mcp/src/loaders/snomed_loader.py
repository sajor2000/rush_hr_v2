"""
SNOMED CT loader implementation
"""

import csv
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import json

from .ontology_loader import BaseOntologyLoader

# Increase CSV field size limit for large SNOMED descriptions
csv.field_size_limit(500000)

logger = logging.getLogger(__name__)


class SnomedLoader(BaseOntologyLoader):
    """Loader for SNOMED CT data"""
    
    async def load(self) -> None:
        """Load SNOMED CT data from files"""
        if self.is_loaded:
            return
        
        # Check for sample data first
        sample_file = self.data_path / "sample_concepts.json"
        if sample_file.exists():
            await self._load_sample_data(sample_file)
            return
        
        # Load real SNOMED data
        concept_file = None
        description_file = None
        
        # Find concept file
        for file in self.data_path.glob("sct2_Concept_*.txt"):
            concept_file = file
            break
        
        # Find description file
        for file in self.data_path.glob("sct2_Description_*.txt"):
            description_file = file
            break
        
        if not concept_file or not description_file:
            raise FileNotFoundError(
                f"SNOMED CT files not found in {self.data_path}. "
                "Expected sct2_Concept_*.txt and sct2_Description_*.txt"
            )
        
        # Load concepts
        logger.info(f"Loading SNOMED concepts from {concept_file.name}")
        concepts_data = {}
        
        with open(concept_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter='\t')
            for row in reader:
                concept_id = row['id']
                concepts_data[concept_id] = {
                    'code': concept_id,
                    'active': row['active'] == '1',
                    'effective_date': row['effectiveTime'],
                    'descriptions': [],
                    'preferred_term': None,
                    'synonyms': []
                }
        
        # Load descriptions
        logger.info(f"Loading SNOMED descriptions from {description_file.name}")
        
        with open(description_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter='\t')
            for row in reader:
                if row['active'] != '1':
                    continue
                
                concept_id = row['conceptId']
                if concept_id in concepts_data:
                    term = row['term']
                    type_id = row['typeId']
                    
                    # Check if this is a preferred term
                    if type_id == '900000000000013009':  # Preferred term
                        concepts_data[concept_id]['preferred_term'] = term
                    else:
                        concepts_data[concept_id]['synonyms'].append(term)
                    
                    concepts_data[concept_id]['descriptions'].append({
                        'term': term,
                        'type_id': type_id,
                        'language': row['languageCode']
                    })
        
        # Store only active concepts with descriptions
        for concept_id, data in concepts_data.items():
            if data['active'] and data['preferred_term']:
                self.concepts[concept_id] = data
        
        logger.info(f"Loaded {len(self.concepts)} SNOMED concepts")
        self.is_loaded = True
    
    async def _load_sample_data(self, sample_file: Path):
        """Load sample data for testing"""
        logger.info("Loading SNOMED sample data")
        
        with open(sample_file, 'r') as f:
            sample_concepts = json.load(f)
        
        for concept in sample_concepts:
            self.concepts[concept['code']] = concept
        
        logger.info(f"Loaded {len(self.concepts)} sample SNOMED concepts")
        self.is_loaded = True
    
    async def get_concept(self, code: str) -> Optional[Dict[str, Any]]:
        """Get a specific SNOMED concept"""
        return self.concepts.get(code)
    
    async def search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for SNOMED concepts"""
        query_lower = query.lower()
        results = []
        scores = []
        
        for concept in self.concepts.values():
            # Calculate relevance score
            score = 0
            preferred_term_lower = concept['preferred_term'].lower()
            
            # Exact match
            if query_lower == preferred_term_lower:
                score = 1.0
            # Starts with query
            elif preferred_term_lower.startswith(query_lower):
                score = 0.9
            # Contains query
            elif query_lower in preferred_term_lower:
                score = 0.8
            # Check synonyms
            else:
                for synonym in concept.get('synonyms', []):
                    synonym_lower = synonym.lower()
                    if query_lower == synonym_lower:
                        score = 0.85
                        break
                    elif synonym_lower.startswith(query_lower):
                        score = 0.75
                        break
                    elif query_lower in synonym_lower:
                        score = 0.7
                        break
            
            if score > 0:
                result = {
                    'code': concept['code'],
                    'preferred_term': concept['preferred_term'],
                    'synonyms': concept.get('synonyms', [])[:3],
                    'semantic_types': concept.get('semantic_types', ['Clinical Finding']),
                    'score': score
                }
                results.append(result)
                scores.append(score)
        
        # Sort by score and return top results
        sorted_results = sorted(zip(scores, results), key=lambda x: x[0], reverse=True)
        return [r[1] for r in sorted_results[:limit]]