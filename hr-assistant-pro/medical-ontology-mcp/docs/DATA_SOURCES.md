# Medical Ontology Data Sources

This document provides information on how to obtain the medical ontology data files required for the Medical Ontology MCP Server.

## Overview

Due to licensing requirements, medical ontology data must be obtained separately from their respective organizations. Most require free registration, and some may require institutional agreements.

## Required Ontologies

### 1. SNOMED CT (Systematized Nomenclature of Medicine Clinical Terms)

**Description**: Comprehensive clinical terminology covering diseases, procedures, body structures, substances, and more.

**How to obtain**:
1. Register for a UMLS account at: https://uts.nlm.nih.gov/uts/umls/home
2. Once approved, go to the UMLS download page
3. Download SNOMED CT US Edition or International Edition
4. Extract the RF2 release format files

**Required files**:
- `sct2_Concept_*.txt` - Core concepts
- `sct2_Description_*.txt` - Terms and synonyms
- `sct2_Relationship_*.txt` (optional) - Concept relationships

**License**: UMLS Metathesaurus License Agreement

**File location**: Place files in `./data/snomed/`

### 2. ICD-10 (International Classification of Diseases, 10th Revision)

**Description**: International standard for disease classification used for epidemiology, health management, and billing.

**Options**:

#### ICD-10 WHO Version (International)
- **URL**: https://www.who.int/standards/classifications/classification-of-diseases
- **License**: Free for non-commercial use
- **Format**: Various (TXT, XML, CSV)

#### ICD-10-CM (US Clinical Modification)
- **URL**: https://www.cms.gov/medicare/icd-10/icd-10-cm
- **License**: Public domain
- **Files**: Download the current fiscal year files

**Required files**:
- Any file matching pattern `icd10*.txt`, `icd10*.csv`, or `icd10*.xml`

**File location**: Place files in `./data/icd10/`

### 3. RxNorm

**Description**: Normalized names for clinical drugs and drug delivery devices.

**How to obtain**:
1. Register for a UMLS account (same as SNOMED CT)
2. Go to: https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html
3. Download the Full Monthly Release

**Required files**:
- `RXNCONSO.RRF` - Main concept and name file
- `RXNREL.RRF` (optional) - Relationships
- `RXNSAT.RRF` (optional) - Attributes

**License**: UMLS Metathesaurus License Agreement

**File location**: Place files in `./data/rxnorm/`

### 4. LOINC (Logical Observation Identifiers Names and Codes)

**Description**: Universal identifiers for laboratory and clinical observations.

**How to obtain**:
1. Register at: https://loinc.org
2. Go to: https://loinc.org/downloads/
3. Download the LOINC Table File and LOINC Panels and Forms File

**Required files**:
- `Loinc.csv` - Main LOINC table
- `LoincPartLink_Primary.csv` (optional)
- `LoincPartLink_Supplementary.csv` (optional)

**License**: LOINC License (free for most uses)

**File location**: Place files in `./data/loinc/`

## Directory Structure

After downloading all files, your data directory should look like this:

```
data/
├── snomed/
│   ├── sct2_Concept_Full_US1000124_20240301.txt
│   ├── sct2_Description_Full-en_US1000124_20240301.txt
│   └── sct2_Relationship_Full_US1000124_20240301.txt
├── icd10/
│   ├── icd10cm_codes_2024.txt
│   └── icd10cm_drug_codes_2024.txt
├── rxnorm/
│   ├── RXNCONSO.RRF
│   ├── RXNREL.RRF
│   └── RXNSAT.RRF
└── loinc/
    ├── Loinc.csv
    ├── LoincPartLink_Primary.csv
    └── LoincPartLink_Supplementary.csv
```

## Verification

After placing files, run the verification script:

```bash
python setup/verify_data.py
```

This will check that all required files are present and have the correct format.

## Alternative: Institutional Data Server

If your institution provides access to these ontologies through a data server:

1. Run `./setup/quick_start.sh`
2. Select option 3: "Connect to institution's data server"
3. Enter your server URL and authentication credentials

## Alternative: Sample Data

For testing purposes only:

1. Run `./setup/quick_start.sh`
2. Select option 4: "Test with sample data"

⚠️ **Warning**: Sample data is synthetic and must NOT be used for clinical purposes.

## Troubleshooting

### Access Denied
- Ensure you have completed registration for UMLS/LOINC
- Check that your account is approved (can take 1-3 business days)

### Wrong File Format
- Ensure you download the correct release format (RF2 for SNOMED, RRF for RxNorm)
- Check file encoding (should be UTF-8)

### Missing Files
- Some "optional" files may be required depending on your use case
- Run `verify_data.py` to see which specific files are missing

## Updates

Ontologies are updated regularly:
- **SNOMED CT**: Semi-annually (January and July)
- **RxNorm**: Monthly
- **LOINC**: Semi-annually
- **ICD-10-CM**: Annually (October 1st)

Consider setting up a update schedule to keep your data current.

## Questions?

For questions about:
- **This framework**: Open an issue on GitHub
- **UMLS/RxNorm/SNOMED**: Contact NLM support
- **LOINC**: Contact Regenstrief Institute
- **ICD-10**: Contact WHO or CMS (for US version)