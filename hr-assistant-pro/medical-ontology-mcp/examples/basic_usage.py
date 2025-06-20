#!/usr/bin/env python3
"""
Basic Usage Examples for Medical Ontology MCP

This script demonstrates common usage patterns for the Medical Ontology MCP server,
including search operations, code lookups, and batch processing for clinical research.

Prerequisites:
1. Medical ontology data preprocessed and available in ./data directory
2. Medical Ontology MCP package installed: pip install medical-ontology-mcp

Usage:
    python basic_usage.py
"""

import asyncio
import json
from pathlib import Path
from typing import List, Dict, Any

# Import the Medical Ontology MCP client
from medical_ontology_mcp.client import MedicalOntologyClient


async def basic_search_example():
    """Demonstrate basic search functionality across all ontologies"""
    print("🔍 Basic Search Example")
    print("=" * 50)
    
    # Initialize client with data path
    client = MedicalOntologyClient(data_path="./data")
    await client.initialize()
    
    # Search for diabetes across all ontologies
    print("Searching for 'diabetes' across all ontologies...")
    results = await client.search("diabetes", limit=3)
    
    for ontology, concepts in results.items():
        if concepts:
            print(f"\n📋 {ontology} Results:")
            for concept in concepts:
                print(f"  • {concept['code']}: {concept['preferred_term']}")
    
    print("\n" + "=" * 50 + "\n")


async def specific_ontology_search():
    """Demonstrate searching within specific ontologies"""
    print("🎯 Specific Ontology Search Example")
    print("=" * 50)
    
    client = MedicalOntologyClient(data_path="./data")
    await client.initialize()
    
    # Search for hypertension in ICD-10 only
    print("Searching for 'hypertension' in ICD-10 only...")
    results = await client.search("hypertension", ontologies=["ICD10"], limit=5)
    
    if "ICD10" in results and results["ICD10"]:
        print("\n📋 ICD-10 Hypertension Codes:")
        for concept in results["ICD10"]:
            print(f"  • {concept['code']}: {concept['preferred_term']}")
            if 'chapter' in concept:
                print(f"    Chapter: {concept['chapter']}")
    
    print("\n" + "=" * 50 + "\n")


async def code_lookup_example():
    """Demonstrate looking up specific medical codes"""
    print("🔎 Code Lookup Example")
    print("=" * 50)
    
    client = MedicalOntologyClient(data_path="./data")
    await client.initialize()
    
    # Look up specific ICD-10 code
    print("Looking up ICD-10 code 'E11.9' (Type 2 diabetes without complications)...")
    concept = await client.get_concept("ICD10", "E11.9")
    
    if concept:
        print(f"\n📋 Code Details:")
        print(f"  Code: {concept['code']}")
        print(f"  Term: {concept['preferred_term']}")
        if 'chapter' in concept:
            print(f"  Chapter: {concept['chapter']}")
        if 'synonyms' in concept and concept['synonyms']:
            print(f"  Synonyms: {', '.join(concept['synonyms'][:3])}")
    else:
        print("❌ Code not found")
    
    print("\n" + "=" * 50 + "\n")


async def medication_search_example():
    """Demonstrate medication search using RxNorm"""
    print("💊 Medication Search Example")
    print("=" * 50)
    
    client = MedicalOntologyClient(data_path="./data")
    await client.initialize()
    
    # Search for common medications
    medications = ["metformin", "lisinopril", "atorvastatin"]
    
    for medication in medications:
        print(f"\nSearching for '{medication}' in RxNorm...")
        results = await client.search(medication, ontologies=["RxNorm"], limit=3)
        
        if "RxNorm" in results and results["RxNorm"]:
            print(f"📋 RxNorm Results for {medication}:")
            for concept in results["RxNorm"]:
                print(f"  • {concept['code']}: {concept['preferred_term']}")
                if 'tty' in concept:
                    print(f"    Type: {concept['tty']}")
    
    print("\n" + "=" * 50 + "\n")


async def batch_processing_example():
    """Demonstrate batch processing of clinical conditions"""
    print("📊 Batch Processing Example")
    print("=" * 50)
    
    client = MedicalOntologyClient(data_path="./data")
    await client.initialize()
    
    # Common clinical conditions for research
    conditions = [
        "sepsis",
        "pneumonia", 
        "heart failure",
        "stroke",
        "myocardial infarction"
    ]
    
    print("Processing common clinical conditions for ICD-10 codes...")
    
    batch_results = {}
    for condition in conditions:
        print(f"  Processing: {condition}")
        results = await client.search(condition, ontologies=["ICD10"], limit=2)
        batch_results[condition] = results.get("ICD10", [])
    
    # Display results in tabular format
    print(f"\n📋 Clinical Condition Coding Results:")
    print(f"{'Condition':<20} {'ICD-10 Code':<10} {'Description'}")
    print("-" * 70)
    
    for condition, codes in batch_results.items():
        if codes:
            # Show the top result
            top_code = codes[0]
            description = top_code['preferred_term'][:40] + "..." if len(top_code['preferred_term']) > 40 else top_code['preferred_term']
            print(f"{condition:<20} {top_code['code']:<10} {description}")
        else:
            print(f"{condition:<20} {'N/A':<10} No results found")
    
    print("\n" + "=" * 50 + "\n")


