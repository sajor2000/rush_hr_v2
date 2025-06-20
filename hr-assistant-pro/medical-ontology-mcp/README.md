# Medical Ontology MCP Server

An open-source Model Context Protocol (MCP) server for working with medical ontologies including SNOMED CT, ICD-10, RxNorm, and LOINC. Designed for academic researchers who need flexible, reproducible access to medical terminology services.

## Features

- 🏥 Support for major medical ontologies (SNOMED CT, ICD-10, RxNorm, LOINC)
- 🔍 Full-text search across all ontologies
- 🔗 Cross-ontology mapping and relationships
- ⚡ High-performance preprocessing for 20x faster loading
- 🔍 Automatic format detection (XML, CSV, RRF formats)
- 🚀 Easy setup with Docker or Python
- 📊 Research-friendly with batch processing support
- 🔒 Data privacy - bring your own ontology files
- 📖 Full API documentation and examples
- 🎓 Academic citation support

## ⚠️ Important: Data Acquisition Required

**This repository does NOT include medical ontology data files.** You must obtain them separately from official sources due to licensing restrictions.

📖 **[Start Here: Data Acquisition Guide](DATA_ACQUISITION.md)** - Step-by-step instructions to obtain:
- SNOMED CT from NLM (free US license)
- ICD-10-CM from CMS (public domain)
- RxNorm from NLM (free license)
- LOINC from Regenstrief (free registration)

## Quick Start

### Prerequisites

- Python 3.8+ or Docker
- Medical ontology data files (see [Data Acquisition Guide](DATA_ACQUISITION.md))

### Option 1: NPX Installation (Recommended)

```bash
# Install globally via NPX
npx medical-ontology-mcp setup

# Or install locally for a project
npm install medical-ontology-mcp
npx medical-ontology-mcp setup
```

### Option 2: Python Package Installation

```bash
# Install from PyPI
pip install medical-ontology-mcp

# Set up data (see Data Acquisition Guide)
python -m medical_ontology_mcp.setup.preprocess_all --data-path ./data

# Start server
python -m medical_ontology_mcp.server
```

### Option 3: Docker Setup

```bash
git clone https://github.com/sajor2000/mcp_medicalterminology.git
cd medical-ontology-mcp
docker-compose up -d
```

## Configuration

Add to your MCP client configuration:

```json
{
  "medical-ontology": {
    "command": "python",
    "args": ["/path/to/medical-ontology-mcp/src/server.py"]
  }
}
```

## Usage Examples

### Basic Search

```python
from medical_mcp_client import MedicalOntologyClient

client = MedicalOntologyClient("http://localhost:8080")

# Search for a condition
results = await client.search("diabetes mellitus", ontologies=["SNOMED", "ICD10"])

# Get concept details
concept = await client.get_concept("SNOMED", "73211009")
```

### Research Workflow

See [examples/research_workflow.ipynb](examples/research_workflow.ipynb) for a complete research example including:
- Batch processing clinical notes
- Mapping free text to standard codes
- Exporting results for statistical analysis

## Data Sources

This framework requires medical ontology data files which must be obtained separately due to licensing requirements. See [DATA_SOURCES.md](docs/DATA_SOURCES.md) for detailed instructions on obtaining:

- SNOMED CT from NLM UMLS
- ICD-10 from WHO or CMS
- RxNorm from NLM
- LOINC from Regenstrief Institute

## Documentation

- [Setup Guide](docs/SETUP.md) - Detailed installation instructions
- [Data Sources](docs/DATA_SOURCES.md) - How to obtain ontology data
- [Preprocessing Guide](docs/PREPROCESSING.md) - Optimize data for performance
- [API Reference](docs/API_REFERENCE.md) - Complete API documentation
- [Institutional Setup](docs/INSTITUTIONAL_SETUP.md) - Guide for IT departments
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## Research Examples

The `examples/` directory contains:
- `basic_usage.py` - Simple search and lookup examples
- `research_workflow.ipynb` - Complete research workflow
- `batch_processing.py` - Process large datasets
- `statistical_export.py` - Export for R/SPSS/Stata

## Citation

If you use this software in your research, please cite:

```bibtex
@software{medical_ontology_mcp,
  author = {Your Name},
  title = {Medical Ontology MCP Server},
  year = {2024},
  publisher = {GitHub},
  url = {https://github.com/yourusername/medical-ontology-mcp}
}
```

See [CITATION.cff](CITATION.cff) for more citation formats.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📧 Email: your.email@institution.edu
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/medical-ontology-mcp/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/medical-ontology-mcp/discussions)

## Acknowledgments

This project was developed at [Your Institution] with support from [Funding Source].

---

**Note**: This software is for research purposes only and should not be used for clinical decision making.