#!/usr/bin/env python3
"""
Preprocess SNOMED CT data for efficient loading and searching.
Creates optimized index files to speed up server startup.
"""

import csv
import json
import logging
from pathlib import Path
from collections import defaultdict
import gzip
from typing import Dict, List, Set

# Increase CSV field size limit
csv.field_size_limit(500000)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class SnomedPreprocessor:
    """Preprocess SNOMED CT data into optimized format"""
    
    def __init__(self, input_path: Path, output_path: Path):
        self.input_path = input_path
        self.output_path = output_path
        self.output_path.mkdir(parents=True, exist_ok=True)
        
        # Type IDs
        self.FSN_TYPE = '900000000000003001'  # Fully Specified Name
        self.SYNONYM_TYPE = '900000000000013009'  # Synonym
        self.DEFINITION_TYPE = '900000000000550004'  # Definition
        
        # Relationship type IDs
        self.IS_A_TYPE = '116680003'  # Is a (parent/child relationship)
    
    def process(self):
        """Main processing pipeline"""
        logger.info("Starting SNOMED CT preprocessing...")
        
        # Step 1: Load active concepts
        concepts = self.load_concepts()
        logger.info(f"Loaded {len(concepts)} active concepts")
        
        # Step 2: Load descriptions
        self.load_descriptions(concepts)
        logger.info("Loaded descriptions")
        
        # Step 3: Load relationships
        relationships = self.load_relationships(concepts)
        logger.info("Loaded relationships")
        
        # Step 4: Create search indices
        search_index = self.create_search_index(concepts)
        logger.info("Created search index")
        
        # Step 5: Save processed data
        self.save_processed_data(concepts, relationships, search_index)
        logger.info("Preprocessing complete!")
        
        return len(concepts)
    
    def load_concepts(self) -> Dict[str, Dict]:
        """Load active concepts from concept file"""
        concepts = {}
        concept_file = None
        
        # Find concept file
        for file in self.input_path.glob("sct2_Concept_*.txt"):
            concept_file = file
            break
        
        if not concept_file:
            raise FileNotFoundError("SNOMED concept file not found")
        
        logger.info(f"Loading concepts from {concept_file.name}")
        
        with open(concept_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter='\t')
            
            for row in reader:
                if row['active'] == '1':  # Only active concepts
                    concept_id = row['id']
                    concepts[concept_id] = {
                        'id': concept_id,
                        'effectiveTime': row['effectiveTime'],
                        'active': True,
                        'moduleId': row['moduleId'],
                        'definitionStatusId': row['definitionStatusId'],
                        'descriptions': [],
                        'preferred_term': None,
                        'fsn': None,
                        'synonyms': [],
                        'parents': [],
                        'children': []
                    }
        
        return concepts
    
    def load_descriptions(self, concepts: Dict[str, Dict]):
        """Load descriptions for active concepts"""
        desc_file = None
        
        # Find description file
        for file in self.input_path.glob("sct2_Description_*.txt"):
            desc_file = file
            break
        
        if not desc_file:
            raise FileNotFoundError("SNOMED description file not found")
        
        logger.info(f"Loading descriptions from {desc_file.name}")
        
        # Track preferred terms by concept
        preferred_by_concept = defaultdict(list)
        
        with open(desc_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter='\t')
            
            for row in reader:
                if row['active'] != '1':
                    continue
                
                concept_id = row['conceptId']
                if concept_id not in concepts:
                    continue
                
                term = row['term']
                type_id = row['typeId']
                
                desc_info = {
                    'id': row['id'],
                    'term': term,
                    'typeId': type_id,
                    'languageCode': row['languageCode'],
                    'caseSignificanceId': row['caseSignificanceId']
                }
                
                concepts[concept_id]['descriptions'].append(desc_info)
                
                # Categorize by type
                if type_id == self.FSN_TYPE:
                    concepts[concept_id]['fsn'] = term
                elif type_id == self.SYNONYM_TYPE:
                    concepts[concept_id]['synonyms'].append(term)
                    # Track as potential preferred term
                    if row['languageCode'] == 'en':
                        preferred_by_concept[concept_id].append(term)
        
        # Set preferred terms (use FSN if no synonyms)
        for concept_id, concept in concepts.items():
            if concept['synonyms']:
                # Use first English synonym as preferred term
                concept['preferred_term'] = concept['synonyms'][0]
            elif concept['fsn']:
                # Extract term without semantic tag
                fsn = concept['fsn']
                if '(' in fsn:
                    concept['preferred_term'] = fsn[:fsn.rfind('(')].strip()
                else:
                    concept['preferred_term'] = fsn
            else:
                # No descriptions found
                concept['preferred_term'] = f"Concept {concept_id}"
    
    def load_relationships(self, concepts: Dict[str, Dict]) -> Dict[str, List[str]]:
        """Load IS-A relationships"""
        relationships = defaultdict(lambda: {'parents': [], 'children': []})
        rel_file = None
        
        # Find relationship file
        for file in self.input_path.glob("sct2_Relationship_*.txt"):
            rel_file = file
            break
        
        if not rel_file:
            logger.warning("SNOMED relationship file not found - skipping relationships")
            return relationships
        
        logger.info(f"Loading relationships from {rel_file.name}")
        
        with open(rel_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter='\t')
            
            for row in reader:
                if row['active'] != '1':
                    continue
                
                if row['typeId'] != self.IS_A_TYPE:
                    continue
                
                source_id = row['sourceId']
                dest_id = row['destinationId']
                
                # Only track relationships between active concepts
                if source_id in concepts and dest_id in concepts:
                    relationships[source_id]['parents'].append(dest_id)
                    relationships[dest_id]['children'].append(source_id)
                    
                    # Update concept objects
                    concepts[source_id]['parents'].append(dest_id)
                    concepts[dest_id]['children'].append(source_id)
        
        return dict(relationships)
    
    def create_search_index(self, concepts: Dict[str, Dict]) -> Dict[str, Set[str]]:
        """Create inverted index for fast searching"""
        logger.info("Creating search index...")
        
        # Word to concept IDs mapping
        word_index = defaultdict(set)
        
        for concept_id, concept in concepts.items():
            # Index preferred term
            if concept['preferred_term']:
                words = self.tokenize(concept['preferred_term'])
                for word in words:
                    word_index[word].add(concept_id)
            
            # Index synonyms
            for synonym in concept['synonyms'][:5]:  # Limit synonyms to avoid huge index
                words = self.tokenize(synonym)
                for word in words:
                    word_index[word].add(concept_id)
        
        # Convert sets to lists for JSON serialization
        return {word: list(concept_ids) for word, concept_ids in word_index.items()}
    
    def tokenize(self, text: str) -> List[str]:
        """Tokenize text for indexing"""
        # Simple tokenization - can be improved
        import re
        text = text.lower()
        # Remove punctuation and split
        words = re.findall(r'\b[a-z]+\b', text)
        return [w for w in words if len(w) > 2]  # Skip very short words
    
    def save_processed_data(self, concepts: Dict[str, Dict], 
                          relationships: Dict[str, List[str]], 
                          search_index: Dict[str, List[str]]):
        """Save processed data in optimized format"""
        
        # Save concepts in chunks for memory efficiency
        logger.info("Saving processed concepts...")
        chunk_size = 10000
        concept_items = list(concepts.items())
        
        for i in range(0, len(concept_items), chunk_size):
            chunk_num = i // chunk_size
            chunk_data = dict(concept_items[i:i + chunk_size])
            
            output_file = self.output_path / f"concepts_chunk_{chunk_num:04d}.json.gz"
            with gzip.open(output_file, 'wt', encoding='utf-8') as f:
                json.dump(chunk_data, f)
        
        # Save metadata
        metadata = {
            'total_concepts': len(concepts),
            'chunk_size': chunk_size,
            'total_chunks': (len(concepts) + chunk_size - 1) // chunk_size,
            'preprocessing_version': '1.0'
        }
        
        with open(self.output_path / 'metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Save search index
        logger.info("Saving search index...")
        with gzip.open(self.output_path / 'search_index.json.gz', 'wt', encoding='utf-8') as f:
            json.dump(search_index, f)
        
        # Save common concepts for quick access
        logger.info("Saving common concepts...")
        common_concepts = self.extract_common_concepts(concepts)
        with open(self.output_path / 'common_concepts.json', 'w') as f:
            json.dump(common_concepts, f, indent=2)
    
    def extract_common_concepts(self, concepts: Dict[str, Dict]) -> Dict[str, Dict]:
        """Extract commonly searched concepts"""
        # Common medical conditions
        common_codes = {
            '73211009': 'Diabetes mellitus',
            '38341003': 'Hypertension',
            '84114007': 'Heart failure',
            '13645005': 'Chronic obstructive pulmonary disease',
            '39065001': 'Burn injury',
            '22298006': 'Myocardial infarction',
            '49601007': 'Cardiovascular disease',
            '84757009': 'Epilepsy',
            '44054006': 'Type 2 diabetes mellitus',
            '46635009': 'Type 1 diabetes mellitus'
        }
        
        common = {}
        for code, expected_term in common_codes.items():
            if code in concepts:
                common[code] = {
                    'code': code,
                    'preferred_term': concepts[code]['preferred_term'],
                    'fsn': concepts[code]['fsn'],
                    'parent_codes': concepts[code]['parents'][:3]  # Top 3 parents
                }
        
        return common


def main():
    """Run preprocessing"""
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python preprocess_snomed.py <input_path> <output_path>")
        print("Example: python preprocess_snomed.py data/snomed data/snomed_processed")
        sys.exit(1)
    
    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    
    if not input_path.exists():
        print(f"Error: Input path does not exist: {input_path}")
        sys.exit(1)
    
    preprocessor = SnomedPreprocessor(input_path, output_path)
    total_concepts = preprocessor.process()
    
    print(f"\nPreprocessing complete!")
    print(f"Total concepts processed: {total_concepts:,}")
    print(f"Output saved to: {output_path}")


if __name__ == "__main__":
    main()