async def research_workflow_example():
    """Demonstrate a complete research workflow"""
    print("🔬 Research Workflow Example")
    print("=" * 50)
    
    client = MedicalOntologyClient(data_path="./data")
    await client.initialize()
    
    # Research scenario: Studying cardiovascular conditions
    print("Research Scenario: Cardiovascular Disease Study")
    print("Objective: Find relevant ICD-10 codes for cardiovascular conditions\n")
    
    # Step 1: Identify primary conditions
    primary_conditions = ["hypertension", "coronary artery disease", "heart failure"]
    
    research_data = {}
    
    for condition in primary_conditions:
        print(f"1️⃣ Searching for: {condition}")
        results = await client.search(condition, ontologies=["ICD10"], limit=3)
        
        if "ICD10" in results and results["ICD10"]:
            research_data[condition] = results["ICD10"]
            print(f"   Found {len(results['ICD10'])} relevant codes")
        else:
            research_data[condition] = []
            print(f"   No codes found")
    
    # Step 2: Detailed lookup for specific codes
    print(f"\n2️⃣ Detailed lookup for selected codes:")
    selected_codes = ["I10", "I25.9", "I50.9"]  # Common cardiovascular codes
    
    detailed_info = {}
    for code in selected_codes:
        concept = await client.get_concept("ICD10", code)
        if concept:
            detailed_info[code] = concept
            print(f"   {code}: {concept['preferred_term']}")
    
    # Step 3: Generate research summary
    print(f"\n3️⃣ Research Summary:")
    print(f"   Total conditions analyzed: {len(primary_conditions)}")
    print(f"   Total codes identified: {sum(len(codes) for codes in research_data.values())}")
    print(f"   Detailed codes examined: {len(detailed_info)}")
    
    # Step 4: Export results (simulate)
    export_data = {
        "study_objective": "Cardiovascular Disease Study",
        "search_results": research_data,
        "detailed_codes": detailed_info,
        "timestamp": "2024-01-01T00:00:00Z"
    }
    
    print(f"\n4️⃣ Results exported to: cardiovascular_study_results.json")
    print(f"   (Simulation - would contain {len(export_data)} data sections)")
    
    print("\n" + "=" * 50 + "\n")


async def performance_example():
    """Demonstrate performance with large-scale operations"""
    print("⚡ Performance Example")
    print("=" * 50)
    
    client = MedicalOntologyClient(data_path="./data")
    await client.initialize()
    
    # Test search performance
    import time
    
    search_terms = ["diabetes", "cancer", "infection", "fracture", "pregnancy"]
    
    print("Testing search performance across multiple terms...")
    start_time = time.time()
    
    total_results = 0
    for term in search_terms:
        results = await client.search(term, limit=5)
        term_count = sum(len(concepts) for concepts in results.values())
        total_results += term_count
        print(f"  '{term}': {term_count} results")
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"\n📊 Performance Summary:")
    print(f"   Total search terms: {len(search_terms)}")
    print(f"   Total results: {total_results}")
    print(f"   Total time: {duration:.2f} seconds")
    print(f"   Average per search: {duration/len(search_terms):.3f} seconds")
    
    print("\n" + "=" * 50 + "\n")


async def main():
    """Run all examples"""
    print("🏥 Medical Ontology MCP - Basic Usage Examples")
    print("=" * 60)
    print("This script demonstrates common usage patterns for clinical research\n")
    
    try:
        # Run all examples
        await basic_search_example()
        await specific_ontology_search()
        await code_lookup_example()
        await medication_search_example()
        await batch_processing_example()
        await research_workflow_example()
        await performance_example()
        
        print("✅ All examples completed successfully!")
        print("\nNext steps:")
        print("• Explore the research_workflow.ipynb notebook for interactive analysis")
        print("• Use the Jupyter magic commands for notebook-based research")
        print("• Integrate with your AI assistant using MCP configuration")
        
    except Exception as e:
        print(f"❌ Error running examples: {e}")
        print("\nTroubleshooting:")
        print("1. Ensure medical ontology data is preprocessed in ./data directory")
        print("2. Run: python -m medical_ontology_mcp.setup.preprocess_all")
        print("3. Check that the Medical Ontology MCP package is properly installed")


if __name__ == "__main__":
    # Run the examples
    asyncio.run(main())