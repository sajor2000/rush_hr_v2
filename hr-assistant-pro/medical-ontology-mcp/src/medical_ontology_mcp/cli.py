#!/usr/bin/env python3
"""
Command Line Interface for Medical Ontology MCP Server
"""

import asyncio
import sys
import click
import uvicorn
from pathlib import Path
from typing import Optional

from . import __version__
from .server import MedicalOntologyMCPServer


@click.group()
@click.version_option(version=__version__)
@click.pass_context
def main(ctx):
    """Medical Ontology MCP Server - Clinical terminology and coding assistance"""
    ctx.ensure_object(dict)


@main.command()
@click.option(
    "--host",
    default="localhost",
    help="Host to bind the server to"
)
@click.option(
    "--port", 
    default=8080,
    type=int,
    help="Port to bind the server to"
)
@click.option(
    "--data-path",
    type=click.Path(exists=True, path_type=Path),
    default="./data",
    help="Path to medical ontology data directory"
)
@click.option(
    "--log-level",
    type=click.Choice(["DEBUG", "INFO", "WARNING", "ERROR"]),
    default="INFO",
    help="Logging level"
)
@click.option(
    "--reload",
    is_flag=True,
    help="Enable auto-reload for development"
)
@click.option(
    "--workers",
    type=int,
    default=1,
    help="Number of worker processes"
)
def serve(host: str, port: int, data_path: Path, log_level: str, reload: bool, workers: int):
    """Start the Medical Ontology MCP server"""
    click.echo(f"🏥 Starting Medical Ontology MCP Server v{__version__}")
    click.echo(f"📊 Data path: {data_path}")
    click.echo(f"🌐 Server: http://{host}:{port}")
    
    # Configure uvicorn
    config = {
        "app": "medical_ontology_mcp.server:app",
        "host": host,
        "port": port,
        "log_level": log_level.lower(),
        "reload": reload,
    }
    
    if not reload and workers > 1:
        config["workers"] = workers
    
    # Set environment variables
    import os
    os.environ["MCP_DATA_PATH"] = str(data_path)
    os.environ["MCP_LOG_LEVEL"] = log_level
    
    # Start server
    uvicorn.run(**config)


@main.command()
@click.option(
    "--data-path",
    type=click.Path(exists=True, path_type=Path),
    default="./data",
    help="Path to medical ontology data directory"
)
@click.option(
    "--ontology",
    type=click.Choice(["snomed", "icd10", "rxnorm", "loinc", "all"]),
    default="all",
    help="Which ontology to preprocess"
)
@click.option(
    "--clean",
    is_flag=True,
    help="Clean existing processed data before preprocessing"
)
@click.option(
    "--force",
    is_flag=True,
    help="Force preprocessing even if data already exists"
)
def preprocess(data_path: Path, ontology: str, clean: bool, force: bool):
    """Preprocess medical ontology data for optimal performance"""
    click.echo(f"⚡ Preprocessing medical ontology data...")
    click.echo(f"📊 Data path: {data_path}")
    click.echo(f"🎯 Ontology: {ontology}")
    
    try:
        from ..setup.preprocess_all import OntologyPreprocessor
        
        preprocessor = OntologyPreprocessor(data_path)
        
        if clean:
            click.echo("🧹 Cleaning old processed data...")
            preprocessor.clean_old_processed_data()
        
        if ontology == "all":
            success = preprocessor.preprocess_all()
        else:
            success = preprocessor.preprocess_ontology(ontology)
        
        if success:
            click.echo("✅ Preprocessing completed successfully!")
        else:
            click.echo("❌ Preprocessing failed!")
            sys.exit(1)
            
    except ImportError:
        click.echo("❌ Preprocessing modules not found. Please install from source.")
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ Preprocessing failed: {e}")
        sys.exit(1)


@main.command()
@click.option(
    "--project-root",
    type=click.Path(path_type=Path),
    default=".",
    help="Root directory of the project"
)
@click.option(
    "--editor",
    type=click.Choice(["claude_desktop", "claude_code", "vscode", "cursor", "windsurf"]),
    help="Configure for specific editor only"
)
def configure(project_root: Path, editor: Optional[str]):
    """Auto-configure MCP for detected editors"""
    click.echo("🔧 Configuring Medical Ontology MCP for editors...")
    
    try:
        from ..setup.configure_mcp import MCPConfigurator
        
        configurator = MCPConfigurator(project_root)
        
        if editor:
            success = configurator.configure_editor(editor)
            if success:
                click.echo(f"✅ Successfully configured {editor}")
            else:
                click.echo(f"❌ Failed to configure {editor}")
                sys.exit(1)
        else:
            results = configurator.configure_all()
            
            if not results:
                click.echo("❌ No editors configured")
                sys.exit(1)
            
            successful = sum(results.values())
            total = len(results)
            
            click.echo(f"📊 Configuration Summary: {successful}/{total} successful")
            
            for editor_name, success in results.items():
                status = "✅" if success else "❌"
                click.echo(f"{status} {editor_name}")
            
            if successful > 0:
                click.echo("🚀 Setup complete! Restart your editor to use Medical Ontology MCP.")
                
    except ImportError:
        click.echo("❌ Configuration modules not found. Please install from source.")
        sys.exit(1)
    except Exception as e:
        click.echo(f"❌ Configuration failed: {e}")
        sys.exit(1)


