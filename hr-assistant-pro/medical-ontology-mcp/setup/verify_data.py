#!/usr/bin/env python3
"""
Verify that medical ontology data files are present and valid.
This script checks for required files and validates their basic structure.
"""

import os
import csv
import json
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Define expected file patterns for each ontology
EXPECTED_FILES = {
    'snomed': {
        'required': [
            'sct2_Concept_*.txt',
            'sct2_Description_*.txt'
        ],
        'optional': [
            'sct2_Relationship_*.txt',
            'der2_*.txt'
        ]
    },
    'icd10': {
        'required': [
            'icd10*.txt',  # Can be various formats
        ],
        'optional': [
            'icd10*.xml',
            'icd10*codes*.csv'
        ]
    },
    'rxnorm': {
        'required': [
            'RXNCONSO.RRF'
        ],
        'optional': [
            'RXNREL.RRF',
            'RXNSAT.RRF',
            'RXNSTY.RRF'
        ]
    },
    'loinc': {
        'required': [
            'Loinc.csv'
        ],
        'optional': [
            'LoincPartLink*.csv',
            'MapTo.csv',
            'SourceOrganization.csv'
        ]
    }
}

# Colors for output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    END = '\033[0m'


def print_status(status: str, message: str):
    """Print colored status message"""
    if status == 'success':
        print(f"{Colors.GREEN}✓{Colors.END} {message}")
    elif status == 'warning':
        print(f"{Colors.YELLOW}⚠{Colors.END} {message}")
    elif status == 'error':
        print(f"{Colors.RED}✗{Colors.END} {message}")
    elif status == 'info':
        print(f"{Colors.BLUE}ℹ{Colors.END} {message}")


def find_matching_files(directory: Path, pattern: str) -> List[Path]:
    """Find files matching a pattern in a directory"""
    import glob
    
    if '*' in pattern:
        matches = list(directory.glob(pattern))
    else:
        exact_path = directory / pattern
        matches = [exact_path] if exact_path.exists() else []
    
    return matches


def verify_snomed_files(path: Path) -> Tuple[bool, List[str]]:
    """Verify SNOMED CT files"""
    messages = []
    valid = True
    
    # Check for concept file
    concept_files = find_matching_files(path, 'sct2_Concept_*.txt')
    if concept_files:
        concept_file = concept_files[0]
        try:
            with open(concept_file, 'r', encoding='utf-8') as f:
                reader = csv.reader(f, delimiter='\t')
                header = next(reader, None)
                if header and len(header) >= 5:
                    messages.append(f"Found valid SNOMED concept file: {concept_file.name}")
                else:
                    messages.append(f"Invalid SNOMED concept file format: {concept_file.name}")
                    valid = False
        except Exception as e:
            messages.append(f"Error reading SNOMED concept file: {str(e)}")
            valid = False
    else:
        messages.append("Missing SNOMED concept file (sct2_Concept_*.txt)")
        valid = False
    
    # Check for description file
    desc_files = find_matching_files(path, 'sct2_Description_*.txt')
    if desc_files:
        messages.append(f"Found SNOMED description file: {desc_files[0].name}")
    else:
        messages.append("Missing SNOMED description file (sct2_Description_*.txt)")
        valid = False
    
    return valid, messages


def verify_icd10_files(path: Path) -> Tuple[bool, List[str]]:
    """Verify ICD-10 files"""
    messages = []
    valid = False
    
    # Look for any ICD-10 file
    icd_patterns = ['icd10*.txt', 'icd10*.csv', 'icd10*.xml', 'ICD10*.txt']
    
    for pattern in icd_patterns:
        files = find_matching_files(path, pattern)
        if files:
            messages.append(f"Found ICD-10 file: {files[0].name}")
            valid = True
            break
    
    if not valid:
        messages.append("No ICD-10 files found (expected icd10*.txt or similar)")
    
    return valid, messages


def verify_rxnorm_files(path: Path) -> Tuple[bool, List[str]]:
    """Verify RxNorm files"""
    messages = []
    valid = True
    
    # Check for RXNCONSO
    conso_file = path / 'RXNCONSO.RRF'
    if conso_file.exists():
        try:
            with open(conso_file, 'r', encoding='utf-8') as f:
                first_line = f.readline()
                if '|' in first_line:
                    messages.append("Found valid RxNorm RXNCONSO.RRF file")
                else:
                    messages.append("Invalid RxNorm file format (expected pipe-delimited)")
                    valid = False
        except Exception as e:
            messages.append(f"Error reading RxNorm file: {str(e)}")
            valid = False
    else:
        messages.append("Missing RxNorm RXNCONSO.RRF file")
        valid = False
    
    return valid, messages


