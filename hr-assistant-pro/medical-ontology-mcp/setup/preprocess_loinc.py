#!/usr/bin/env python3
"""
Preprocess LOINC data for efficient loading and searching.
Extracts key fields and creates optimized indices.
"""

import csv
import json
import logging
from pathlib import Path
from collections import defaultdict
import gzip
from typing import Dict, List, Set

# Increase CSV field size limit for LOINC's long fields
csv.field_size_limit(500000)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class LoincPreprocessor:
    """Preprocess LOINC data into optimized format"""
    
    def __init__(self, input_path: Path, output_path: Path):
        self.input_path = input_path
        self.output_path = output_path
        self.output_path.mkdir(parents=True, exist_ok=True)
        
        # LOINC classes we focus on
        self.IMPORTANT_CLASSES = {
            'CHEM': 'Chemistry',
            'HEM/BC': 'Hematology/Blood Count',
            'MICRO': 'Microbiology',
            'SERO': 'Serology',
            'UA': 'Urinalysis',
            'DRUG/TOX': 'Drug/Toxicology',
            'COAG': 'Coagulation',
            'PATH': 'Pathology',
            'H&P': 'History & Physical',
            'RAD': 'Radiology'
        }
        
        # Order observation types
        self.ORDER_OBS = {
            'Observation': 'Result that can be reported',
            'Order': 'Orderable test',
            'Both': 'Can be both ordered and resulted',
            'Subset': 'Organizational subset'
        }
    
    def process(self):
        """Main processing pipeline"""
        logger.info("Starting LOINC preprocessing...")
        
        # Step 1: Load LOINC concepts
        concepts = self.load_loinc_concepts()
        logger.info(f"Loaded {len(concepts)} LOINC concepts")
        
        # Step 2: Load additional files if available
        self.load_panels_and_forms(concepts)
        self.load_answer_lists(concepts)
        
        # Step 3: Create indices
        search_index = self.create_search_index(concepts)
        class_index = self.create_class_index(concepts)
        component_index = self.create_component_index(concepts)
        
        logger.info("Created indices")
        
        # Step 4: Save processed data
        self.save_processed_data(concepts, search_index, class_index, component_index)
        logger.info("Preprocessing complete!")
        
        return len(concepts)
    
    def load_loinc_concepts(self) -> Dict[str, Dict]:
        """Load main LOINC concepts from Loinc.csv"""
        concepts = {}
        
        loinc_file = self.input_path / "Loinc.csv"
        if not loinc_file.exists():
            # Try alternative name
            loinc_file = self.input_path / "loinc.csv"
            if not loinc_file.exists():
                raise FileNotFoundError(f"Loinc.csv not found in {self.input_path}")
        
        logger.info(f"Loading LOINC concepts from {loinc_file.name}")
        
        with open(loinc_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                loinc_num = row.get('LOINC_NUM', '')
                if not loinc_num:
                    continue
                
                # Skip deprecated/discouraged codes
                status = row.get('STATUS', 'ACTIVE')
                if status not in ['ACTIVE', 'TRIAL']:
                    continue
                
                # Extract key fields
                concept = {
                    'loinc_num': loinc_num,
                    'component': row.get('COMPONENT', ''),
                    'property': row.get('PROPERTY', ''),
                    'time_aspect': row.get('TIME_ASPCT', ''),
                    'system': row.get('SYSTEM', ''),
                    'scale_type': row.get('SCALE_TYP', ''),
                    'method_type': row.get('METHOD_TYP', ''),
                    'class': row.get('CLASS', ''),
                    'class_description': self.IMPORTANT_CLASSES.get(row.get('CLASS', ''), row.get('CLASS', '')),
                    'status': status,
                    'short_name': row.get('SHORTNAME', ''),
                    'long_common_name': row.get('LONG_COMMON_NAME', ''),
                    'preferred_term': row.get('LONG_COMMON_NAME', ''),  # Use long name as preferred
                    'consumer_name': row.get('CONSUMER_NAME', ''),
                    'order_obs': row.get('ORDER_OBS', ''),
                    'units_required': row.get('UNITSREQUIRED', 'N') == 'Y',
                    'example_units': row.get('EXAMPLE_UNITS', ''),
                    'example_ucum_units': row.get('EXAMPLE_UCUM_UNITS', ''),
                    'related_names': row.get('RELATEDNAMES2', ''),
                    'common_test_rank': int(row.get('COMMON_TEST_RANK', '0') or '0'),
                    'common_order_rank': int(row.get('COMMON_ORDER_RANK', '0') or '0'),
                    'external_copyright': row.get('EXTERNAL_COPYRIGHT_NOTICE', ''),
                    'panel_type': row.get('PanelType', ''),
                    'survey_quest_text': row.get('SURVEY_QUEST_TEXT', ''),
                    'synonyms': []  # Will be populated from related names
                }
                
                # Extract synonyms from related names
                if concept['related_names']:
                    # Split on semicolons and clean up
                    synonyms = [s.strip() for s in concept['related_names'].split(';')]
                    concept['synonyms'] = synonyms[:10]  # Limit to 10 synonyms
                
                # Add short name as synonym if different
                if concept['short_name'] and concept['short_name'] != concept['long_common_name']:
                    concept['synonyms'].insert(0, concept['short_name'])
                
                concepts[loinc_num] = concept
        
        return concepts
    
    def load_panels_and_forms(self, concepts: Dict[str, Dict]):
        """Load panel and form information if available"""
        panels_file = self.input_path / "PanelsAndForms" / "PanelsAndForms.csv"
        if not panels_file.exists():
            logger.info("PanelsAndForms.csv not found - skipping")
            return
        
        logger.info("Loading panels and forms...")
        
        # Track panel memberships
        panel_members = defaultdict(list)
        
        with open(panels_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                parent_loinc = row.get('ParentLOINC', '')
                loinc = row.get('LOINC', '')
                
                if parent_loinc and loinc:
                    panel_members[parent_loinc].append(loinc)
        
        # Update concepts with panel info
        for panel_loinc, members in panel_members.items():
            if panel_loinc in concepts:
                concepts[panel_loinc]['panel_members'] = members
                concepts[panel_loinc]['is_panel'] = True
    
    def load_answer_lists(self, concepts: Dict[str, Dict]):
        """Load answer list information if available"""
        answer_file = self.input_path / "AccessoryFiles" / "AnswerFile" / "AnswerList.csv"
        if not answer_file.exists():
            logger.info("AnswerList.csv not found - skipping")
            return
        
        logger.info("Loading answer lists...")
        
        # This would load answer lists, but skipping for brevity
        # The implementation would be similar to panels
    
    def create_search_index(self, concepts: Dict[str, Dict]) -> Dict[str, List[str]]:
        """Create inverted index for searching"""
        logger.info("Creating search index...")
        
        word_index = defaultdict(set)
        
        for loinc_num, concept in concepts.items():
            # Index long common name
            if concept['long_common_name']:
                words = self.tokenize(concept['long_common_name'])
                for word in words:
                    word_index[word].add(loinc_num)
            
            # Index short name
            if concept['short_name']:
                words = self.tokenize(concept['short_name'])
                for word in words:
                    word_index[word].add(loinc_num)
            
            # Index component
            if concept['component']:
                words = self.tokenize(concept['component'])
                for word in words:
                    word_index[word].add(loinc_num)
            
            # Index first few synonyms
            for synonym in concept['synonyms'][:3]:
                words = self.tokenize(synonym)
                for word in words:
                    word_index[word].add(loinc_num)
        
        # Convert sets to lists
        return {word: list(loinc_nums) for word, loinc_nums in word_index.items()}
    
    def create_class_index(self, concepts: Dict[str, Dict]) -> Dict[str, List[str]]:
        """Create index by LOINC class"""
        logger.info("Creating class index...")
        
        class_index = defaultdict(list)
        
        for loinc_num, concept in concepts.items():
            loinc_class = concept['class']
            if loinc_class:
                class_index[loinc_class].append(loinc_num)
        
        return dict(class_index)
    
    def create_component_index(self, concepts: Dict[str, Dict]) -> Dict[str, List[str]]:
        """Create index by component (analyte)"""
        logger.info("Creating component index...")
        
        component_index = defaultdict(set)
        
        for loinc_num, concept in concepts.items():
            component = concept['component']
            if component:
                # Normalize component name
                normalized = component.lower().strip()
                component_index[normalized].add(loinc_num)
                
                # Also index by key words in component
                words = self.tokenize(component)
                for word in words:
                    if len(word) > 3:  # Skip very short words
                        component_index[word].add(loinc_num)
        
        # Convert sets to lists
        return {comp: list(loinc_nums) for comp, loinc_nums in component_index.items()}
    
    def tokenize(self, text: str) -> List[str]:
        """Tokenize text for indexing"""
        import re
        text = text.lower()
        # Keep alphanumeric, handle units and measurements
        words = re.findall(r'[a-z0-9]+', text)
        return [w for w in words if len(w) > 2]
    
    def save_processed_data(self, concepts: Dict[str, Dict],
                          search_index: Dict[str, List[str]],
                          class_index: Dict[str, List[str]],
                          component_index: Dict[str, List[str]]):
        """Save processed data"""
        
        # Save concepts by class for efficient loading
        logger.info("Saving processed concepts...")
        
        concepts_by_class = defaultdict(dict)
        for loinc_num, concept in concepts.items():
            loinc_class = concept.get('class', 'OTHER')
            concepts_by_class[loinc_class][loinc_num] = concept
        
        # Save each class separately
        for loinc_class, class_concepts in concepts_by_class.items():
            safe_class = loinc_class.replace('/', '_')  # Make filename safe
            output_file = self.output_path / f"concepts_{safe_class}.json.gz"
            with gzip.open(output_file, 'wt', encoding='utf-8') as f:
                json.dump(class_concepts, f)
        
        # Save metadata
        metadata = {
            'total_concepts': len(concepts),
            'concepts_by_class': {cls: len(concepts) for cls, concepts in concepts_by_class.items()},
            'preprocessing_version': '1.0'
        }
        
        with open(self.output_path / 'metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Save indices
        logger.info("Saving indices...")
        
        with gzip.open(self.output_path / 'search_index.json.gz', 'wt', encoding='utf-8') as f:
            json.dump(search_index, f)
        
        with open(self.output_path / 'class_index.json', 'w') as f:
            json.dump(class_index, f, indent=2)
        
        with gzip.open(self.output_path / 'component_index.json.gz', 'wt', encoding='utf-8') as f:
            json.dump(component_index, f)
        
        # Save common lab tests
        logger.info("Saving common lab tests...")
        common_tests = self.extract_common_tests(concepts)
        with open(self.output_path / 'common_tests.json', 'w') as f:
            json.dump(common_tests, f, indent=2)
    
    def extract_common_tests(self, concepts: Dict[str, Dict]) -> Dict[str, Dict]:
        """Extract commonly ordered lab tests"""
        # Get top tests by common_test_rank
        ranked_tests = []
        
        for loinc_num, concept in concepts.items():
            if concept['common_test_rank'] > 0:
                ranked_tests.append((concept['common_test_rank'], loinc_num, concept))
        
        # Sort by rank (lower is more common)
        ranked_tests.sort(key=lambda x: x[0])
        
        # Take top 100
        common = {}
        for rank, loinc_num, concept in ranked_tests[:100]:
            common[loinc_num] = {
                'loinc_num': loinc_num,
                'preferred_term': concept['preferred_term'],
                'short_name': concept['short_name'],
                'class': concept['class'],
                'rank': rank,
                'component': concept['component'],
                'system': concept['system']
            }
        
        return common


def main():
    """Run preprocessing"""
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python preprocess_loinc.py <input_path> <output_path>")
        print("Example: python preprocess_loinc.py data/loinc data/loinc_processed")
        sys.exit(1)
    
    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    
    if not input_path.exists():
        print(f"Error: Input path does not exist: {input_path}")
        sys.exit(1)
    
    preprocessor = LoincPreprocessor(input_path, output_path)
    total_concepts = preprocessor.process()
    
    print(f"\nPreprocessing complete!")
    print(f"Total concepts processed: {total_concepts:,}")
    print(f"Output saved to: {output_path}")


if __name__ == "__main__":
    main()