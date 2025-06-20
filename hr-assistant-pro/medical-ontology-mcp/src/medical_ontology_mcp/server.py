"""
Medical Ontology MCP Server

FastAPI-based Model Context Protocol server for medical terminology
"""

import os
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import asyncio

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SearchRequest(BaseModel):
    query: str
    ontologies: Optional[List[str]] = None
    limit: int = 10


class SearchResponse(BaseModel):
    query: str
    results: Dict[str, List[Dict[str, Any]]]


class ConceptResponse(BaseModel):
    concept: Optional[Dict[str, Any]]


class MedicalOntologyMCPServer:
    """MCP Server for Medical Ontology operations"""
    
    def __init__(self, data_path: Path):
        self.data_path = data_path
        self.loaders = {}
        self.is_initialized = False
        
    async def initialize(self):
        """Initialize all ontology loaders"""
        if self.is_initialized:
            return
            
        logger.info("Initializing Medical Ontology MCP Server...")
        logger.info(f"Data path: {self.data_path}")
        
        try:
            # Import loaders (relative to current package structure)
            import sys
            from pathlib import Path
            
            # Add the src directory to path for imports
            src_path = Path(__file__).parent.parent.parent
            if str(src_path) not in sys.path:
                sys.path.insert(0, str(src_path))
            
            from loaders.icd10_loader import ICD10Loader
            from loaders.rxnorm_loader import RxNormLoader
            from loaders.snomed_loader import SnomedLoader
            from loaders.loinc_loader import LoincLoader
            
            # Initialize loaders
            self.loaders = {
                'ICD10': ICD10Loader(self.data_path / 'icd10'),
                'RxNorm': RxNormLoader(self.data_path / 'rxnorm'),
                'SNOMED': SnomedLoader(self.data_path / 'snomed'),
                'LOINC': LoincLoader(self.data_path / 'loinc'),
            }
            
            # Load ontologies
            for name, loader in self.loaders.items():
                try:
                    logger.info(f"Loading {name}...")
                    await loader.load()
                    logger.info(f"✅ {name} loaded successfully")
                except Exception as e:
                    logger.warning(f"⚠️  Failed to load {name}: {e}")
            
            self.is_initialized = True
            logger.info("🏥 Medical Ontology MCP Server initialized successfully!")
            
        except ImportError as e:
            logger.error(f"❌ Failed to import loaders: {e}")
            raise RuntimeError(f"Could not initialize loaders: {e}")
        except Exception as e:
            logger.error(f"❌ Initialization failed: {e}")
            raise
    
    async def search(
        self,
        query: str,
        ontologies: Optional[List[str]] = None,
        limit: int = 10
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Search across medical ontologies"""
        if not self.is_initialized:
            await self.initialize()
        
        if not ontologies:
            ontologies = list(self.loaders.keys())
        
        results = {}
        
        for ontology in ontologies:
            if ontology in self.loaders:
                try:
                    loader = self.loaders[ontology]
                    if hasattr(loader, 'search'):
                        ont_results = await loader.search(query, limit)
                        results[ontology] = ont_results
                    else:
                        results[ontology] = []
                except Exception as e:
                    logger.error(f"Search error in {ontology}: {e}")
                    results[ontology] = []
            else:
                results[ontology] = []
        
        return results
    
    async def get_concept(
        self,
        ontology: str,
        code: str
    ) -> Optional[Dict[str, Any]]:
        """Get concept details"""
        if not self.is_initialized:
            await self.initialize()
        
        if ontology in self.loaders:
            try:
                loader = self.loaders[ontology]
                if hasattr(loader, 'get_concept'):
                    return await loader.get_concept(code)
            except Exception as e:
                logger.error(f"Concept lookup error in {ontology}: {e}")
        
        return None
    
    def get_status(self) -> Dict[str, Any]:
        """Get server status"""
        return {
            'status': 'healthy' if self.is_initialized else 'initializing',
            'data_path': str(self.data_path),
            'ontologies': {
                name: {
                    'loaded': getattr(loader, 'is_loaded', False),
                    'concept_count': len(getattr(loader, 'concepts', {}))
                }
                for name, loader in self.loaders.items()
            }
        }


# Global server instance
server_instance = None


def get_server() -> MedicalOntologyMCPServer:
    """Get or create server instance"""
    global server_instance
    
    if server_instance is None:
        # Get data path from environment or default
        data_path = Path(os.environ.get('MCP_DATA_PATH', './data'))
        server_instance = MedicalOntologyMCPServer(data_path)
    
    return server_instance


# FastAPI app
app = FastAPI(
    title="Medical Ontology MCP Server",
    description="Model Context Protocol server for medical terminology and clinical coding",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize server on startup"""
    server = get_server()
    await server.initialize()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    server = get_server()
    return server.get_status()


@app.get("/search", response_model=SearchResponse)
async def search_endpoint(
    q: str = Query(..., description="Search query"),
    ontology: Optional[List[str]] = Query(None, description="Ontologies to search"),
    limit: int = Query(10, ge=1, le=100, description="Maximum results per ontology")
):
    """Search medical terms across ontologies"""
    try:
        server = get_server()
        results = await server.search(q, ontology, limit)
        return SearchResponse(query=q, results=results)
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search", response_model=SearchResponse)
async def search_post_endpoint(request: SearchRequest):
    """Search medical terms (POST version)"""
    try:
        server = get_server()
        results = await server.search(request.query, request.ontologies, request.limit)
        return SearchResponse(query=request.query, results=results)
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/concept/{ontology}/{code}", response_model=ConceptResponse)
async def get_concept_endpoint(ontology: str, code: str):
    """Get detailed information for a specific code"""
    try:
        server = get_server()
        concept = await server.get_concept(ontology, code)
        
        if concept is None:
            raise HTTPException(status_code=404, detail=f"Concept not found: {ontology}:{code}")
        
        return ConceptResponse(concept=concept)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Concept lookup failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/ontologies")
async def list_ontologies():
    """List available ontologies"""
    server = get_server()
    return {
        "ontologies": list(server.loaders.keys()),
        "status": server.get_status()
    }


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Medical Ontology MCP Server",
        "version": "1.0.0",
        "description": "Model Context Protocol server for medical terminology and clinical coding",
        "supported_ontologies": ["SNOMED CT", "ICD-10", "RxNorm", "LOINC"],
        "endpoints": {
            "health": "/health",
            "search": "/search?q=QUERY",
            "concept": "/concept/{ontology}/{code}",
            "ontologies": "/ontologies",
            "docs": "/docs"
        }
    }


