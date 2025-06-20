"""
Base ontology loader class and main loader orchestrator
"""

import asyncio
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from abc import ABC, abstractmethod

from config.settings import Settings

logger = logging.getLogger(__name__)


class BaseOntologyLoader(ABC):
    """Abstract base class for ontology loaders"""
    
    def __init__(self, data_path: Path):
        self.data_path = data_path
        self.concepts: Dict[str, Any] = {}
        self.is_loaded = False
    
    @abstractmethod
    async def load(self) -> None:
        """Load ontology data"""
        pass
    
    @abstractmethod
    async def get_concept(self, code: str) -> Optional[Dict[str, Any]]:
        """Get a specific concept by code"""
        pass
    
    @abstractmethod
    async def search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for concepts"""
        pass


class OntologyLoader:
    """Main ontology loader that orchestrates individual loaders"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.loaders: Dict[str, BaseOntologyLoader] = {}
        self._initialize_loaders()
    
    def _initialize_loaders(self):
        """Initialize individual ontology loaders"""
        data_path = self.settings.data_path
        
        for ontology_config in self.settings.ontologies:
            if not ontology_config.enabled:
                continue
            
            ontology_name = ontology_config.name
            ontology_path = data_path / ontology_name.lower()
            
            if ontology_name == "SNOMED":
                from .snomed_loader import SnomedLoader
                self.loaders[ontology_name] = SnomedLoader(ontology_path)
            elif ontology_name == "ICD10":
                from .icd10_loader import ICD10Loader
                self.loaders[ontology_name] = ICD10Loader(ontology_path)
            elif ontology_name == "RxNorm":
                from .rxnorm_loader import RxNormLoader
                self.loaders[ontology_name] = RxNormLoader(ontology_path)
            elif ontology_name == "LOINC":
                from .loinc_loader import LoincLoader
                self.loaders[ontology_name] = LoincLoader(ontology_path)
            else:
                logger.warning(f"Unknown ontology: {ontology_name}")
    
    async def load_all(self):
        """Load all enabled ontologies"""
        tasks = []
        for name, loader in self.loaders.items():
            logger.info(f"Loading {name}...")
            tasks.append(self._load_ontology(name, loader))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for name, result in zip(self.loaders.keys(), results):
            if isinstance(result, Exception):
                logger.error(f"Failed to load {name}: {result}")
            else:
                logger.info(f"Successfully loaded {name}")
    
    async def _load_ontology(self, name: str, loader: BaseOntologyLoader):
        """Load a single ontology with error handling"""
        try:
            await loader.load()
            return True
        except Exception as e:
            logger.error(f"Error loading {name}: {str(e)}")
            raise
    
    async def get_concept(self, ontology: str, code: str) -> Optional[Dict[str, Any]]:
        """Get a concept from a specific ontology"""
        loader = self.loaders.get(ontology)
        if not loader:
            raise ValueError(f"Ontology not found: {ontology}")
        
        return await loader.get_concept(code)
    
    async def search(self, query: str, ontologies: List[str], limit: int = 10) -> Dict[str, List[Dict[str, Any]]]:
        """Search across multiple ontologies"""
        results = {}
        
        tasks = []
        for ontology in ontologies:
            if ontology in self.loaders:
                tasks.append(self._search_ontology(ontology, query, limit))
        
        search_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for ontology, result in zip(ontologies, search_results):
            if not isinstance(result, Exception):
                results[ontology] = result
            else:
                logger.error(f"Search error in {ontology}: {result}")
                results[ontology] = []
        
        return results
    
    async def _search_ontology(self, ontology: str, query: str, limit: int):
        """Search a single ontology"""
        loader = self.loaders.get(ontology)
        if loader:
            return await loader.search(query, limit)
        return []
    
    async def get_relationships(self, ontology: str, code: str) -> Dict[str, List[Dict[str, Any]]]:
        """Get relationships for a concept"""
        # This is a placeholder - implement in specific loaders
        return {
            "parents": [],
            "children": []
        }
    
    async def get_mappings(self, ontology: str, code: str) -> Dict[str, List[Dict[str, Any]]]:
        """Get cross-ontology mappings for a concept"""
        # This is a placeholder - implement mapping logic
        return {}