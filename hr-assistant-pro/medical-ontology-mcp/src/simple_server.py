#!/usr/bin/env python3
"""
Simple HTTP API server for medical ontologies (without MCP dependency)
This provides a REST API that can be used for testing and development.
"""

import asyncio
import json
import csv
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
from datetime import datetime

# Increase CSV field size limit for large SNOMED descriptions
csv.field_size_limit(500000)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class OntologyManager:
    """Manages all ontology loaders"""
    
    def __init__(self, data_path: Path):
        self.data_path = data_path
        self.loaders = {}
        self.is_loaded = False
    
    async def initialize(self):
        """Initialize all loaders"""
        logger.info("Initializing ontology loaders...")
        
        # Initialize each loader
        from loaders.snomed_loader import SnomedLoader
        from loaders.icd10_loader import ICD10Loader
        from loaders.rxnorm_loader import RxNormLoader
        from loaders.loinc_loader import LoincLoader
        
        self.loaders['SNOMED'] = SnomedLoader(self.data_path / 'snomed')
        self.loaders['ICD10'] = ICD10Loader(self.data_path / 'icd10')
        self.loaders['RxNorm'] = RxNormLoader(self.data_path / 'rxnorm')
        self.loaders['LOINC'] = LoincLoader(self.data_path / 'loinc')
        
        # Load all ontologies
        for name, loader in self.loaders.items():
            try:
                logger.info(f"Loading {name}...")
                await loader.load()
                logger.info(f"Successfully loaded {name}")
            except Exception as e:
                logger.error(f"Failed to load {name}: {e}")
        
        self.is_loaded = True
        logger.info("Initialization complete")
    
    async def search(self, query: str, ontologies: Optional[List[str]] = None, limit: int = 10) -> Dict[str, List[Dict]]:
        """Search across ontologies"""
        if not ontologies:
            ontologies = list(self.loaders.keys())
        
        results = {}
        for ontology in ontologies:
            if ontology in self.loaders:
                try:
                    results[ontology] = await self.loaders[ontology].search(query, limit)
                except Exception as e:
                    logger.error(f"Search error in {ontology}: {e}")
                    results[ontology] = []
        
        return results
    
    async def get_concept(self, ontology: str, code: str) -> Optional[Dict[str, Any]]:
        """Get a specific concept"""
        if ontology in self.loaders:
            return await self.loaders[ontology].get_concept(code)
        return None
    
    def get_status(self) -> Dict[str, Any]:
        """Get server status"""
        status = {
            'status': 'healthy' if self.is_loaded else 'loading',
            'timestamp': datetime.now().isoformat(),
            'ontologies': {}
        }
        
        for name, loader in self.loaders.items():
            status['ontologies'][name] = {
                'loaded': loader.is_loaded,
                'concept_count': len(loader.concepts) if hasattr(loader, 'concepts') else 0
            }
        
        return status


# Global ontology manager
ontology_manager = None


class SimpleHTTPHandler(BaseHTTPRequestHandler):
    """Simple HTTP request handler"""
    
    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        query_params = urllib.parse.parse_qs(parsed_path.query)
        
        if path == '/health':
            self.send_json_response(ontology_manager.get_status())
        
        elif path == '/search':
            query = query_params.get('q', [''])[0]
            ontologies = query_params.get('ontology', [])
            limit = int(query_params.get('limit', ['10'])[0])
            
            if not query:
                self.send_error(400, "Missing query parameter 'q'")
                return
            
            # Run async search
            loop = asyncio.new_event_loop()
            results = loop.run_until_complete(
                ontology_manager.search(query, ontologies if ontologies else None, limit)
            )
            loop.close()
            
            self.send_json_response({'query': query, 'results': results})
        
        elif path.startswith('/concept/'):
            # Format: /concept/ONTOLOGY/CODE
            parts = path.split('/')
            if len(parts) >= 4:
                ontology = parts[2]
                code = '/'.join(parts[3:])  # Handle codes with slashes
                
                # Run async get_concept
                loop = asyncio.new_event_loop()
                concept = loop.run_until_complete(
                    ontology_manager.get_concept(ontology, code)
                )
                loop.close()
                
                if concept:
                    self.send_json_response({'concept': concept})
                else:
                    self.send_error(404, f"Concept not found: {ontology}:{code}")
            else:
                self.send_error(400, "Invalid concept path")
        
        else:
            self.send_error(404, "Not found")
    
    def send_json_response(self, data: Dict[str, Any]):
        """Send JSON response"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())
    
    def log_message(self, format, *args):
        """Override to use logger"""
        logger.info(f"{self.address_string()} - {format % args}")


async def initialize_server():
    """Initialize the server"""
    global ontology_manager
    
    # Create ontology manager - use the data path
    data_path = Path("./data")
    ontology_manager = OntologyManager(data_path)
    
    # Initialize loaders
    await ontology_manager.initialize()


def main():
    """Main entry point"""
    logger.info("Starting Medical Ontology API Server")
    
    # Initialize server
    loop = asyncio.new_event_loop()
    loop.run_until_complete(initialize_server())
    loop.close()
    
    # Start HTTP server
    port = 8080
    server = HTTPServer(('localhost', port), SimpleHTTPHandler)
    
    logger.info(f"Server running at http://localhost:{port}")
    logger.info("Endpoints:")
    logger.info("  GET /health - Server health check")
    logger.info("  GET /search?q=QUERY&ontology=ONTOLOGY&limit=N - Search concepts")
    logger.info("  GET /concept/ONTOLOGY/CODE - Get specific concept")
    logger.info("")
    logger.info("Example: http://localhost:8080/search?q=diabetes&ontology=ICD10&limit=5")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()