# MCP Protocol Tools (for MCP clients)
MCP_TOOLS = [
    {
        "name": "search_medical_terms",
        "description": "Search across medical ontologies (SNOMED CT, ICD-10, RxNorm, LOINC)",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Medical term or condition to search for"
                },
                "ontologies": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["SNOMED", "ICD10", "RxNorm", "LOINC"]
                    },
                    "description": "Which ontologies to search (default: all)"
                },
                "limit": {
                    "type": "integer",
                    "default": 10,
                    "description": "Maximum number of results to return"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "lookup_medical_code",
        "description": "Look up detailed information for a specific medical code",
        "inputSchema": {
            "type": "object",
            "properties": {
                "code": {
                    "type": "string",
                    "description": "The medical code to look up"
                },
                "ontology": {
                    "type": "string",
                    "enum": ["SNOMED", "ICD10", "RxNorm", "LOINC"],
                    "description": "Which ontology the code belongs to"
                }
            },
            "required": ["code", "ontology"]
        }
    }
]


@app.get("/mcp/tools")
async def get_mcp_tools():
    """Get MCP tools definition"""
    return {"tools": MCP_TOOLS}


# For development
if __name__ == "__main__":
    import uvicorn
    
    # Get configuration from environment
    host = os.environ.get("MCP_HOST", "localhost")
    port = int(os.environ.get("MCP_PORT", 8080))
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )