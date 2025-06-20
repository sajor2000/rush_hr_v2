#!/usr/bin/env python3
"""
Simple test script to verify the data loaders work with real data
"""

import asyncio
import csv
import json
from pathlib import Path
from typing import Dict, List, Any, Optional

# Increase CSV field size limit for large SNOMED descriptions
csv.field_size_limit(500000)


class SimpleSnomedLoader:
    """Simple SNOMED loader for testing"""
    
    def __init__(self, data_path: Path):
        self.data_path = data_path
        self.concepts = {}
    
    async def load(self):
        """Load SNOMED data"""
        # Find concept file
        concept_files = list(self.data_path.glob("sct2_Concept_*.txt"))
        if not concept_files:
            raise FileNotFoundError("No SNOMED concept files found")
        
        # Load concepts (limit to first 1000 for testing)
        print(f"Loading concepts from {concept_files[0].name}...")
        count = 0
        with open(concept_files[0], 'r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter='\t')
            header = next(reader)  # Skip header
            
            for row in reader:
                if count >= 1000:  # Limit for testing
                    break
                if len(row) >= 5:
                    concept_id = row[0]
                    active = row[2] == '1'
                    if active:
                        self.concepts[concept_id] = {
                            'code': concept_id,
                            'active': active
                        }
                        count += 1
        
        # Find description file
        desc_files = list(self.data_path.glob("sct2_Description_*.txt"))
        if desc_files:
            print(f"Loading descriptions from {desc_files[0].name}...")
            with open(desc_files[0], 'r', encoding='utf-8') as f:
                reader = csv.reader(f, delimiter='\t')
                header = next(reader)  # Skip header
                
                desc_count = 0
                for row in reader:
                    if desc_count >= 5000:  # Limit for testing
                        break
                    if len(row) >= 9:
                        concept_id = row[4]
                        if concept_id in self.concepts:
                            term = row[7]
                            type_id = row[6]
                            
                            if type_id == '900000000000003001':  # FSN
                                self.concepts[concept_id]['preferred_term'] = term
                            elif 'preferred_term' not in self.concepts[concept_id]:
                                self.concepts[concept_id]['preferred_term'] = term
                            desc_count += 1
        
        # Remove concepts without terms
        self.concepts = {k: v for k, v in self.concepts.items() if 'preferred_term' in v}
        print(f"Loaded {len(self.concepts)} SNOMED concepts")
    
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Simple search"""
        query_lower = query.lower()
        results = []
        
        for code, concept in self.concepts.items():
            term = concept.get('preferred_term', '').lower()
            if query_lower in term:
                results.append({
                    'code': code,
                    'preferred_term': concept['preferred_term']
                })
                if len(results) >= limit:
                    break
        
        return results


class SimpleICD10Loader:
    """Simple ICD-10 loader for testing"""
    
    def __init__(self, data_path: Path):
        self.data_path = data_path
        self.concepts = {}
    
    async def load(self):
        """Load ICD-10 data"""
        codes_file = self.data_path / "icd102019syst_codes.txt"
        chapters_file = self.data_path / "icd102019syst_chapters.txt"
        
        # Load chapters
        chapters = {}
        if chapters_file.exists():
            with open(chapters_file, 'r', encoding='utf-8') as f:
                for line in f:
                    parts = line.strip().split(';')
                    if len(parts) >= 2:
                        chapters[parts[0]] = parts[1]
        
        # Load codes
        if codes_file.exists():
            print(f"Loading ICD-10 codes from {codes_file.name}...")
            with open(codes_file, 'r', encoding='utf-8') as f:
                for line in f:
                    parts = line.strip().split(';')
                    if len(parts) >= 9:
                        dotted_code = parts[5]
                        description = parts[8]
                        chapter_num = parts[3]
                        
                        self.concepts[dotted_code] = {
                            'code': dotted_code,
                            'preferred_term': description,
                            'chapter': chapter_num,
                            'chapter_name': chapters.get(chapter_num, '')
                        }
            
            print(f"Loaded {len(self.concepts)} ICD-10 codes")
    
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Simple search"""
        query_lower = query.lower()
        results = []
        
        for code, concept in self.concepts.items():
            if query_lower in concept['preferred_term'].lower():
                results.append(concept)
                if len(results) >= limit:
                    break
        
        return results


class SimpleRxNormLoader:
    """Simple RxNorm loader for testing"""
    
    def __init__(self, data_path: Path):
        self.data_path = data_path
        self.concepts = {}
    
    async def load(self):
        """Load RxNorm data"""
        conso_file = self.data_path / "RXNCONSO.RRF"
        
        if conso_file.exists():
            print(f"Loading RxNorm concepts from {conso_file.name}...")
            count = 0
            with open(conso_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if count >= 1000:  # Limit for testing
                        break
                    
                    fields = line.strip().split('|')
                    if len(fields) >= 15:
                        rxcui = fields[0]
                        language = fields[1]
                        source = fields[11]
                        term = fields[14]
                        
                        if language == 'ENG' and source == 'RXNORM':
                            if rxcui not in self.concepts:
                                self.concepts[rxcui] = {
                                    'code': rxcui,
                                    'preferred_term': term
                                }
                                count += 1
            
            print(f"Loaded {len(self.concepts)} RxNorm concepts")
    
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Simple search"""
        query_lower = query.lower()
        results = []
        
        for code, concept in self.concepts.items():
            if query_lower in concept['preferred_term'].lower():
                results.append(concept)
                if len(results) >= limit:
                    break
        
        return results


class SimpleLoincLoader:
    """Simple LOINC loader for testing"""
    
    def __init__(self, data_path: Path):
        self.data_path = data_path
        self.concepts = {}
    
    async def load(self):
        """Load LOINC data"""
        loinc_file = self.data_path / "Loinc.csv"
        
        if loinc_file.exists():
            print(f"Loading LOINC codes from {loinc_file.name}...")
            count = 0
            with open(loinc_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                
                for row in reader:
                    if count >= 1000:  # Limit for testing
                        break
                    
                    loinc_num = row.get('LOINC_NUM', '')
                    if loinc_num:
                        self.concepts[loinc_num] = {
                            'code': loinc_num,
                            'preferred_term': row.get('LONG_COMMON_NAME', ''),
                            'short_name': row.get('SHORTNAME', '')
                        }
                        count += 1
            
            print(f"Loaded {len(self.concepts)} LOINC codes")
    
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Simple search"""
        query_lower = query.lower()
        results = []
        
        for code, concept in self.concepts.items():
            term = concept['preferred_term'].lower()
            short = concept.get('short_name', '').lower()
            if query_lower in term or query_lower in short:
                results.append(concept)
                if len(results) >= limit:
                    break
        
        return results


async def main():
    """Test all loaders"""
    print("Testing Medical Ontology Loaders with Real Data")
    print("=" * 60)
    
    # Test SNOMED
    print("\n=== Testing SNOMED ===")
    try:
        snomed = SimpleSnomedLoader(Path("data/snomed"))
        await snomed.load()
        
        results = snomed.search("diabetes", 3)
        print(f"\nSearch for 'diabetes' returned {len(results)} results:")
        for r in results:
            print(f"  - {r['code']}: {r['preferred_term']}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test ICD-10
    print("\n=== Testing ICD-10 ===")
    try:
        icd10 = SimpleICD10Loader(Path("data/icd10"))
        await icd10.load()
        
        results = icd10.search("diabetes", 3)
        print(f"\nSearch for 'diabetes' returned {len(results)} results:")
        for r in results:
            print(f"  - {r['code']}: {r['preferred_term']}")
            print(f"    Chapter: {r['chapter']} - {r['chapter_name']}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test RxNorm
    print("\n=== Testing RxNorm ===")
    try:
        rxnorm = SimpleRxNormLoader(Path("data/rxnorm"))
        await rxnorm.load()
        
        results = rxnorm.search("metformin", 3)
        print(f"\nSearch for 'metformin' returned {len(results)} results:")
        for r in results:
            print(f"  - {r['code']}: {r['preferred_term']}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test LOINC
    print("\n=== Testing LOINC ===")
    try:
        loinc = SimpleLoincLoader(Path("data/loinc"))
        await loinc.load()
        
        results = loinc.search("glucose", 3)
        print(f"\nSearch for 'glucose' returned {len(results)} results:")
        for r in results:
            print(f"  - {r['code']}: {r['preferred_term']}")
            if r.get('short_name'):
                print(f"    Short: {r['short_name']}")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "=" * 60)
    print("Testing complete!")


if __name__ == "__main__":
    asyncio.run(main())