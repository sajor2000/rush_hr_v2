#!/usr/bin/env python3
"""
Test the Medical Ontology API
"""

import requests
import json
import time


def test_api():
    """Test API endpoints"""
    base_url = "http://localhost:8080"
    
    print("Testing Medical Ontology API")
    print("=" * 50)
    
    # Test health endpoint
    print("\n1. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            health = response.json()
            print(f"✓ Server status: {health['status']}")
            print("  Ontologies:")
            for ont, info in health['ontologies'].items():
                print(f"    - {ont}: {info['concept_count']} concepts")
        else:
            print(f"✗ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"✗ Cannot connect to server: {e}")
        print("  Make sure the server is running: ./start_server.sh")
        return
    
    # Test search
    print("\n2. Testing search...")
    
    # Search ICD-10 for diabetes
    print("\n   Searching ICD-10 for 'diabetes':")
    response = requests.get(f"{base_url}/search", params={
        'q': 'diabetes',
        'ontology': 'ICD10',
        'limit': 3
    })
    if response.status_code == 200:
        results = response.json()
        for concept in results['results'].get('ICD10', [])[:3]:
            print(f"   - {concept['code']}: {concept['preferred_term']}")
    
    # Search RxNorm for metformin
    print("\n   Searching RxNorm for 'metformin':")
    response = requests.get(f"{base_url}/search", params={
        'q': 'metformin',
        'ontology': 'RxNorm',
        'limit': 3
    })
    if response.status_code == 200:
        results = response.json()
        for concept in results['results'].get('RxNorm', [])[:3]:
            print(f"   - {concept['code']}: {concept['preferred_term']}")
    
    # Search all ontologies
    print("\n   Searching all ontologies for 'hypertension':")
    response = requests.get(f"{base_url}/search", params={
        'q': 'hypertension',
        'limit': 2
    })
    if response.status_code == 200:
        results = response.json()
        for ontology, concepts in results['results'].items():
            if concepts:
                print(f"   {ontology}:")
                for concept in concepts[:2]:
                    print(f"     - {concept['code']}: {concept['preferred_term']}")
    
    # Test get concept
    print("\n3. Testing get concept...")
    
    test_concepts = [
        ('ICD10', 'E11.9'),
        ('RxNorm', '6809'),
        ('LOINC', '2345-7')
    ]
    
    for ontology, code in test_concepts:
        print(f"\n   Getting {ontology} concept {code}:")
        response = requests.get(f"{base_url}/concept/{ontology}/{code}")
        if response.status_code == 200:
            concept = response.json()['concept']
            print(f"   ✓ {concept.get('preferred_term', 'N/A')}")
            if ontology == 'ICD10' and 'chapter_name' in concept:
                print(f"     Chapter: {concept['chapter_name']}")
        else:
            print(f"   ✗ Not found")
    
    print("\n" + "=" * 50)
    print("API testing complete!")


if __name__ == "__main__":
    test_api()