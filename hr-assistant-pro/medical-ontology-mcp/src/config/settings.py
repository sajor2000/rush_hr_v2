"""
Configuration settings for the Medical Ontology MCP Server
"""

import os
from pathlib import Path
from typing import List, Optional, Dict, Any
import yaml
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings


class ServerConfig(BaseModel):
    """Server configuration"""
    host: str = "0.0.0.0"
    port: int = 8080
    log_level: str = "INFO"
    cors_enabled: bool = True
    cors_origins: List[str] = ["*"]


class LocalDataConfig(BaseModel):
    """Local data source configuration"""
    path: str = "./data"
    cache_enabled: bool = True
    cache_ttl: int = 3600


class RemoteDataConfig(BaseModel):
    """Remote data source configuration"""
    url: str
    auth_token: Optional[str] = None
    timeout: int = 30
    retry_count: int = 3


class DataSourceConfig(BaseModel):
    """Data source configuration"""
    type: str = "local"  # local, remote, or hybrid
    local: Optional[LocalDataConfig] = None
    remote: Optional[RemoteDataConfig] = None


class OntologyConfig(BaseModel):
    """Individual ontology configuration"""
    name: str
    enabled: bool = True
    version: Optional[str] = None
    index_path: Optional[str] = None


class SearchConfig(BaseModel):
    """Search configuration"""
    max_results: int = 100
    fuzzy_threshold: float = 0.8
    enable_synonyms: bool = True
    enable_stemming: bool = True


class PerformanceConfig(BaseModel):
    """Performance configuration"""
    max_workers: int = 4
    batch_size: int = 1000
    index_on_startup: bool = True
    preload_cache: bool = False


class CacheConfig(BaseModel):
    """Cache configuration"""
    type: str = "memory"  # memory or redis
    redis: Optional[Dict[str, Any]] = None


class Settings(BaseSettings):
    """Main settings class"""
    server: ServerConfig = ServerConfig()
    data_source: DataSourceConfig = DataSourceConfig()
    ontologies: List[OntologyConfig] = [
        OntologyConfig(name="SNOMED"),
        OntologyConfig(name="ICD10"),
        OntologyConfig(name="RxNorm"),
        OntologyConfig(name="LOINC")
    ]
    search: SearchConfig = SearchConfig()
    performance: PerformanceConfig = PerformanceConfig()
    cache: Optional[CacheConfig] = None
    warning: Optional[str] = None
    
    class Config:
        env_prefix = "MCP_"
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    def __init__(self, config_path: Optional[Path] = None, **kwargs):
        """Initialize settings from config file and environment"""
        # Load from config file if provided
        config_data = {}
        if config_path and config_path.exists():
            with open(config_path, 'r') as f:
                config_data = yaml.safe_load(f) or {}
        else:
            # Try default locations
            for path in ['config/config.yaml', 'config.yaml']:
                if Path(path).exists():
                    with open(path, 'r') as f:
                        config_data = yaml.safe_load(f) or {}
                    break
        
        # Merge with kwargs
        config_data.update(kwargs)
        
        # Initialize with merged data
        super().__init__(**config_data)
    
    @property
    def enabled_ontologies(self) -> List[str]:
        """Get list of enabled ontology names"""
        return [ont.name for ont in self.ontologies if ont.enabled]
    
    @property
    def data_path(self) -> Path:
        """Get data path"""
        if self.data_source.type == "local" and self.data_source.local:
            return Path(self.data_source.local.path)
        return Path("./data")
    
    def get_ontology_config(self, name: str) -> Optional[OntologyConfig]:
        """Get configuration for a specific ontology"""
        for ont in self.ontologies:
            if ont.name == name:
                return ont
        return None