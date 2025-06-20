#!/usr/bin/env python3
"""
Create sample medical ontology data for testing purposes.
This generates minimal sample data that mimics the structure of real ontologies.

WARNING: This is for testing only - not for clinical use!
"""

import json
import csv
import random
from pathlib import Path
from datetime import datetime

# Sample medical concepts for testing
SAMPLE_CONCEPTS = {
    'SNOMED': [
        {
            'code': '73211009',
            'preferred_term': 'Diabetes mellitus',
            'synonyms': ['DM', 'Diabetes', 'Diabetes mellitus, NOS'],
            'semantic_types': ['Disease or Syndrome'],
            'parent_codes': ['73211009'],
            'is_active': True
        },
        {
            'code': '38341003',
            'preferred_term': 'Hypertension',
            'synonyms': ['High blood pressure', 'HTN', 'Hypertensive disorder'],
            'semantic_types': ['Disease or Syndrome'],
            'parent_codes': ['38341003'],
            'is_active': True
        },
        {
            'code': '22298006',
            'preferred_term': 'Myocardial infarction',
            'synonyms': ['MI', 'Heart attack', 'Cardiac infarction'],
            'semantic_types': ['Disease or Syndrome'],
            'parent_codes': ['22298006'],
            'is_active': True
        },
        {
            'code': '49601007',
            'preferred_term': 'Cardiovascular disease',
            'synonyms': ['CVD', 'Heart disease'],
            'semantic_types': ['Disease or Syndrome'],
            'parent_codes': [],
            'is_active': True
        },
        {
            'code': '84757009',
            'preferred_term': 'Epilepsy',
            'synonyms': ['Seizure disorder', 'Epileptic disorder'],
            'semantic_types': ['Disease or Syndrome'],
            'parent_codes': ['84757009'],
            'is_active': True
        }
    ],
    'ICD10': [
        {
            'code': 'E11.9',
            'preferred_term': 'Type 2 diabetes mellitus without complications',
            'parent_code': 'E11',
            'chapter': 'IV',
            'chapter_name': 'Endocrine, nutritional and metabolic diseases'
        },
        {
            'code': 'I10',
            'preferred_term': 'Essential (primary) hypertension',
            'parent_code': '',
            'chapter': 'IX',
            'chapter_name': 'Diseases of the circulatory system'
        },
        {
            'code': 'I21.9',
            'preferred_term': 'Acute myocardial infarction, unspecified',
            'parent_code': 'I21',
            'chapter': 'IX',
            'chapter_name': 'Diseases of the circulatory system'
        },
        {
            'code': 'I51.9',
            'preferred_term': 'Heart disease, unspecified',
            'parent_code': 'I51',
            'chapter': 'IX',
            'chapter_name': 'Diseases of the circulatory system'
        },
        {
            'code': 'G40.9',
            'preferred_term': 'Epilepsy, unspecified',
            'parent_code': 'G40',
            'chapter': 'VI',
            'chapter_name': 'Diseases of the nervous system'
        }
    ],
    'RxNorm': [
        {
            'code': '6809',
            'preferred_term': 'Metformin',
            'semantic_types': ['Pharmacologic Substance'],
            'ingredients': ['Metformin'],
            'dose_forms': ['Oral Tablet', 'Oral Solution']
        },
        {
            'code': '1719',
            'preferred_term': 'Aspirin',
            'semantic_types': ['Pharmacologic Substance'],
            'ingredients': ['Aspirin'],
            'dose_forms': ['Oral Tablet', 'Chewable Tablet']
        },
        {
            'code': '3407',
            'preferred_term': 'Lisinopril',
            'semantic_types': ['Pharmacologic Substance'],
            'ingredients': ['Lisinopril'],
            'dose_forms': ['Oral Tablet']
        },
        {
            'code': '1000001',
            'preferred_term': 'Atorvastatin',
            'semantic_types': ['Pharmacologic Substance'],
            'ingredients': ['Atorvastatin'],
            'dose_forms': ['Oral Tablet']
        },
        {
            'code': '2418',
            'preferred_term': 'Carbamazepine',
            'semantic_types': ['Pharmacologic Substance'],
            'ingredients': ['Carbamazepine'],
            'dose_forms': ['Oral Tablet', 'Oral Suspension']
        }
    ],
    'LOINC': [
        {
            'code': '4548-4',
            'preferred_term': 'Hemoglobin A1c/Hemoglobin.total in Blood',
            'short_name': 'HbA1c',
            'class': 'CHEM',
            'method': 'HPLC',
            'property': 'MFr',
            'system': 'Bld',
            'scale': 'Qn',
            'status': 'ACTIVE'
        },
        {
            'code': '2345-7',
            'preferred_term': 'Glucose [Mass/volume] in Serum or Plasma',
            'short_name': 'Glucose SerPl',
            'class': 'CHEM',
            'method': '',
            'property': 'MCnc',
            'system': 'Ser/Plas',
            'scale': 'Qn',
            'status': 'ACTIVE'
        },
        {
            'code': '8480-6',
            'preferred_term': 'Systolic blood pressure',
            'short_name': 'BP sys',
            'class': 'CLINHIS',
            'method': '',
            'property': 'Pres',
            'system': 'Arterial System',
            'scale': 'Qn',
            'status': 'ACTIVE'
        },
        {
            'code': '8462-4',
            'preferred_term': 'Diastolic blood pressure',
            'short_name': 'BP dias',
            'class': 'CLINHIS',
            'method': '',
            'property': 'Pres',
            'system': 'Arterial System',
            'scale': 'Qn',
            'status': 'ACTIVE'
        },
        {
            'code': '2571-8',
            'preferred_term': 'Triglyceride [Mass/volume] in Serum or Plasma',
            'short_name': 'Trigl SerPl',
            'class': 'CHEM',
            'method': '',
            'property': 'MCnc',
            'system': 'Ser/Plas',
            'scale': 'Qn',
            'status': 'ACTIVE'
        }
    ]
}

