#!/usr/bin/env python3
"""
Test script to verify the data loaders work with real data
"""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from config.settings import Settings
from loaders.snomed_loader import SnomedLoader
from loaders.icd10_loader import ICD10Loader
from loaders.rxnorm_loader import RxNormLoader
from loaders.loinc_loader import LoincLoader


async def test_snomed():
    """Test SNOMED loader"""
    print("\n=== Testing SNOMED Loader ===")
    loader = SnomedLoader(Path("data/snomed"))
    
    try:
        await loader.load()
        print(f"✓ Loaded {len(loader.concepts)} SNOMED concepts")
        
        # Test search
        results = await loader.search("diabetes", limit=5)
        print(f"\nSearch for 'diabetes' returned {len(results)} results:")
        for result in results[:3]:
            print(f"  - {result['code']}: {result['preferred_term']}")
        
        # Test specific concept
        if loader.concepts:
            sample_code = list(loader.concepts.keys())[0]
            concept = await loader.get_concept(sample_code)
            if concept:
                print(f"\nSample concept {sample_code}: {concept.get('preferred_term', 'N/A')}")
    
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()


async def test_icd10():
    """Test ICD-10 loader"""
    print("\n=== Testing ICD-10 Loader ===")
    loader = ICD10Loader(Path("data/icd10"))
    
    try:
        await loader.load()
        print(f"✓ Loaded {len(loader.concepts)} ICD-10 codes")
        
        # Test search
        results = await loader.search("diabetes", limit=5)
        print(f"\nSearch for 'diabetes' returned {len(results)} results:")
        for result in results[:3]:
            print(f"  - {result['code']}: {result['preferred_term']}")
        
        # Test specific code
        test_code = "E11.9"
        concept = await loader.get_concept(test_code)
        if concept:
            print(f"\nCode {test_code}: {concept['preferred_term']}")
            print(f"  Chapter: {concept.get('chapter', 'N/A')} - {concept.get('chapter_name', 'N/A')}")
    
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()


async def test_rxnorm():
    """Test RxNorm loader"""
    print("\n=== Testing RxNorm Loader ===")
    loader = RxNormLoader(Path("data/rxnorm"))
    
    try:
        await loader.load()
        print(f"✓ Loaded {len(loader.concepts)} RxNorm concepts")
        
        # Test search
        results = await loader.search("metformin", limit=5)
        print(f"\nSearch for 'metformin' returned {len(results)} results:")
        for result in results[:3]:
            print(f"  - {result['code']}: {result['preferred_term']}")
    
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()


async def test_loinc():
    """Test LOINC loader"""
    print("\n=== Testing LOINC Loader ===")
    loader = LoincLoader(Path("data/loinc"))
    
    try:
        await loader.load()
        print(f"✓ Loaded {len(loader.concepts)} LOINC codes")
        
        # Test search
        results = await loader.search("glucose", limit=5)
        print(f"\nSearch for 'glucose' returned {len(results)} results:")
        for result in results[:3]:
            print(f"  - {result['code']}: {result['preferred_term']}")
            if result.get('short_name'):
                print(f"    Short name: {result['short_name']}")
    
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()


async def main():
    """Run all tests"""
    print("Testing Medical Ontology Loaders with Real Data")
    print("=" * 50)
    
    await test_snomed()
    await test_icd10()
    await test_rxnorm()
    await test_loinc()
    
    print("\n" + "=" * 50)
    print("Testing complete!")


if __name__ == "__main__":
    asyncio.run(main())