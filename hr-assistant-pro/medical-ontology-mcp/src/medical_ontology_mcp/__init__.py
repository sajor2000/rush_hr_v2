"""
Medical Ontology MCP Server

A Model Context Protocol server for medical terminology and clinical coding.
Supports SNOMED CT, ICD-10, RxNorm, and LOINC ontologies.
"""

__version__ = "1.0.0"
__author__ = "Medical Informatics Research Team"
__email__ = "research@medical-informatics.org"
__description__ = "Model Context Protocol server for medical terminology and clinical coding"

from .server import MedicalOntologyMCPServer
from .client import MedicalOntologyClient

__all__ = [
    "MedicalOntologyMCPServer",
    "MedicalOntologyClient",
    "__version__",
]