# Mapping relationships between ontologies
SAMPLE_MAPPINGS = [
    {'source': 'SNOMED', 'source_code': '73211009', 'target': 'ICD10', 'target_code': 'E11.9'},
    {'source': 'SNOMED', 'source_code': '38341003', 'target': 'ICD10', 'target_code': 'I10'},
    {'source': 'SNOMED', 'source_code': '22298006', 'target': 'ICD10', 'target_code': 'I21.9'},
    {'source': 'RxNorm', 'source_code': '6809', 'target': 'SNOMED', 'target_code': '387137007'},  # Metformin substance
    {'source': 'LOINC', 'source_code': '4548-4', 'target': 'SNOMED', 'target_code': '43396009'},  # HbA1c procedure
]


def create_sample_data():
    """Create sample data files for all ontologies"""
    
    print("Creating sample medical ontology data...")
    print("=" * 50)
    print("⚠️  WARNING: This is sample data for testing only!")
    print("⚠️  NOT for clinical use!")
    print("=" * 50)
    print()
    
    # Create base data directory
    data_path = Path("data/sample")
    data_path.mkdir(parents=True, exist_ok=True)
    
    # Create ontology subdirectories
    for ontology in ['snomed', 'icd10', 'rxnorm', 'loinc']:
        (data_path / ontology).mkdir(exist_ok=True)
    
    # Generate SNOMED CT sample data
    create_snomed_sample(data_path / 'snomed')
    
    # Generate ICD-10 sample data
    create_icd10_sample(data_path / 'icd10')
    
    # Generate RxNorm sample data
    create_rxnorm_sample(data_path / 'rxnorm')
    
    # Generate LOINC sample data
    create_loinc_sample(data_path / 'loinc')
    
    # Generate cross-ontology mappings
    create_mappings_sample(data_path)
    
    # Create metadata file
    create_metadata(data_path)
    
    print()
    print("✅ Sample data created successfully!")
    print(f"📁 Location: {data_path.absolute()}")
    print()
    print("Sample concepts created:")
    for ontology, concepts in SAMPLE_CONCEPTS.items():
        print(f"  - {ontology}: {len(concepts)} concepts")
    print(f"  - Cross-mappings: {len(SAMPLE_MAPPINGS)} mappings")
    print()
    print("You can now test the MCP server with this sample data.")
    

def create_snomed_sample(path: Path):
    """Create sample SNOMED CT files"""
    print("Creating SNOMED CT sample data...")
    
    # Create concepts file
    concepts_file = path / 'sct2_Concept_Sample.txt'
    with open(concepts_file, 'w', newline='') as f:
        writer = csv.writer(f, delimiter='\t')
        writer.writerow(['id', 'effectiveTime', 'active', 'moduleId', 'definitionStatusId'])
        
        for concept in SAMPLE_CONCEPTS['SNOMED']:
            writer.writerow([
                concept['code'],
                '20240101',
                '1' if concept['is_active'] else '0',
                '900000000000207008',  # Core module
                '900000000000074008'   # Defined
            ])
    
    # Create descriptions file
    descriptions_file = path / 'sct2_Description_Sample.txt'
    with open(descriptions_file, 'w', newline='') as f:
        writer = csv.writer(f, delimiter='\t')
        writer.writerow(['id', 'effectiveTime', 'active', 'moduleId', 'conceptId', 
                        'languageCode', 'typeId', 'term', 'caseSignificanceId'])
        
        desc_id = 1000000
        for concept in SAMPLE_CONCEPTS['SNOMED']:
            # Preferred term
            writer.writerow([
                str(desc_id),
                '20240101',
                '1',
                '900000000000207008',
                concept['code'],
                'en',
                '900000000000013009',  # Preferred term
                concept['preferred_term'],
                '900000000000017005'   # Case insensitive
            ])
            desc_id += 1
            
            # Synonyms
            for synonym in concept['synonyms']:
                writer.writerow([
                    str(desc_id),
                    '20240101',
                    '1',
                    '900000000000207008',
                    concept['code'],
                    'en',
                    '900000000000013009',  # Synonym
                    synonym,
                    '900000000000017005'
                ])
                desc_id += 1


