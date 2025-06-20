#!/usr/bin/env python3
"""
Preprocess ICD-10 XML data for efficient loading and searching.
Handles the specific XML format used in icd10cm_tabular_YYYY.xml files.
"""

import json
import logging
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict
import gzip
from typing import Dict, List, Set, Tuple

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ICD10XMLPreprocessor:
    """Preprocess ICD-10 XML data into optimized format"""
    
    def __init__(self, input_path: Path, output_path: Path):
        self.input_path = input_path
        self.output_path = output_path
        self.output_path.mkdir(parents=True, exist_ok=True)
    
    def process(self):
        """Main processing pipeline"""
        logger.info("Starting ICD-10 XML preprocessing...")
        
        # Find the XML file
        xml_file = self.find_tabular_xml()
        if not xml_file:
            raise FileNotFoundError("ICD-10 tabular XML file not found")
        
        # Parse XML and extract codes
        codes, chapters = self.parse_xml(xml_file)
        logger.info(f"Loaded {len(codes)} ICD-10 codes from {len(chapters)} chapters")
        
        # Build relationships
        self.build_relationships(codes)
        
        # Create indices
        search_index = self.create_search_index(codes)
        chapter_index = self.create_chapter_index(codes, chapters)
        category_index = self.create_category_index(codes)
        
        logger.info("Created indices")
        
        # Save processed data
        self.save_processed_data(codes, chapters, search_index, chapter_index, category_index)
        logger.info("Preprocessing complete!")
        
        return len(codes)
    
    def find_tabular_xml(self) -> Path:
        """Find the ICD-10 tabular XML file"""
        # Look in Table and Index subdirectory
        table_index_path = self.input_path / "Table and Index"
        
        if table_index_path.exists():
            for xml_file in table_index_path.glob("icd10cm_tabular_*.xml"):
                logger.info(f"Found ICD-10 XML file: {xml_file.name}")
                return xml_file
        
        # Look in root directory as fallback
        for xml_file in self.input_path.glob("icd10cm_tabular_*.xml"):
            logger.info(f"Found ICD-10 XML file: {xml_file.name}")
            return xml_file
        
        return None
    
    def parse_xml(self, xml_file: Path) -> Tuple[Dict[str, Dict], Dict[str, str]]:
        """Parse ICD-10 XML file"""
        logger.info(f"Parsing XML file: {xml_file.name}")
        
        codes = {}
        chapters = {}
        
        # Parse XML
        tree = ET.parse(xml_file)
        root = tree.getroot()
        
        # Extract version
        version_elem = root.find('version')
        version = version_elem.text if version_elem is not None else "Unknown"
        
        # Process chapters
        for chapter_elem in root.findall('chapter'):
            chapter_name = chapter_elem.find('name').text
            chapter_desc = chapter_elem.find('desc').text
            chapters[chapter_name] = chapter_desc
            
            # Process sections within chapter
            for section_elem in chapter_elem.findall('section'):
                self.process_diagnoses(section_elem, codes, chapter_name, chapter_desc)
            
            # Also process direct diagnoses in chapter (if any)
            self.process_diagnoses(chapter_elem, codes, chapter_name, chapter_desc)
        
        return codes, chapters
    
    def process_diagnoses(self, parent_elem, codes: Dict[str, Dict], 
                         chapter_name: str, chapter_desc: str, parent_code: str = None):
        """Recursively process diagnosis elements"""
        
        for diag_elem in parent_elem.findall('diag'):
            name_elem = diag_elem.find('name')
            desc_elem = diag_elem.find('desc')
            
            if name_elem is None or desc_elem is None:
                continue
            
            code = name_elem.text
            description = desc_elem.text
            
            # Determine code level based on format
            level = self.determine_level(code)
            
            # Create code entry
            code_data = {
                'code': code,
                'description': description,
                'preferred_term': description,
                'chapter': chapter_name,
                'chapter_description': chapter_desc,
                'parent_code': parent_code,
                'level': level,
                'children': [],
                'inclusion_terms': [],
                'exclusion_terms': [],
                'synonyms': []
            }
            
            # Extract inclusion terms
            for inclusion_elem in diag_elem.findall('inclusionTerm'):
                note_elem = inclusion_elem.find('note')
                if note_elem is not None:
                    code_data['inclusion_terms'].append(note_elem.text)
                    code_data['synonyms'].append(note_elem.text)
            
            # Extract exclusion terms
            for exclusion_elem in diag_elem.findall('.//excludes1') + diag_elem.findall('.//excludes2'):
                note_elem = exclusion_elem.find('note')
                if note_elem is not None:
                    code_data['exclusion_terms'].append(note_elem.text)
            
            codes[code] = code_data
            
            # Process child diagnoses
            self.process_diagnoses(diag_elem, codes, chapter_name, chapter_desc, code)
    
    def determine_level(self, code: str) -> int:
        """Determine the hierarchical level of an ICD-10 code"""
        if '.' not in code:
            if len(code) == 3:
                return 1  # Category level (e.g., A00)
            else:
                return 0  # Chapter/block level
        else:
            # Count digits after decimal
            decimal_part = code.split('.')[1]
            return 1 + len(decimal_part)  # Subcategory levels
    
    def build_relationships(self, codes: Dict[str, Dict]):
        """Build parent-child relationships"""
        
        # Build children lists
        for code_id, code_data in codes.items():
            parent_code = code_data.get('parent_code')
            if parent_code and parent_code in codes:
                codes[parent_code]['children'].append(code_id)
        
        # Sort children for consistent ordering
        for code_data in codes.values():
            code_data['children'].sort()
    
    def create_search_index(self, codes: Dict[str, Dict]) -> Dict[str, List[str]]:
        """Create inverted index for searching"""
        logger.info("Creating search index...")
        
        word_index = defaultdict(set)
        
        for code_id, code_data in codes.items():
            # Index description
            words = self.tokenize(code_data['description'])
            for word in words:
                word_index[word].add(code_id)
            
            # Index inclusion terms (synonyms)
            for inclusion_term in code_data['inclusion_terms']:
                words = self.tokenize(inclusion_term)
                for word in words:
                    word_index[word].add(code_id)
        
        # Convert sets to lists
        return {word: list(code_ids) for word, code_ids in word_index.items()}
    
    def create_chapter_index(self, codes: Dict[str, Dict], chapters: Dict[str, str]) -> Dict[str, Dict]:
        """Create index by chapter"""
        chapter_index = {}
        
        for chapter_num, chapter_desc in chapters.items():
            chapter_codes = [
                code_id for code_id, code_data in codes.items()
                if code_data['chapter'] == chapter_num
            ]
            
            chapter_index[chapter_num] = {
                'description': chapter_desc,
                'codes': chapter_codes,
                'count': len(chapter_codes)
            }
        
        return chapter_index
    
    def create_category_index(self, codes: Dict[str, Dict]) -> Dict[str, List[str]]:
        """Create index by 3-character category"""
        category_index = defaultdict(list)
        
        for code_id, code_data in codes.items():
            # Extract 3-character category (e.g., E11 from E11.9)
            if len(code_id) >= 3:
                category = code_id[:3]
                category_index[category].append(code_id)
        
        return dict(category_index)
    
    def tokenize(self, text: str) -> List[str]:
        """Tokenize text for indexing"""
        import re
        text = text.lower()
        # Remove punctuation and split
        words = re.findall(r'\b[a-z]+\b', text)
        # Filter out very common words
        stop_words = {'the', 'and', 'or', 'with', 'without', 'in', 'of', 'to', 'for', 'as', 'by', 'due'}
        return [w for w in words if len(w) > 2 and w not in stop_words]
    
    def save_processed_data(self, codes: Dict[str, Dict], 
                          chapters: Dict[str, str],
                          search_index: Dict[str, List[str]],
                          chapter_index: Dict[str, Dict],
                          category_index: Dict[str, List[str]]):
        """Save processed data"""
        
        # Save codes by level for efficient loading
        logger.info("Saving processed codes...")
        
        codes_by_level = defaultdict(dict)
        for code_id, code_data in codes.items():
            level = code_data['level']
            codes_by_level[level][code_id] = code_data
        
        # Save each level separately
        for level, level_codes in codes_by_level.items():
            output_file = self.output_path / f"codes_level_{level}.json.gz"
            with gzip.open(output_file, 'wt', encoding='utf-8') as f:
                json.dump(level_codes, f)
        
        # Save metadata
        metadata = {
            'total_codes': len(codes),
            'codes_by_level': {level: len(codes) for level, codes in codes_by_level.items()},
            'chapters': chapters,
            'preprocessing_version': '1.0',
            'source_format': 'XML'
        }
        
        with open(self.output_path / 'metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Save indices
        logger.info("Saving indices...")
        
        with gzip.open(self.output_path / 'search_index.json.gz', 'wt', encoding='utf-8') as f:
            json.dump(search_index, f)
        
        with open(self.output_path / 'chapter_index.json', 'w') as f:
            json.dump(chapter_index, f, indent=2)
        
        with open(self.output_path / 'category_index.json', 'w') as f:
            json.dump(category_index, f, indent=2)
        
        # Save common diagnoses
        logger.info("Saving common diagnoses...")
        common_diagnoses = self.extract_common_diagnoses(codes)
        with open(self.output_path / 'common_diagnoses.json', 'w') as f:
            json.dump(common_diagnoses, f, indent=2)
    
    def extract_common_diagnoses(self, codes: Dict[str, Dict]) -> Dict[str, Dict]:
        """Extract commonly used diagnosis codes"""
        # Common diagnosis codes
        common_codes = {
            'E11.9': 'Type 2 diabetes without complications',
            'I10': 'Essential hypertension',
            'F41.9': 'Anxiety disorder, unspecified',
            'M79.3': 'Myalgia',
            'J06.9': 'Acute upper respiratory infection',
            'K21.9': 'Gastro-esophageal reflux disease',
            'E78.5': 'Hyperlipidemia, unspecified',
            'Z00.00': 'General adult medical exam',
            'F32.9': 'Major depressive disorder',
            'M25.511': 'Pain in right shoulder'
        }
        
        common = {}
        for code_id in common_codes:
            if code_id in codes:
                code = codes[code_id]
                common[code_id] = {
                    'code': code_id,
                    'preferred_term': code['preferred_term'],
                    'chapter': code['chapter'],
                    'chapter_description': code['chapter_description'],
                    'level': code['level'],
                    'parent_code': code['parent_code']
                }
        
        # Also extract all category codes (3-character)
        categories = {}
        for code_id, code in codes.items():
            if len(code_id) == 3 or (len(code_id) == 4 and code_id[3] == '.'):
                categories[code_id] = {
                    'code': code_id,
                    'preferred_term': code['preferred_term'],
                    'chapter': code['chapter'],
                    'is_category': True
                }
        
        common['categories'] = categories
        
        return common


def main():
    """Run preprocessing"""
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python preprocess_icd10_xml.py <input_path> <output_path>")
        print("Example: python preprocess_icd10_xml.py data/icd10 data/icd10_processed")
        sys.exit(1)
    
    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    
    if not input_path.exists():
        print(f"Error: Input path does not exist: {input_path}")
        sys.exit(1)
    
    preprocessor = ICD10XMLPreprocessor(input_path, output_path)
    total_codes = preprocessor.process()
    
    print(f"\nPreprocessing complete!")
    print(f"Total codes processed: {total_codes:,}")
    print(f"Output saved to: {output_path}")


if __name__ == "__main__":
    main()