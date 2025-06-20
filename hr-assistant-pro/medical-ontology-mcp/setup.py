#!/usr/bin/env python3
"""
Setup script for Medical Ontology MCP Server
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read README for long description
readme_path = Path(__file__).parent / "README.md"
if readme_path.exists():
    with open(readme_path, "r", encoding="utf-8") as f:
        long_description = f.read()
else:
    long_description = "Medical Ontology MCP Server for clinical terminology and coding"

# Read requirements
requirements_path = Path(__file__).parent / "requirements.txt"
if requirements_path.exists():
    with open(requirements_path, "r", encoding="utf-8") as f:
        requirements = [line.strip() for line in f if line.strip() and not line.startswith("#")]
else:
    requirements = [
        "fastapi>=0.104.0",
        "uvicorn>=0.24.0",
        "pydantic>=2.5.0",
        "click>=8.1.0",
        "aiofiles>=23.2.1",
        "python-multipart>=0.0.6"
    ]

setup(
    name="medical-ontology-mcp",
    version="1.0.0",
    author="Medical Informatics Research Team",
    author_email="contact@medical-ontology-mcp.org",
    description="Model Context Protocol server for medical terminology and clinical coding",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/sajor2000/mcp_medicalterminology",
    project_urls={
        "Bug Reports": "https://github.com/sajor2000/mcp_medicalterminology/issues",
        "Documentation": "https://medical-ontology-mcp.readthedocs.io/",
        "Source": "https://github.com/sajor2000/mcp_medicalterminology",
        "Changelog": "https://github.com/sajor2000/mcp_medicalterminology/blob/main/CHANGELOG.md",
    },
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Science/Research",
        "Intended Audience :: Healthcare Industry",
        "Topic :: Scientific/Engineering :: Medical Science Apps.",
        "Topic :: Scientific/Engineering :: Information Analysis",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Operating System :: OS Independent",
        "Environment :: Console",
        "Environment :: Web Environment",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.1.0",
            "black>=23.0.0",
            "isort>=5.12.0",
            "flake8>=6.0.0",
            "mypy>=1.5.0",
        ],
        "jupyter": [
            "jupyter>=1.0.0",
            "ipython>=8.0.0",
            "notebook>=6.5.0",
            "ipywidgets>=8.0.0",
        ],
        "research": [
            "pandas>=2.0.0",
            "numpy>=1.24.0",
            "scipy>=1.10.0",
            "matplotlib>=3.7.0",
            "seaborn>=0.12.0",
            "scikit-learn>=1.3.0",
        ],
        "performance": [
            "orjson>=3.9.0",
            "ujson>=5.8.0",
            "httpx>=0.25.0",
            "asyncpg>=0.28.0",
        ],
        "enterprise": [
            "redis>=4.6.0",
            "celery>=5.3.0",
            "docker>=6.1.0",
            "kubernetes>=27.2.0",
        ],
        "all": [
            "pytest>=7.4.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.1.0",
            "black>=23.0.0",
            "isort>=5.12.0",
            "flake8>=6.0.0",
            "mypy>=1.5.0",
            "jupyter>=1.0.0",
            "ipython>=8.0.0",
            "notebook>=6.5.0",
            "ipywidgets>=8.0.0",
            "pandas>=2.0.0",
            "numpy>=1.24.0",
            "scipy>=1.10.0",
            "matplotlib>=3.7.0",
            "seaborn>=0.12.0",
            "scikit-learn>=1.3.0",
            "orjson>=3.9.0",
            "ujson>=5.8.0",
            "httpx>=0.25.0",
            "asyncpg>=0.28.0",
            "redis>=4.6.0",
            "celery>=5.3.0",
            "docker>=6.1.0",
            "kubernetes>=27.2.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "medical-ontology-mcp=medical_ontology_mcp.cli:main",
            "medical-mcp=medical_ontology_mcp.cli:main",
            "mcp-medical=medical_ontology_mcp.cli:main",
        ],
    },
    include_package_data=True,
    package_data={
        "medical_ontology_mcp": [
            "data/sample/*.json",
            "data/sample/*.csv",
            "configs/*.json",
            "configs/*.yaml",
            "templates/*.html",
            "templates/*.md",
        ],
    },
    keywords=[
        "medical",
        "ontology", 
        "clinical",
        "terminology",
        "healthcare",
        "informatics",
        "ICD-10",
        "SNOMED",
        "RxNorm", 
        "LOINC",
        "MCP",
        "model-context-protocol",
        "AI",
        "research",
        "coding",
        "diagnosis",
        "medication",
        "laboratory",
        "FHIR",
        "HL7",
    ],
    zip_safe=False,
)