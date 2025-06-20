# Sample Data for Testing

This directory contains minimal sample data for testing the Medical Ontology MCP server without requiring full dataset downloads.

## Purpose

The sample data allows you to:
- Test server functionality
- Verify installation
- Understand data formats
- Develop and debug applications

## ⚠️ Limitations

**Sample data is NOT suitable for:**
- Production research
- Clinical decision making
- Comprehensive medical coding
- Publication-quality analysis

## Creating Sample Data

To generate sample data for testing:

```bash
python -m medical_ontology_mcp.setup.create_sample_data --data-path ./data
```

This creates small subsets of each ontology:
- **SNOMED CT**: ~1,000 concepts
- **ICD-10-CM**: ~500 codes  
- **RxNorm**: ~2,000 medications
- **LOINC**: ~1,000 lab codes

## For Real Research

For actual research work, you must obtain the complete datasets from official sources. See the [Data Acquisition Guide](../../DATA_ACQUISITION.md) for instructions.