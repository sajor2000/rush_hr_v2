"""
LOINC loader implementation
"""

import csv
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import json

from .ontology_loader import BaseOntologyLoader

# Increase CSV field size limit for LOINC descriptions
csv.field_size_limit(500000)

logger = logging.getLogger(__name__)


class LoincLoader(BaseOntologyLoader):
    """Loader for LOINC data"""
    
    async def load(self) -> None:
        """Load LOINC data from files"""
        if self.is_loaded:
            return
        
        # Check for sample data first
        sample_file = self.data_path / "sample_concepts.json"
        if sample_file.exists():
            await self._load_sample_data(sample_file)
            return
        
        # Load main LOINC file
        loinc_file = self.data_path / "Loinc.csv"
        if not loinc_file.exists():
            # Try alternative name
            loinc_file = self.data_path / "loinc.csv"
            if not loinc_file.exists():
                raise FileNotFoundError(f"Loinc.csv not found in {self.data_path}")
        
        logger.info(f"Loading LOINC codes from {loinc_file.name}")
        
        with open(loinc_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                # Get key fields
                loinc_num = row.get('LOINC_NUM', '')
                if not loinc_num:
                    continue
                
                self.concepts[loinc_num] = {
                    'code': loinc_num,
                    'preferred_term': row.get('LONG_COMMON_NAME', ''),
                    'short_name': row.get('SHORTNAME', ''),
                    'class': row.get('CLASS', ''),
                    'status': row.get('STATUS', 'ACTIVE'),
                    'property': row.get('PROPERTY', ''),
                    'system': row.get('SYSTEM', ''),
                    'scale': row.get('SCALE_TYP', ''),
                    'method': row.get('METHOD_TYP', ''),
                    'semantic_types': ['Laboratory Procedure'],
                    'synonyms': []
                }
                
                # Add short name as synonym if different
                short_name = row.get('SHORTNAME', '')
                if short_name and short_name != self.concepts[loinc_num]['preferred_term']:
                    self.concepts[loinc_num]['synonyms'].append(short_name)
        
        logger.info(f"Loaded {len(self.concepts)} LOINC codes")
        self.is_loaded = True
    
    async def _load_sample_data(self, sample_file: Path):
        """Load sample data for testing"""
        logger.info("Loading LOINC sample data")
        
        with open(sample_file, 'r') as f:
            sample_concepts = json.load(f)
        
        for concept in sample_concepts:
            self.concepts[concept['code']] = concept
        
        logger.info(f"Loaded {len(self.concepts)} sample LOINC codes")
        self.is_loaded = True
    
    async def get_concept(self, code: str) -> Optional[Dict[str, Any]]:
        """Get a specific LOINC code"""
        return self.concepts.get(code)
    
    async def search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for LOINC codes"""
        query_lower = query.lower()
        results = []
        
        for concept in self.concepts.values():
            score = 0
            term_lower = concept['preferred_term'].lower()
            short_name_lower = concept.get('short_name', '').lower()
            
            # Check preferred term
            if query_lower == term_lower:
                score = 1.0
            elif term_lower.startswith(query_lower):
                score = 0.9
            elif query_lower in term_lower:
                score = 0.8
            # Check short name
            elif query_lower == short_name_lower:
                score = 0.85
            elif short_name_lower and query_lower in short_name_lower:
                score = 0.75
            
            if score > 0:
                result = {
                    'code': concept['code'],
                    'preferred_term': concept['preferred_term'],
                    'short_name': concept.get('short_name', ''),
                    'class': concept.get('class', ''),
                    'semantic_types': concept.get('semantic_types', []),
                    'score': score
                }
                results.append((score, result))
        
        # Sort by score
        results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in results[:limit]]