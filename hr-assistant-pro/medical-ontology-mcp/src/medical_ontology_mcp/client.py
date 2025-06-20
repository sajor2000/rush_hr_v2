"""
Medical Ontology MCP Client

Python client for interacting with the Medical Ontology MCP Server
"""

import asyncio
import aiohttp
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
import logging

logger = logging.getLogger(__name__)


class MedicalOntologyClient:
    """Client for Medical Ontology MCP Server"""
    
    def __init__(
        self, 
        base_url: Optional[str] = None,
        data_path: Optional[Path] = None,
        timeout: int = 30
    ):
        """
        Initialize the client
        
        Args:
            base_url: URL of the MCP server (if None, uses local mode)
            data_path: Path to local data (for local mode)
            timeout: Request timeout in seconds
        """
        self.base_url = base_url
        self.data_path = data_path
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.session = None
        self.local_mode = base_url is None
        self.loaders = {}
        
    async def initialize(self):
        """Initialize the client"""
        if self.local_mode:
            await self._initialize_local_mode()
        else:
            await self._initialize_remote_mode()
    
    async def _initialize_local_mode(self):
        """Initialize local mode with direct data access"""
        if not self.data_path:
            self.data_path = Path("./data")
        
        # Import loaders
        try:
            from ..loaders.icd10_loader import ICD10Loader
            from ..loaders.rxnorm_loader import RxNormLoader
            from ..loaders.snomed_loader import SnomedLoader
            from ..loaders.loinc_loader import LoincLoader
            
            # Initialize loaders
            self.loaders = {
                'ICD10': ICD10Loader(self.data_path / 'icd10'),
                'RxNorm': RxNormLoader(self.data_path / 'rxnorm'),
                'SNOMED': SnomedLoader(self.data_path / 'snomed'),
                'LOINC': LoincLoader(self.data_path / 'loinc'),
            }
            
            # Load all ontologies
            for name, loader in self.loaders.items():
                try:
                    await loader.load()
                    logger.info(f"Loaded {name} ontology")
                except Exception as e:
                    logger.warning(f"Failed to load {name}: {e}")
                    
        except ImportError as e:
            raise RuntimeError(f"Local mode requires source installation: {e}")
    
    async def _initialize_remote_mode(self):
        """Initialize remote mode with HTTP client"""
        self.session = aiohttp.ClientSession(timeout=self.timeout)
        
        # Test connection
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                if response.status != 200:
                    raise ConnectionError(f"Server health check failed: {response.status}")
                logger.info("Connected to remote MCP server")
        except Exception as e:
            await self.close()
            raise ConnectionError(f"Failed to connect to MCP server: {e}")
    
    async def close(self):
        """Close client connections"""
        if self.session:
            await self.session.close()
    
    async def search(
        self,
        query: str,
        ontologies: Optional[List[str]] = None,
        limit: int = 10
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Search across medical ontologies
        
        Args:
            query: Search term
            ontologies: List of ontologies to search (default: all)
            limit: Maximum results per ontology
            
        Returns:
            Dictionary mapping ontology names to result lists
        """
        if self.local_mode:
            return await self._search_local(query, ontologies, limit)
        else:
            return await self._search_remote(query, ontologies, limit)
    
    async def _search_local(
        self,
        query: str,
        ontologies: Optional[List[str]],
        limit: int
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Search using local loaders"""
        if not ontologies:
            ontologies = list(self.loaders.keys())
        
        results = {}
        
        for ontology in ontologies:
            if ontology in self.loaders:
                try:
                    loader = self.loaders[ontology]
                    ont_results = await loader.search(query, limit)
                    results[ontology] = ont_results
                except Exception as e:
                    logger.error(f"Search error in {ontology}: {e}")
                    results[ontology] = []
            else:
                results[ontology] = []
        
        return results
    
    async def _search_remote(
        self,
        query: str,
        ontologies: Optional[List[str]],
        limit: int
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Search using remote API"""
        params = {
            'q': query,
            'limit': limit
        }
        
        if ontologies:
            params['ontology'] = ontologies
        
        async with self.session.get(f"{self.base_url}/search", params=params) as response:
            if response.status == 200:
                data = await response.json()
                return data.get('results', {})
            else:
                error_text = await response.text()
                raise RuntimeError(f"Search failed: {response.status} - {error_text}")
    
    async def get_concept(
        self,
        ontology: str,
        code: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed information for a specific code
        
        Args:
            ontology: Ontology name (SNOMED, ICD10, RxNorm, LOINC)
            code: The code to look up
            
        Returns:
            Concept details or None if not found
        """
        if self.local_mode:
            return await self._get_concept_local(ontology, code)
        else:
            return await self._get_concept_remote(ontology, code)
    
    async def _get_concept_local(
        self,
        ontology: str,
        code: str
    ) -> Optional[Dict[str, Any]]:
        """Get concept using local loaders"""
        if ontology in self.loaders:
            try:
                loader = self.loaders[ontology]
                return await loader.get_concept(code)
            except Exception as e:
                logger.error(f"Concept lookup error in {ontology}: {e}")
        return None
    
    async def _get_concept_remote(
        self,
        ontology: str,
        code: str
    ) -> Optional[Dict[str, Any]]:
        """Get concept using remote API"""
        url = f"{self.base_url}/concept/{ontology}/{code}"
        
        async with self.session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                return data.get('concept')
            elif response.status == 404:
                return None
            else:
                error_text = await response.text()
                raise RuntimeError(f"Concept lookup failed: {response.status} - {error_text}")
    
    async def map_codes(
        self,
        source_code: str,
        source_ontology: str,
        target_ontology: str
    ) -> List[Dict[str, Any]]:
        """
        Map codes between ontologies
        
        Args:
            source_code: Code to map from
            source_ontology: Source ontology
            target_ontology: Target ontology
            
        Returns:
            List of mapped codes
        """
        if self.local_mode:
            return await self._map_codes_local(source_code, source_ontology, target_ontology)
        else:
            return await self._map_codes_remote(source_code, source_ontology, target_ontology)
    
    async def _map_codes_local(
        self,
        source_code: str,
        source_ontology: str,
        target_ontology: str
    ) -> List[Dict[str, Any]]:
        """Map codes using local data (basic implementation)"""
        # This is a simplified implementation
        # In practice, you'd need proper mapping tables
        
        # Get source concept
        source_concept = await self.get_concept(source_ontology, source_code)
        if not source_concept:
            return []
        
        # Search for similar terms in target ontology
        search_term = source_concept.get('preferred_term', '')
        if search_term:
            results = await self.search(search_term, [target_ontology], limit=5)
            return results.get(target_ontology, [])
        
        return []
    
    async def _map_codes_remote(
        self,
        source_code: str,
        source_ontology: str,
        target_ontology: str
    ) -> List[Dict[str, Any]]:
        """Map codes using remote API"""
        params = {
            'source_code': source_code,
            'source_ontology': source_ontology,
            'target_ontology': target_ontology
        }
        
        async with self.session.get(f"{self.base_url}/map", params=params) as response:
            if response.status == 200:
                data = await response.json()
                return data.get('mappings', [])
            else:
                error_text = await response.text()
                raise RuntimeError(f"Code mapping failed: {response.status} - {error_text}")
    
    async def get_status(self) -> Dict[str, Any]:
        """Get server/client status"""
        if self.local_mode:
            return {
                'mode': 'local',
                'data_path': str(self.data_path),
                'ontologies': {
                    name: {
                        'loaded': loader.is_loaded,
                        'concept_count': len(getattr(loader, 'concepts', {}))
                    }
                    for name, loader in self.loaders.items()
                }
            }
        else:
            async with self.session.get(f"{self.base_url}/health") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {'status': 'error', 'code': response.status}
    
    # Context manager support
    async def __aenter__(self):
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


# Convenience functions for common operations
async def search_medical_terms(
    query: str,
    ontologies: Optional[List[str]] = None,
    limit: int = 10,
    data_path: Optional[Path] = None
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Convenience function to search medical terms
    
    Args:
        query: Search term
        ontologies: List of ontologies to search
        limit: Maximum results per ontology
        data_path: Path to local data
        
    Returns:
        Search results
    """
    async with MedicalOntologyClient(data_path=data_path) as client:
        return await client.search(query, ontologies, limit)


async def lookup_medical_code(
    code: str,
    ontology: str,
    data_path: Optional[Path] = None
) -> Optional[Dict[str, Any]]:
    """
    Convenience function to lookup a medical code
    
    Args:
        code: Medical code
        ontology: Ontology name
        data_path: Path to local data
        
    Returns:
        Concept details
    """
    async with MedicalOntologyClient(data_path=data_path) as client:
        return await client.get_concept(ontology, code)


# Synchronous wrappers for convenience
def search_medical_terms_sync(*args, **kwargs) -> Dict[str, List[Dict[str, Any]]]:
    """Synchronous wrapper for search_medical_terms"""
    return asyncio.run(search_medical_terms(*args, **kwargs))


def lookup_medical_code_sync(*args, **kwargs) -> Optional[Dict[str, Any]]:
    """Synchronous wrapper for lookup_medical_code"""
    return asyncio.run(lookup_medical_code(*args, **kwargs))