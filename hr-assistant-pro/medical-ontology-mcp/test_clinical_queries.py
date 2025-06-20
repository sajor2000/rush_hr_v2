#!/usr/bin/env python3
"""
Test clinical coding queries using the medical ontology framework
"""

import json
import gzip
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class SimpleOntologyTester:
    """Simple tester for medical ontology data"""
    
    def __init__(self, data_path: Path):
        self.data_path = data_path
        self.icd10_codes = {}
        self.rxnorm_codes = {}
        self.loinc_codes = {}
        self.snomed_codes = {}
        
    def load_icd10(self):
        """Load ICD-10 preprocessed data"""
        processed_path = self.data_path / "icd10_processed"
        if not processed_path.exists():
            logger.warning("ICD-10 preprocessed data not found")
            return
        
        logger.info("Loading ICD-10 data...")
        
        # Load metadata
        with open(processed_path / "metadata.json", 'r') as f:
            metadata = json.load(f)
        
        total_codes = metadata['total_codes']
        logger.info(f"Loading {total_codes:,} ICD-10 codes")
        
        # Load all levels
        for level in metadata['codes_by_level'].keys():
            level_file = processed_path / f"codes_level_{level}.json.gz"
            if level_file.exists():
                with gzip.open(level_file, 'rt', encoding='utf-8') as f:
                    level_concepts = json.load(f)
                    self.icd10_codes.update(level_concepts)
        
        logger.info(f"Loaded {len(self.icd10_codes)} ICD-10 codes")
    
    def load_rxnorm(self):
        """Load RxNorm preprocessed data"""
        processed_path = self.data_path / "rxnorm_processed"
        if not processed_path.exists():
            logger.warning("RxNorm preprocessed data not found")
            return
        
        logger.info("Loading RxNorm data...")
        
        # Load metadata
        metadata_file = processed_path / "metadata.json"
        if metadata_file.exists():
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
            total_codes = metadata['total_concepts']
            logger.info(f"Loading {total_codes:,} RxNorm concepts")
        
        # Load concepts from TTY files (concepts are split by term type)
        concept_files = list(processed_path.glob("concepts_*.json.gz"))
        for concept_file in concept_files[:5]:  # Load first 5 TTY files for testing
            try:
                with gzip.open(concept_file, 'rt', encoding='utf-8') as f:
                    concepts = json.load(f)
                    self.rxnorm_codes.update(concepts)
            except Exception as e:
                logger.warning(f"Failed to load {concept_file.name}: {e}")
        
        logger.info(f"Loaded {len(self.rxnorm_codes)} RxNorm concepts")
    
    def search_icd10(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search ICD-10 codes"""
        query_lower = query.lower()
        results = []
        
        for code, concept in self.icd10_codes.items():
            score = 0
            term_lower = concept['preferred_term'].lower()
            
            # Exact match
            if query_lower == term_lower:
                score = 1.0
            # Starts with query
            elif term_lower.startswith(query_lower):
                score = 0.9
            # Contains query
            elif query_lower in term_lower:
                score = 0.8
            # Check inclusion terms (synonyms)
            elif 'inclusion_terms' in concept:
                for synonym in concept['inclusion_terms']:
                    if query_lower in synonym.lower():
                        score = 0.7
                        break
            
            if score > 0:
                result = {
                    'code': code,
                    'preferred_term': concept['preferred_term'],
                    'chapter': concept.get('chapter', ''),
                    'chapter_description': concept.get('chapter_description', ''),
                    'score': score
                }
                results.append((score, result))
        
        # Sort by score and return top results
        results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in results[:limit]]
    
    def get_icd10_concept(self, code: str) -> Optional[Dict[str, Any]]:
        """Get specific ICD-10 concept"""
        return self.icd10_codes.get(code)
    
    def search_rxnorm(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search RxNorm codes"""
        query_lower = query.lower()
        results = []
        
        for rxcui, concept in self.rxnorm_codes.items():
            score = 0
            term_lower = concept['preferred_term'].lower()
            
            # Exact match
            if query_lower == term_lower:
                score = 1.0
            # Starts with query
            elif term_lower.startswith(query_lower):
                score = 0.9
            # Contains query
            elif query_lower in term_lower:
                score = 0.8
            # Check synonyms
            elif 'synonyms' in concept:
                for synonym in concept['synonyms']:
                    if query_lower in synonym.lower():
                        score = 0.7
                        break
            
            if score > 0:
                result = {
                    'rxcui': rxcui,
                    'preferred_term': concept['preferred_term'],
                    'tty': concept.get('tty', ''),
                    'tty_description': concept.get('tty_description', ''),
                    'score': score
                }
                results.append((score, result))
        
        # Sort by score and return top results
        results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in results[:limit]]
    
    def get_rxnorm_concept(self, rxcui: str) -> Optional[Dict[str, Any]]:
        """Get specific RxNorm concept"""
        return self.rxnorm_codes.get(rxcui)
    
    def test_clinical_scenarios(self):
        """Test common clinical coding scenarios"""
        logger.info("\n" + "="*60)
        logger.info("TESTING CLINICAL CODING SCENARIOS")
        logger.info("="*60)
        
        test_cases = [
            {
                'query': 'sepsis',
                'description': 'Finding ICD-10 codes for sepsis'
            },
            {
                'query': 'hypertension',
                'description': 'Finding ICD-10 codes for hypertension'
            },
            {
                'query': 'diabetes mellitus',
                'description': 'Finding ICD-10 codes for diabetes'
            },
            {
                'query': 'pneumonia',
                'description': 'Finding ICD-10 codes for pneumonia'
            },
            {
                'query': 'myocardial infarction',
                'description': 'Finding ICD-10 codes for heart attack'
            },
            {
                'query': 'kidney disease',
                'description': 'Finding ICD-10 codes for kidney disease'
            }
        ]
        
        for test_case in test_cases:
            logger.info(f"\n🔍 {test_case['description']}")
            logger.info(f"Query: '{test_case['query']}'")
            
            results = self.search_icd10(test_case['query'], limit=5)
            
            if results:
                logger.info(f"Found {len(results)} matches:")
                for i, result in enumerate(results, 1):
                    logger.info(f"  {i}. {result['code']} - {result['preferred_term']}")
                    if result.get('chapter_description'):
                        logger.info(f"     Chapter: {result['chapter_description']}")
            else:
                logger.info("❌ No matches found")
    
    def test_specific_codes(self):
        """Test looking up specific well-known codes"""
        logger.info("\n" + "="*60)
        logger.info("TESTING SPECIFIC CODE LOOKUPS")
        logger.info("="*60)
        
        test_codes = [
            ('I10', 'Essential hypertension'),
            ('E11.9', 'Type 2 diabetes without complications'),
            ('A41.9', 'Sepsis, unspecified organism'),
            ('J44.1', 'Chronic obstructive pulmonary disease with acute exacerbation'),
            ('I21.9', 'Acute myocardial infarction, unspecified'),
            ('N18.6', 'End stage renal disease')
        ]
        
        for code, expected_description in test_codes:
            logger.info(f"\n🔍 Looking up code: {code}")
            logger.info(f"Expected: {expected_description}")
            
            concept = self.get_icd10_concept(code)
            if concept:
                logger.info(f"✅ Found: {concept['preferred_term']}")
                if concept.get('chapter_description'):
                    logger.info(f"   Chapter: {concept['chapter_description']}")
            else:
                logger.info(f"❌ Code not found: {code}")
    
    def test_medication_scenarios(self):
        """Test medication coding scenarios"""
        if not self.rxnorm_codes:
            logger.info("\n⚠️  RxNorm data not available - skipping medication tests")
            return
        
        logger.info("\n" + "="*60)
        logger.info("TESTING MEDICATION CODING SCENARIOS")
        logger.info("="*60)
        
        medication_queries = [
            {
                'query': 'metformin',
                'description': 'Finding RxNorm codes for metformin (diabetes medication)'
            },
            {
                'query': 'lisinopril',
                'description': 'Finding RxNorm codes for lisinopril (ACE inhibitor)'
            },
            {
                'query': 'amoxicillin',
                'description': 'Finding RxNorm codes for amoxicillin (antibiotic)'
            },
            {
                'query': 'insulin',
                'description': 'Finding RxNorm codes for insulin'
            },
            {
                'query': 'aspirin',
                'description': 'Finding RxNorm codes for aspirin'
            }
        ]
        
        for test_case in medication_queries:
            logger.info(f"\n💊 {test_case['description']}")
            logger.info(f"Query: '{test_case['query']}'")
            
            results = self.search_rxnorm(test_case['query'], limit=5)
            
            if results:
                logger.info(f"Found {len(results)} matches:")
                for i, result in enumerate(results, 1):
                    logger.info(f"  {i}. {result['rxcui']} - {result['preferred_term']}")
                    if result.get('tty_description'):
                        logger.info(f"     Type: {result['tty_description']}")
            else:
                logger.info("❌ No matches found")


def main():
    """Main test function"""
    logger.info("Starting Medical Ontology Clinical Tests")
    
    # Initialize tester
    data_path = Path("./data")
    tester = SimpleOntologyTester(data_path)
    
    # Load ontology data
    tester.load_icd10()
    tester.load_rxnorm()
    
    if not tester.icd10_codes:
        logger.error("No ICD-10 data loaded. Make sure preprocessing was completed.")
        return
    
    # Run tests
    tester.test_clinical_scenarios()
    tester.test_specific_codes()
    tester.test_medication_scenarios()
    
    logger.info("\n" + "="*60)
    logger.info("CLINICAL TESTING COMPLETE")
    logger.info("="*60)


if __name__ == "__main__":
    main()