@main.command()
@click.option(
    "--query",
    required=True,
    help="Medical term to search for"
)
@click.option(
    "--ontology",
    type=click.Choice(["SNOMED", "ICD10", "RxNorm", "LOINC"]),
    help="Specific ontology to search"
)
@click.option(
    "--limit",
    type=int,
    default=5,
    help="Maximum number of results"
)
@click.option(
    "--data-path",
    type=click.Path(exists=True, path_type=Path),
    default="./data",
    help="Path to medical ontology data directory"
)
def search(query: str, ontology: Optional[str], limit: int, data_path: Path):
    """Search medical terms across ontologies"""
    click.echo(f"🔍 Searching for: '{query}'")
    
    async def run_search():
        try:
            from .client import MedicalOntologyClient
            
            client = MedicalOntologyClient(data_path=data_path)
            await client.initialize()
            
            ontologies = [ontology] if ontology else None
            results = await client.search(query, ontologies=ontologies, limit=limit)
            
            if not results:
                click.echo("❌ No results found")
                return
            
            for ont_name, ont_results in results.items():
                if ont_results:
                    click.echo(f"\\n📋 {ont_name} Results:")
                    for i, result in enumerate(ont_results, 1):
                        click.echo(f"  {i}. {result.get('code', 'N/A')} - {result.get('preferred_term', 'N/A')}")
                        
        except Exception as e:
            click.echo(f"❌ Search failed: {e}")
            sys.exit(1)
    
    asyncio.run(run_search())


@main.command()
@click.option(
    "--code",
    required=True,
    help="Medical code to look up"
)
@click.option(
    "--ontology",
    type=click.Choice(["SNOMED", "ICD10", "RxNorm", "LOINC"]),
    required=True,
    help="Ontology the code belongs to"
)
@click.option(
    "--data-path",
    type=click.Path(exists=True, path_type=Path),
    default="./data",
    help="Path to medical ontology data directory"
)
def lookup(code: str, ontology: str, data_path: Path):
    """Look up detailed information for a specific medical code"""
    click.echo(f"🔍 Looking up {ontology} code: {code}")
    
    async def run_lookup():
        try:
            from .client import MedicalOntologyClient
            
            client = MedicalOntologyClient(data_path=data_path)
            await client.initialize()
            
            result = await client.get_concept(ontology, code)
            
            if not result:
                click.echo("❌ Code not found")
                return
            
            click.echo(f"\\n📋 {ontology} Code Details:")
            click.echo(f"Code: {result.get('code', 'N/A')}")
            click.echo(f"Term: {result.get('preferred_term', 'N/A')}")
            
            if 'chapter' in result:
                click.echo(f"Chapter: {result['chapter']}")
            if 'chapter_description' in result:
                click.echo(f"Chapter Description: {result['chapter_description']}")
            if 'synonyms' in result and result['synonyms']:
                click.echo(f"Synonyms: {', '.join(result['synonyms'][:3])}")
                
        except Exception as e:
            click.echo(f"❌ Lookup failed: {e}")
            sys.exit(1)
    
    asyncio.run(run_lookup())


@main.command()
def info():
    """Display information about the Medical Ontology MCP server"""
    click.echo(f"""
🏥 Medical Ontology MCP Server v{__version__}
============================================

A Model Context Protocol server for medical terminology and clinical coding.

Supported Ontologies:
• SNOMED CT - Clinical terminology
• ICD-10 - Diagnosis codes
• RxNorm - Medication terminology  
• LOINC - Laboratory codes

Features:
• Fast full-text search across all ontologies
• Cross-ontology mapping and relationships
• High-performance preprocessing (20x faster loading)
• Universal MCP integration (Claude, VS Code, Cursor, Windsurf)
• Research-friendly batch processing
• Academic citation support

Usage:
  medical-ontology-mcp serve     # Start MCP server
  medical-ontology-mcp search    # Search medical terms
  medical-ontology-mcp configure # Setup editor integration

Documentation: https://medical-ontology-mcp.readthedocs.io/
Repository: https://github.com/sajor2000/mcp_medicalterminology
""")


if __name__ == "__main__":
    main()