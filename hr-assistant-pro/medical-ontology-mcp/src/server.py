#!/usr/bin/env python3
"""
Medical Ontology MCP Server
Main server implementation for the Model Context Protocol
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from mcp import Server, Tool, ErrorCode
from mcp.types import TextContent
from pydantic import BaseModel, Field

from config.settings import Settings
from loaders.ontology_loader import OntologyLoader
from search.search_engine import SearchEngine
from mapping.text_mapper import TextMapper

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SearchParameters(BaseModel):
    """Parameters for search tool"""
    query: str = Field(..., description="The search term or phrase")
    ontologies: Optional[List[str]] = Field(None, description="List of ontologies to search")
    limit: int = Field(10, description="Maximum results per ontology", ge=1, le=100)
    fuzzy: bool = Field(True, description="Enable fuzzy matching")
    include_synonyms: bool = Field(True, description="Search in synonyms")


class GetConceptParameters(BaseModel):
    """Parameters for get_concept tool"""
    ontology: str = Field(..., description="The ontology name")
    code: str = Field(..., description="The concept code")
    include_relationships: bool = Field(False, description="Include related concepts")
    include_mappings: bool = Field(False, description="Include cross-ontology mappings")


class MapTextParameters(BaseModel):
    """Parameters for map_text tool"""
    text: str = Field(..., description="The text to analyze")
    ontologies: Optional[List[str]] = Field(None, description="Target ontologies for mapping")
    context: Optional[str] = Field(None, description="Clinical context")
    threshold: float = Field(0.7, description="Minimum confidence threshold", ge=0.0, le=1.0)


class ValidateCodesParameters(BaseModel):
    """Parameters for validate_codes tool"""
    codes: List[Dict[str, str]] = Field(..., description="List of codes to validate")


class BatchProcessParameters(BaseModel):
    """Parameters for batch_process tool"""
    operations: List[Dict[str, Any]] = Field(..., description="List of operations to perform")


class MedicalOntologyServer:
    """Main MCP server for medical ontologies"""
    
    def __init__(self, config_path: Optional[Path] = None):
        self.settings = Settings(config_path)
        self.server = Server("medical-ontology-mcp")
        self.loader = OntologyLoader(self.settings)
        self.search_engine = SearchEngine()
        self.text_mapper = TextMapper(self.search_engine)
        self.is_initialized = False
        
        # Register tools
        self._register_tools()
    
    def _register_tools(self):
        """Register all MCP tools"""
        
        @self.server.tool(
            name="search",
            description="Search for medical concepts across ontologies"
        )
        async def search(parameters: SearchParameters) -> List[TextContent]:
            """Search for medical concepts"""
            try:
                results = await self.search_engine.search(
                    query=parameters.query,
                    ontologies=parameters.ontologies or self.settings.enabled_ontologies,
                    limit=parameters.limit,
                    fuzzy=parameters.fuzzy,
                    include_synonyms=parameters.include_synonyms
                )
                
                return [TextContent(
                    type="text",
                    text=json.dumps({"results": results}, indent=2)
                )]
            except Exception as e:
                logger.error(f"Search error: {str(e)}")
                raise
        
        @self.server.tool(
            name="get_concept",
            description="Get detailed information about a specific concept"
        )
        async def get_concept(parameters: GetConceptParameters) -> List[TextContent]:
            """Get concept details"""
            try:
                concept = await self.loader.get_concept(
                    ontology=parameters.ontology,
                    code=parameters.code
                )
                
                if not concept:
                    raise ValueError(f"Concept not found: {parameters.ontology}:{parameters.code}")
                
                # Add relationships if requested
                if parameters.include_relationships:
                    concept['relationships'] = await self.loader.get_relationships(
                        parameters.ontology,
                        parameters.code
                    )
                
                # Add mappings if requested
                if parameters.include_mappings:
                    concept['mappings'] = await self.loader.get_mappings(
                        parameters.ontology,
                        parameters.code
                    )
                
                return [TextContent(
                    type="text",
                    text=json.dumps({"concept": concept}, indent=2)
                )]
            except Exception as e:
                logger.error(f"Get concept error: {str(e)}")
                raise
        
        @self.server.tool(
            name="map_text",
            description="Map free text to standardized medical concepts"
        )
        async def map_text(parameters: MapTextParameters) -> List[TextContent]:
            """Map text to concepts"""
            try:
                mappings = await self.text_mapper.map_text(
                    text=parameters.text,
                    ontologies=parameters.ontologies or self.settings.enabled_ontologies,
                    context=parameters.context,
                    threshold=parameters.threshold
                )
                
                return [TextContent(
                    type="text",
                    text=json.dumps({"mappings": mappings}, indent=2)
                )]
            except Exception as e:
                logger.error(f"Map text error: {str(e)}")
                raise
        
        @self.server.tool(
            name="validate_codes",
            description="Validate a list of medical codes"
        )
        async def validate_codes(parameters: ValidateCodesParameters) -> List[TextContent]:
            """Validate medical codes"""
            try:
                validations = []
                
                for code_info in parameters.codes:
                    ontology = code_info.get('ontology')
                    code = code_info.get('code')
                    
                    if not ontology or not code:
                        validations.append({
                            'ontology': ontology,
                            'code': code,
                            'valid': False,
                            'error': 'Missing ontology or code'
                        })
                        continue
                    
                    concept = await self.loader.get_concept(ontology, code)
                    
                    validations.append({
                        'ontology': ontology,
                        'code': code,
                        'valid': concept is not None,
                        'term': concept.get('preferred_term') if concept else None
                    })
                
                return [TextContent(
                    type="text",
                    text=json.dumps({"validations": validations}, indent=2)
                )]
            except Exception as e:
                logger.error(f"Validate codes error: {str(e)}")
                raise
        
        @self.server.tool(
            name="batch_process",
            description="Process multiple operations in a single request"
        )
        async def batch_process(parameters: BatchProcessParameters) -> List[TextContent]:
            """Process batch operations"""
            try:
                results = []
                
                for operation in parameters.operations:
                    op_type = operation.get('operation')
                    op_params = operation.get('parameters', {})
                    
                    try:
                        if op_type == 'search':
                            result = await search(SearchParameters(**op_params))
                        elif op_type == 'get_concept':
                            result = await get_concept(GetConceptParameters(**op_params))
                        elif op_type == 'map_text':
                            result = await map_text(MapTextParameters(**op_params))
                        else:
                            result = [TextContent(
                                type="text",
                                text=json.dumps({"error": f"Unknown operation: {op_type}"})
                            )]
                        
                        # Extract JSON from TextContent
                        results.append(json.loads(result[0].text))
                    except Exception as e:
                        results.append({"error": str(e)})
                
                return [TextContent(
                    type="text",
                    text=json.dumps({"results": results}, indent=2)
                )]
            except Exception as e:
                logger.error(f"Batch process error: {str(e)}")
                raise
    
    async def initialize(self):
        """Initialize the server and load ontologies"""
        if self.is_initialized:
            return
        
        logger.info("Initializing Medical Ontology MCP Server...")
        
        # Load ontologies
        logger.info("Loading ontologies...")
        await self.loader.load_all()
        
        # Initialize search engine
        logger.info("Initializing search engine...")
        await self.search_engine.initialize(self.loader)
        
        # Initialize text mapper
        self.text_mapper.search_engine = self.search_engine
        
        self.is_initialized = True
        logger.info("Server initialized successfully")
    
    async def run(self):
        """Run the MCP server"""
        # Initialize first
        await self.initialize()
        
        # Start server
        logger.info(f"Starting MCP server on {self.settings.server.host}:{self.settings.server.port}")
        async with self.server:
            await self.server.run()


async def main():
    """Main entry point"""
    # Parse command line arguments
    config_path = None
    if len(sys.argv) > 1:
        config_path = Path(sys.argv[1])
    
    # Create and run server
    server = MedicalOntologyServer(config_path)
    
    try:
        await server.run()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        raise


if __name__ == "__main__":
    asyncio.run(main())