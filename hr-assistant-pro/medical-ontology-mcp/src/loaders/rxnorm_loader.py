"""
RxNorm loader implementation
"""

import csv
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import json

from .ontology_loader import BaseOntologyLoader

logger = logging.getLogger(__name__)


class RxNormLoader(BaseOntologyLoader):
    """Loader for RxNorm data"""
    
    async def load(self) -> None:
        """Load RxNorm data from files"""
        if self.is_loaded:
            return
        
        # Check for sample data first
        sample_file = self.data_path / "sample_concepts.json"
        if sample_file.exists():
            await self._load_sample_data(sample_file)
            return
        
        # Load RXNCONSO.RRF
        conso_file = self.data_path / "RXNCONSO.RRF"
        if not conso_file.exists():
            raise FileNotFoundError(f"RXNCONSO.RRF not found in {self.data_path}")
        
        logger.info("Loading RxNorm concepts from RXNCONSO.RRF")
        
        with open(conso_file, 'r', encoding='utf-8') as f:
            for line in f:
                fields = line.strip().split('|')
                if len(fields) < 15:
                    continue
                
                rxcui = fields[0]
                language = fields[1]
                term_status = fields[2]
                is_preferred = fields[6] == 'Y'
                source = fields[11]
                term = fields[14]
                
                # Only process English terms from RxNorm source
                if language != 'ENG' or source != 'RXNORM':
                    continue
                
                if rxcui not in self.concepts:
                    self.concepts[rxcui] = {
                        'code': rxcui,
                        'preferred_term': None,
                        'synonyms': [],
                        'semantic_types': ['Pharmacologic Substance']
                    }
                
                if is_preferred:
                    self.concepts[rxcui]['preferred_term'] = term
                else:
                    self.concepts[rxcui]['synonyms'].append(term)
        
        # Remove concepts without preferred terms
        self.concepts = {k: v for k, v in self.concepts.items() if v['preferred_term']}
        
        logger.info(f"Loaded {len(self.concepts)} RxNorm concepts")
        self.is_loaded = True
    
    async def _load_sample_data(self, sample_file: Path):
        """Load sample data for testing"""
        logger.info("Loading RxNorm sample data")
        
        with open(sample_file, 'r') as f:
            sample_concepts = json.load(f)
        
        for concept in sample_concepts:
            self.concepts[concept['code']] = concept
        
        logger.info(f"Loaded {len(self.concepts)} sample RxNorm concepts")
        self.is_loaded = True
    
    async def get_concept(self, code: str) -> Optional[Dict[str, Any]]:
        """Get a specific RxNorm concept"""
        return self.concepts.get(code)
    
    async def search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for RxNorm concepts"""
        query_lower = query.lower()
        results = []
        
        for concept in self.concepts.values():
            score = 0
            term_lower = concept['preferred_term'].lower()
            
            if query_lower == term_lower:
                score = 1.0
            elif term_lower.startswith(query_lower):
                score = 0.9
            elif query_lower in term_lower:
                score = 0.8
            else:
                # Check synonyms
                for synonym in concept.get('synonyms', []):
                    if query_lower in synonym.lower():
                        score = 0.7
                        break
            
            if score > 0:
                result = {
                    'code': concept['code'],
                    'preferred_term': concept['preferred_term'],
                    'semantic_types': concept.get('semantic_types', []),
                    'score': score
                }
                results.append((score, result))
        
        # Sort by score
        results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in results[:limit]]