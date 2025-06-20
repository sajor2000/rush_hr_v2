# Medical Ontology Data Directory

This directory should contain the medical ontology data files required for the Medical Ontology MCP server.

## ⚠️ Important: Data Not Included

**The actual medical ontology data files are NOT included in this repository** due to licensing restrictions and file size constraints. You must obtain them separately from their official sources.

## Required Data Structure

```
data/
├── snomed/                     # SNOMED CT files
├── icd10/                      # ICD-10-CM files  
├── rxnorm/                     # RxNorm files
├── loinc/                      # LOINC files
├── sample/                     # Sample/test data (included)
└── processed/                  # Auto-generated during preprocessing
```

## Quick Setup

1. **Get the data**: Follow the [Data Acquisition Guide](../DATA_ACQUISITION.md)
2. **Verify setup**: `python -m medical_ontology_mcp.setup.verify_data --data-path ./data`
3. **Preprocess**: `python -m medical_ontology_mcp.setup.preprocess_all --data-path ./data`
4. **Test**: `python -m medical_ontology_mcp.cli search --query "diabetes" --data-path ./data`

## For Testing Only

If you want to test the system immediately without obtaining full datasets:

```bash
# Create minimal sample data
python -m medical_ontology_mcp.setup.create_sample_data --data-path ./data
```

This creates small test datasets that demonstrate all functionality but are not suitable for production research.

## Need Help?

- 📖 [Data Acquisition Guide](../DATA_ACQUISITION.md) - Step-by-step instructions
- 🔧 [Setup Documentation](../docs/SETUP.md) - Technical setup details  
- 🐛 [Troubleshooting](../docs/TROUBLESHOOTING.md) - Common issues
- 💬 [GitHub Issues](https://github.com/sajor2000/mcp_medicalterminology/issues) - Get support