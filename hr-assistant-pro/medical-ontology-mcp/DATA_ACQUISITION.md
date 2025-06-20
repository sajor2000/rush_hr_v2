# Medical Ontology Data Acquisition Guide

This guide provides step-by-step instructions for researchers to obtain and set up the required medical ontology data for the Medical Ontology MCP server.

## Overview

The Medical Ontology MCP server requires data from four major medical terminologies:

- **SNOMED CT** - Systematic medical terminology
- **ICD-10-CM** - International Classification of Diseases, 10th Revision
- **RxNorm** - Normalized medication nomenclature 
- **LOINC** - Logical Observation Identifiers Names and Codes

## Data Directory Structure

After obtaining the data, your `data/` directory should look like this:

```
data/
├── snomed/
│   ├── sct2_Concept_Snapshot_US1000124_YYYYMMDD.txt
│   ├── sct2_Description_Snapshot-en_US1000124_YYYYMMDD.txt
│   └── sct2_Relationship_Snapshot_US1000124_YYYYMMDD.txt
├── icd10/
│   ├── icd10cm_tabular_2024.xml  # OR text format files
│   ├── icd102019syst_chapters.txt
│   └── icd102019syst_codes.txt
├── rxnorm/
│   └── rrf/
│       ├── RXNCONSO.RRF
│       ├── RXNREL.RRF
│       └── RXNSAT.RRF
├── loinc/
│   └── Loinc.csv
└── processed/  # Auto-created during preprocessing
```

## 1. SNOMED CT Data

### Official Source
- **Website**: https://www.nlm.nih.gov/healthit/snomedct/us_edition.html
- **License**: Free for use in the United States
- **Registration**: Required (free)

### Download Steps
1. Visit the NLM SNOMED CT US Edition page
2. Create a free UMLS account if you don't have one
3. Download the latest US Edition Release
4. Extract the International Core and US Extension files

### Required Files
Place these files in `data/snomed/`:
- `sct2_Concept_Snapshot_US1000124_YYYYMMDD.txt`
- `sct2_Description_Snapshot-en_US1000124_YYYYMMDD.txt` 
- `sct2_Relationship_Snapshot_US1000124_YYYYMMDD.txt`

**Note**: Replace `YYYYMMDD` with the actual date from your download.

## 2. ICD-10-CM Data

### Official Source
- **Website**: https://www.cms.gov/medicare/coding/icd10
- **License**: Public domain
- **Registration**: Not required

### Download Steps
1. Visit the CMS ICD-10-CM page
2. Download the latest "ICD-10-CM Tabular List of Diseases and Injuries"
3. Choose either XML or text format

### Required Files
Place these files in `data/icd10/`:

**Option A: XML Format (Recommended)**
- `icd10cm_tabular_YYYY.xml`

**Option B: Text Format**
- `icd102019syst_chapters.txt`
- `icd102019syst_codes.txt`

## 3. RxNorm Data

### Official Source
- **Website**: https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html
- **License**: Free for use
- **Registration**: Required (free UMLS account)

### Download Steps
1. Visit the NLM RxNorm page
2. Sign in with your UMLS account
3. Download the "RxNorm Full Monthly Release"
4. Extract the RRF files

### Required Files
Create `data/rxnorm/rrf/` directory and place these files:
- `RXNCONSO.RRF`
- `RXNREL.RRF`
- `RXNSAT.RRF`

## 4. LOINC Data

### Official Source
- **Website**: https://loinc.org/downloads/
- **License**: Free for use (registration required)
- **Registration**: Required

### Download Steps
1. Visit the LOINC downloads page
2. Create a free account
3. Download the "LOINC Table File"
4. Extract the CSV file

### Required Files
Place this file in `data/loinc/`:
- `Loinc.csv`

## Quick Setup Commands

After obtaining all data files, run these commands to set up your environment:

```bash
# 1. Install the Medical Ontology MCP package
pip install medical-ontology-mcp

# 2. Verify your data structure
python -m medical_ontology_mcp.setup.verify_data --data-path ./data

# 3. Preprocess all ontologies for optimal performance
python -m medical_ontology_mcp.setup.preprocess_all --data-path ./data

# 4. Test the setup
python -m medical_ontology_mcp.cli search --query "diabetes" --data-path ./data
```

## Alternative: Sample Data for Testing

If you need to test the system before obtaining full datasets, you can create sample data:

```bash
# Create minimal sample data for testing
python -m medical_ontology_mcp.setup.create_sample_data --data-path ./data
```

This creates a small subset of data for each ontology that allows you to test all functionality.

## Licensing and Usage

### Academic and Research Use
All ontologies listed above are free for academic and research use. However, each has specific licensing terms:

- **SNOMED CT**: Free in the US; international use requires IHTSDO license
- **ICD-10-CM**: Public domain
- **RxNorm**: Free for all use
- **LOINC**: Free with registration

### Commercial Use
For commercial applications:
- Review each ontology's specific commercial licensing terms
- Some may require paid licenses for commercial use
- Contact the respective organizations for commercial licensing

## Data Updates

Medical ontologies are updated regularly:

- **SNOMED CT**: Bi-annual releases (March and September)
- **ICD-10-CM**: Annual updates (October)
- **RxNorm**: Monthly updates
- **LOINC**: Bi-annual releases (June and December)

To update your data:
1. Download the new version following the steps above
2. Replace the old files with new ones
3. Re-run the preprocessing: `python -m medical_ontology_mcp.setup.preprocess_all`

## Support

If you encounter issues:

1. Check the [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
2. Verify your data structure matches the expected format
3. Ensure all required files are present and not corrupted
4. Open an issue on GitHub with:
   - Your data source versions
   - Error messages
   - Operating system details

## Legal Disclaimer

This software facilitates access to publicly available medical terminologies. Users are responsible for:
- Complying with all applicable licenses and terms of use
- Ensuring appropriate use for their specific use case
- Obtaining necessary permissions for commercial use
- Keeping data current and accurate

The Medical Ontology MCP project does not redistribute the actual terminology data and is not responsible for the accuracy, completeness, or currency of the data obtained from official sources.