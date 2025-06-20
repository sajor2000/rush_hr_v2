"""
Search engine for medical ontologies
"""

import logging
from typing import Dict, List, Any, Optional
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


class SearchEngine:
    """Unified search engine for all ontologies"""
    
    def __init__(self):
        self.loader = None
        self.is_initialized = False
    
    async def initialize(self, loader):
        """Initialize with ontology loader"""
        self.loader = loader
        self.is_initialized = True
        logger.info("Search engine initialized")
    
    async def search(self, 
                    query: str, 
                    ontologies: List[str],
                    limit: int = 10,
                    fuzzy: bool = True,
                    include_synonyms: bool = True) -> Dict[str, List[Dict[str, Any]]]:
        """
        Search across multiple ontologies
        
        Args:
            query: Search query
            ontologies: List of ontology names to search
            limit: Maximum results per ontology
            fuzzy: Enable fuzzy matching
            include_synonyms: Search in synonym terms
            
        Returns:
            Dictionary mapping ontology names to search results
        """
        if not self.is_initialized:
            raise RuntimeError("Search engine not initialized")
        
        # Use loader's search functionality
        results = await self.loader.search(query, ontologies, limit)
        
        # Apply additional fuzzy matching if enabled
        if fuzzy:
            for ontology in results:
                results[ontology] = self._apply_fuzzy_scoring(query, results[ontology])
        
        return results
    
    def _apply_fuzzy_scoring(self, query: str, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply fuzzy matching scores to results"""
        query_lower = query.lower()
        
        for result in results:
            # If no score exists, calculate fuzzy score
            if 'score' not in result:
                term = result.get('preferred_term', '').lower()
                result['score'] = SequenceMatcher(None, query_lower, term).ratio()
        
        # Re-sort by score
        results.sort(key=lambda x: x.get('score', 0), reverse=True)
        return results
    
    async def get_concept_details(self, ontology: str, code: str) -> Optional[Dict[str, Any]]:
        """Get detailed concept information"""
        return await self.loader.get_concept(ontology, code)