def create_icd10_sample(path: Path):
    """Create sample ICD-10 files"""
    print("Creating ICD-10 sample data...")
    
    # Create codes file
    codes_file = path / 'icd10_codes_sample.txt'
    with open(codes_file, 'w', newline='') as f:
        writer = csv.writer(f, delimiter=';')
        
        for concept in SAMPLE_CONCEPTS['ICD10']:
            writer.writerow([
                concept['code'],
                concept['preferred_term']
            ])
    
    # Create chapters file
    chapters_file = path / 'icd10_chapters_sample.txt'
    with open(chapters_file, 'w', newline='') as f:
        writer = csv.writer(f, delimiter=';')
        
        chapters = {
            'IV': 'Endocrine, nutritional and metabolic diseases',
            'VI': 'Diseases of the nervous system',
            'IX': 'Diseases of the circulatory system'
        }
        
        for code, name in chapters.items():
            writer.writerow([code, name])


def create_rxnorm_sample(path: Path):
    """Create sample RxNorm files"""
    print("Creating RxNorm sample data...")
    
    # Create RXNCONSO file
    conso_file = path / 'RXNCONSO_SAMPLE.RRF'
    with open(conso_file, 'w', newline='') as f:
        writer = csv.writer(f, delimiter='|')
        
        for concept in SAMPLE_CONCEPTS['RxNorm']:
            # Add main entry
            writer.writerow([
                concept['code'],  # RXCUI
                'ENG',           # LAT
                'P',             # TS (Term status)
                '',              # LUI
                'PF',            # STT (String type)
                '',              # SUI
                'Y',             # ISPREF
                '',              # RXAUI
                '',              # SAUI
                '',              # SCUI
                '',              # SDUI
                'RXNORM',        # SAB (Source)
                'IN',            # TTY (Term type)
                '',              # CODE
                concept['preferred_term'],  # STR
                '',              # SRL
                'N',             # SUPPRESS
                ''               # CVF
            ])


def create_loinc_sample(path: Path):
    """Create sample LOINC files"""
    print("Creating LOINC sample data...")
    
    # Create main LOINC file
    loinc_file = path / 'Loinc_sample.csv'
    with open(loinc_file, 'w', newline='') as f:
        writer = csv.writer(f)
        
        # Header
        writer.writerow([
            'LOINC_NUM', 'LONG_COMMON_NAME', 'SHORTNAME', 'CLASS',
            'PROPERTY', 'TIME_ASPCT', 'SYSTEM', 'SCALE_TYP',
            'METHOD_TYP', 'STATUS'
        ])
        
        for concept in SAMPLE_CONCEPTS['LOINC']:
            writer.writerow([
                concept['code'],
                concept['preferred_term'],
                concept['short_name'],
                concept['class'],
                concept['property'],
                'Pt',  # Time aspect
                concept['system'],
                concept['scale'],
                concept['method'],
                concept['status']
            ])


def create_mappings_sample(path: Path):
    """Create cross-ontology mapping file"""
    print("Creating cross-ontology mappings...")
    
    mappings_file = path / 'ontology_mappings.json'
    with open(mappings_file, 'w') as f:
        json.dump({
            'metadata': {
                'created_date': datetime.now().isoformat(),
                'version': '1.0',
                'description': 'Sample cross-ontology mappings for testing'
            },
            'mappings': SAMPLE_MAPPINGS
        }, f, indent=2)


def create_metadata(path: Path):
    """Create metadata file for sample data"""
    metadata = {
        'name': 'Medical Ontology Sample Data',
        'version': '1.0',
        'created_date': datetime.now().isoformat(),
        'description': 'Sample medical ontology data for testing purposes only',
        'warning': 'This is synthetic data for testing. NOT for clinical use!',
        'ontologies': {
            'SNOMED': {
                'concept_count': len(SAMPLE_CONCEPTS['SNOMED']),
                'version': 'Sample',
                'files': ['sct2_Concept_Sample.txt', 'sct2_Description_Sample.txt']
            },
            'ICD10': {
                'concept_count': len(SAMPLE_CONCEPTS['ICD10']),
                'version': 'Sample',
                'files': ['icd10_codes_sample.txt', 'icd10_chapters_sample.txt']
            },
            'RxNorm': {
                'concept_count': len(SAMPLE_CONCEPTS['RxNorm']),
                'version': 'Sample',
                'files': ['RXNCONSO_SAMPLE.RRF']
            },
            'LOINC': {
                'concept_count': len(SAMPLE_CONCEPTS['LOINC']),
                'version': 'Sample',
                'files': ['Loinc_sample.csv']
            }
        }
    }
    
    metadata_file = path / 'metadata.json'
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)


if __name__ == '__main__':
    create_sample_data()