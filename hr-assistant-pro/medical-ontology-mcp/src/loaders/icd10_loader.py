"""
ICD-10 loader implementation
"""

import csv
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import json
import gzip

from .ontology_loader import BaseOntologyLoader

logger = logging.getLogger(__name__)


class ICD10Loader(BaseOntologyLoader):
    """Loader for ICD-10 data"""
    
    async def load(self) -> None:
        """Load ICD-10 data from files"""
        if self.is_loaded:
            return
        
        # Check for preprocessed data first
        processed_path = self.data_path.parent / f"{self.data_path.name}_processed"
        if processed_path.exists() and (processed_path / "metadata.json").exists():
            await self._load_preprocessed_data(processed_path)
            return
        
        # Check for sample data
        sample_file = self.data_path / "sample_concepts.json"
        if sample_file.exists():
            await self._load_sample_data(sample_file)
            return
        
        # Load raw data (text or XML format)
        await self._load_raw_data()
    
    async def _load_preprocessed_data(self, processed_path: Path):
        """Load preprocessed ICD-10 data"""
        logger.info(f"Loading preprocessed ICD-10 data from {processed_path}")
        
        # Load metadata
        with open(processed_path / "metadata.json", 'r') as f:
            metadata = json.load(f)
        
        total_concepts = metadata['total_codes']
        logger.info(f"Loading {total_concepts:,} preprocessed ICD-10 codes")
        
        # Load all levels
        for level in metadata['codes_by_level'].keys():
            level_file = processed_path / f"codes_level_{level}.json.gz"
            if level_file.exists():
                with gzip.open(level_file, 'rt', encoding='utf-8') as f:
                    level_concepts = json.load(f)
                    self.concepts.update(level_concepts)
        
        logger.info(f"Loaded {len(self.concepts)} ICD-10 codes")
        self.is_loaded = True
    
    async def _load_raw_data(self):
        """Load raw ICD-10 data (text format)"""
        # Find ICD-10 files
        codes_file = self.data_path / "icd102019syst_codes.txt"
        chapters_file = self.data_path / "icd102019syst_chapters.txt"
        
        if not codes_file.exists():
            # Try alternative patterns
            for pattern in ['icd10*.txt', 'icd10*.csv', 'ICD10*.txt']:
                files = list(self.data_path.glob(pattern))
                if files:
                    codes_file = files[0]
                    break
        
        if not codes_file.exists():
            raise FileNotFoundError(f"ICD-10 files not found in {self.data_path}")
        
        # Load chapters if available
        chapters = {}
        if chapters_file.exists():
            logger.info(f"Loading ICD-10 chapters from {chapters_file.name}")
            with open(chapters_file, 'r', encoding='utf-8') as f:
                for line in f:
                    parts = line.strip().split(';')
                    if len(parts) >= 2:
                        chapters[parts[0]] = parts[1]
        
        logger.info(f"Loading ICD-10 codes from {codes_file.name}")
        
        # Parse ICD-10 codes file
        # Format: level;type;X;chapter;parent;dotcode;code;description;...
        with open(codes_file, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split(';')
                if len(parts) >= 9:
                    level = parts[0]
                    type_code = parts[1]
                    chapter_num = parts[3]
                    dotted_code = parts[5]
                    code = parts[6]
                    description = parts[8]
                    
                    # Use the dotted code format (e.g., A00.0)
                    self.concepts[dotted_code] = {
                        'code': dotted_code,
                        'preferred_term': description,
                        'chapter': chapter_num,
                        'chapter_name': chapters.get(chapter_num, ''),
                        'parent_code': parts[4] if len(parts[4]) > 0 else None,
                        'synonyms': []
                    }
        
        logger.info(f"Loaded {len(self.concepts)} ICD-10 codes")
        self.is_loaded = True
    
    async def _load_sample_data(self, sample_file: Path):
        """Load sample data for testing"""
        logger.info("Loading ICD-10 sample data")
        
        with open(sample_file, 'r') as f:
            sample_concepts = json.load(f)
        
        for concept in sample_concepts:
            self.concepts[concept['code']] = concept
        
        logger.info(f"Loaded {len(self.concepts)} sample ICD-10 codes")
        self.is_loaded = True
    
    async def get_concept(self, code: str) -> Optional[Dict[str, Any]]:
        """Get a specific ICD-10 code"""
        return self.concepts.get(code)
    
    async def search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for ICD-10 codes"""
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
            
            if score > 0:
                result = {
                    'code': concept['code'],
                    'preferred_term': concept['preferred_term'],
                    'chapter': concept.get('chapter', ''),
                    'score': score
                }
                results.append((score, result))
        
        # Sort by score
        results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in results[:limit]]