def verify_loinc_files(path: Path) -> Tuple[bool, List[str]]:
    """Verify LOINC files"""
    messages = []
    valid = True
    
    # Check for main LOINC file
    loinc_file = path / 'Loinc.csv'
    if loinc_file.exists():
        try:
            with open(loinc_file, 'r', encoding='utf-8') as f:
                reader = csv.reader(f)
                header = next(reader, None)
                if header and 'LOINC_NUM' in header:
                    messages.append("Found valid LOINC file: Loinc.csv")
                else:
                    messages.append("Invalid LOINC file format")
                    valid = False
        except Exception as e:
            messages.append(f"Error reading LOINC file: {str(e)}")
            valid = False
    else:
        messages.append("Missing LOINC file (Loinc.csv)")
        valid = False
    
    return valid, messages


def check_sample_data(base_path: Path) -> bool:
    """Check if using sample data"""
    sample_path = base_path / 'sample'
    metadata_file = sample_path / 'metadata.json'
    
    if metadata_file.exists():
        try:
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
                if metadata.get('name') == 'Medical Ontology Sample Data':
                    return True
        except:
            pass
    
    return False


def verify_all_data():
    """Main verification function"""
    print("Verifying Medical Ontology Data Files")
    print("=" * 50)
    print()
    
    # Determine data path
    data_path = Path('data')
    if not data_path.exists():
        print_status('error', "Data directory not found!")
        print("Please create a 'data' directory and add your ontology files.")
        return False
    
    # Check if using sample data
    if check_sample_data(data_path):
        print_status('warning', "Using SAMPLE DATA for testing")
        print_status('warning', "This data is NOT suitable for clinical use!")
        print()
        data_path = data_path / 'sample'
    
    all_valid = True
    ontology_status = {}
    
    # Verify each ontology
    for ontology in ['snomed', 'icd10', 'rxnorm', 'loinc']:
        print(f"\nChecking {ontology.upper()}...")
        print("-" * 30)
        
        ontology_path = data_path / ontology
        
        if not ontology_path.exists():
            print_status('error', f"Directory not found: {ontology_path}")
            all_valid = False
            ontology_status[ontology] = False
            continue
        
        # Run specific verification
        if ontology == 'snomed':
            valid, messages = verify_snomed_files(ontology_path)
        elif ontology == 'icd10':
            valid, messages = verify_icd10_files(ontology_path)
        elif ontology == 'rxnorm':
            valid, messages = verify_rxnorm_files(ontology_path)
        elif ontology == 'loinc':
            valid, messages = verify_loinc_files(ontology_path)
        
        # Print messages
        for message in messages:
            if "Found" in message and "valid" in message:
                print_status('success', message)
            elif "Missing" in message or "Invalid" in message or "Error" in message:
                print_status('error', message)
            else:
                print_status('info', message)
        
        ontology_status[ontology] = valid
        if not valid:
            all_valid = False
    
    # Print summary
    print("\n" + "=" * 50)
    print("SUMMARY")
    print("=" * 50)
    
    for ontology, status in ontology_status.items():
        if status:
            print_status('success', f"{ontology.upper()}: Ready")
        else:
            print_status('error', f"{ontology.upper()}: Not ready")
    
    print()
    
    if all_valid:
        print_status('success', "All ontologies verified successfully!")
        print("\nYour data is ready to use with the Medical Ontology MCP Server.")
        return True
    else:
        print_status('error', "Some ontologies are missing or invalid.")
        print("\nPlease check the errors above and ensure all required files are present.")
        print("See docs/DATA_SOURCES.md for information on obtaining ontology files.")
        return False


def verify_single_ontology(ontology: str, path: str):
    """Verify a single ontology (for testing)"""
    ontology_path = Path(path)
    
    if ontology == 'snomed':
        valid, messages = verify_snomed_files(ontology_path)
    elif ontology == 'icd10':
        valid, messages = verify_icd10_files(ontology_path)
    elif ontology == 'rxnorm':
        valid, messages = verify_rxnorm_files(ontology_path)
    elif ontology == 'loinc':
        valid, messages = verify_loinc_files(ontology_path)
    else:
        print(f"Unknown ontology: {ontology}")
        return False
    
    for message in messages:
        print(message)
    
    return valid


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 2:
        # Verify single ontology
        ontology = sys.argv[1]
        path = sys.argv[2]
        success = verify_single_ontology(ontology, path)
    else:
        # Verify all
        success = verify_all_data()
    
    sys.exit(0 if success else 1)