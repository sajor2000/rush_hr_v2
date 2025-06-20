"""
Base loader with preprocessing support
"""

import json
import gzip
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class PreprocessedDataLoader(ABC):
    """Base class for loaders that can use preprocessed data"""
    
    def __init__(self, data_path: Path):
        self.data_path = data_path
        self.processed_path = Path(str(data_path) + "_processed")
        self.concepts = {}
        self.is_loaded = False
        self.used_preprocessed = False
    
    async def load(self) -> None:
        """Load data, preferring preprocessed if available"""
        # Check for preprocessed data
        if self.processed_path.exists() and (self.processed_path / 'metadata.json').exists():
            try:
                logger.info(f"Found preprocessed data at {self.processed_path}")
                await self.load_preprocessed()
                self.used_preprocessed = True
                self.is_loaded = True
                return
            except Exception as e:
                logger.warning(f"Failed to load preprocessed data: {e}")
                logger.info("Falling back to raw data loading")
        
        # Fall back to raw data loading
        await self.load_raw()
        self.is_loaded = True
    
    @abstractmethod
    async def load_raw(self) -> None:
        """Load from raw data files"""
        pass
    
    async def load_preprocessed(self) -> None:
        """Load from preprocessed data"""
        # Load metadata
        with open(self.processed_path / 'metadata.json', 'r') as f:
            metadata = json.load(f)
        
        logger.info(f"Loading {metadata.get('total_concepts', 0)} preprocessed concepts...")
        
        # Load concepts
        concept_files = list(self.processed_path.glob('concepts_*.json.gz'))
        
        for concept_file in concept_files:
            with gzip.open(concept_file, 'rt', encoding='utf-8') as f:
                chunk_concepts = json.load(f)
                self.concepts.update(chunk_concepts)
        
        # Load search index if exists
        search_index_file = self.processed_path / 'search_index.json.gz'
        if search_index_file.exists():
            with gzip.open(search_index_file, 'rt', encoding='utf-8') as f:
                self.search_index = json.load(f)
        
        logger.info(f"Loaded {len(self.concepts)} concepts from preprocessed data")
    
    async def get_concept(self, code: str) -> Optional[Dict[str, Any]]:
        """Get a specific concept"""
        return self.concepts.get(code)
    
    async def search(self, query: str, limit: int = 10) -> list:
        """Search using preprocessed index if available"""
        if hasattr(self, 'search_index') and self.search_index:
            return await self.search_with_index(query, limit)
        else:
            return await self.search_without_index(query, limit)
    
    async def search_with_index(self, query: str, limit: int) -> list:
        """Search using preprocessed search index"""
        query_words = query.lower().split()
        matching_codes = set()
        
        # Find concepts containing any query word
        for word in query_words:
            if word in self.search_index:
                matching_codes.update(self.search_index[word])
        
        # Score and rank results
        results = []
        for code in matching_codes:
            if code in self.concepts:
                concept = self.concepts[code]
                score = self.calculate_relevance_score(query, concept)
                if score > 0:
                    result = {
                        'code': code,
                        'preferred_term': concept.get('preferred_term', ''),
                        'score': score
                    }
                    # Add additional fields based on ontology
                    self.add_search_result_fields(result, concept)
                    results.append(result)
        
        # Sort by score and return top results
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:limit]
    
    @abstractmethod
    async def search_without_index(self, query: str, limit: int) -> list:
        """Fallback search without index"""
        pass
    
    def calculate_relevance_score(self, query: str, concept: Dict[str, Any]) -> float:
        """Calculate relevance score for a concept"""
        query_lower = query.lower()
        score = 0.0
        
        # Check preferred term
        preferred_term = concept.get('preferred_term', '').lower()
        if query_lower == preferred_term:
            score = 1.0
        elif query_lower in preferred_term:
            score = 0.8
        elif preferred_term.startswith(query_lower):
            score = 0.9
        
        # Check synonyms
        if score < 0.7:
            for synonym in concept.get('synonyms', []):
                synonym_lower = synonym.lower()
                if query_lower == synonym_lower:
                    score = max(score, 0.85)
                elif query_lower in synonym_lower:
                    score = max(score, 0.7)
        
        return score
    
    @abstractmethod
    def add_search_result_fields(self, result: Dict, concept: Dict) -> None:
        """Add ontology-specific fields to search results"""
        pass