#!/usr/bin/env python3
"""
Preprocess ICD-10 data for efficient loading and searching.
Handles the specific format used in icd102019enMeta files.
"""

import json
import logging
from pathlib import Path
from collections import defaultdict
import gzip
from typing import Dict, List, Set, Tuple

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ICD10Preprocessor:
    """Preprocess ICD-10 data into optimized format"""
    
    def __init__(self, input_path: Path, output_path: Path):
        self.input_path = input_path
        self.output_path = output_path
        self.output_path.mkdir(parents=True, exist_ok=True)
        
        # ICD-10 structure levels
        self.LEVEL_NAMES = {
            '1': 'Chapter',
            '2': 'Block',
            '3': 'Category',
            '4': 'Subcategory',
            '5': 'Detail'
        }
    
    def process(self):
        """Main processing pipeline"""
        logger.info("Starting ICD-10 preprocessing...")
        
        # Step 1: Load chapters
        chapters = self.load_chapters()
        logger.info(f"Loaded {len(chapters)} chapters")
        
        # Step 2: Load codes
        codes, hierarchy = self.load_codes(chapters)
        logger.info(f"Loaded {len(codes)} ICD-10 codes")
        
        # Step 3: Build parent-child relationships
        self.build_relationships(codes, hierarchy)
        
        # Step 4: Load groups if available
        groups = self.load_groups()
        
        # Step 5: Create indices
        search_index = self.create_search_index(codes)
        chapter_index = self.create_chapter_index(codes)
        category_index = self.create_category_index(codes)
        
        logger.info("Created indices")
        
        # Step 6: Save processed data
        self.save_processed_data(codes, chapters, groups, search_index, 
                                chapter_index, category_index, hierarchy)
        logger.info("Preprocessing complete!")
        
        return len(codes)
    
    def load_chapters(self) -> Dict[str, str]:
        """Load ICD-10 chapters"""
        chapters = {}
        
        chapters_file = self.input_path / "icd102019syst_chapters.txt"
        if not chapters_file.exists():
            logger.warning("Chapters file not found")
            return chapters
        
        logger.info(f"Loading chapters from {chapters_file.name}")
        
        with open(chapters_file, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split(';')
                if len(parts) >= 2:
                    chapter_num = parts[0]
                    chapter_name = parts[1]
                    chapters[chapter_num] = chapter_name
        
        return chapters
    
    def load_codes(self, chapters: Dict[str, str]) -> Tuple[Dict[str, Dict], Dict[str, Set[str]]]:
        """Load ICD-10 codes"""
        codes = {}
        hierarchy = defaultdict(set)  # parent -> children
        
        codes_file = self.input_path / "icd102019syst_codes.txt"
        if not codes_file.exists():
            raise FileNotFoundError(f"Codes file not found: {codes_file}")
        
        logger.info(f"Loading codes from {codes_file.name}")
        
        # Format: level;type;X;chapter;parent;dotcode;code;description;...
        with open(codes_file, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split(';')
                if len(parts) < 9:
                    continue
                
                level = parts[0]
                type_code = parts[1]  # N=node, T=terminal
                chapter_num = parts[3]
                parent_code = parts[4]
                dotted_code = parts[5]
                undotted_code = parts[6]
                short_desc = parts[7]
                long_desc = parts[8] if len(parts) > 8 else short_desc
                
                # Create code entry
                code = {
                    'code': dotted_code,
                    'undotted_code': undotted_code,
                    'level': level,
                    'level_name': self.LEVEL_NAMES.get(level, f'Level {level}'),
                    'type': 'terminal' if type_code == 'T' else 'node',
                    'is_leaf': type_code == 'T',
                    'chapter': chapter_num,
                    'chapter_name': chapters.get(chapter_num, ''),
                    'parent_code': parent_code if parent_code else None,
                    'short_description': short_desc,
                    'long_description': long_desc,
                    'preferred_term': long_desc,  # Use long description as preferred
                    'children': [],
                    'ancestors': [],
                    'siblings': []
                }
                
                codes[dotted_code] = code
                
                # Track hierarchy
                if parent_code:
                    hierarchy[parent_code].add(dotted_code)
        
        return codes, dict(hierarchy)
    
    def build_relationships(self, codes: Dict[str, Dict], hierarchy: Dict[str, Set[str]]):
        """Build parent-child relationships and ancestor chains"""
        
        # Add children to parent codes
        for parent_code, children in hierarchy.items():
            if parent_code in codes:
                codes[parent_code]['children'] = list(children)
        
        # Build ancestor chains
        for code_id, code in codes.items():
            ancestors = []
            current = code.get('parent_code')
            
            while current and current in codes:
                ancestors.append(current)
                current = codes[current].get('parent_code')
            
            code['ancestors'] = ancestors
        
        # Find siblings (codes with same parent)
        for code_id, code in codes.items():
            parent = code.get('parent_code')
            if parent and parent in hierarchy:
                siblings = [s for s in hierarchy[parent] if s != code_id]
                code['siblings'] = siblings
    
    def load_groups(self) -> Dict[str, Dict]:
        """Load ICD-10 groups/blocks if available"""
        groups = {}
        
        groups_file = self.input_path / "icd102019syst_groups.txt"
        if not groups_file.exists():
            logger.info("Groups file not found - skipping")
            return groups
        
        logger.info(f"Loading groups from {groups_file.name}")
        
        with open(groups_file, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split(';')
                if len(parts) >= 4:
                    group_id = parts[0]
                    start_code = parts[1]
                    end_code = parts[2]
                    description = parts[3]
                    
                    groups[group_id] = {
                        'id': group_id,
                        'start': start_code,
                        'end': end_code,
                        'description': description
                    }
        
        return groups
    
    def create_search_index(self, codes: Dict[str, Dict]) -> Dict[str, List[str]]:
        """Create inverted index for searching"""
        logger.info("Creating search index...")
        
        word_index = defaultdict(set)
        
        for code_id, code in codes.items():
            # Index long description
            words = self.tokenize(code['long_description'])
            for word in words:
                word_index[word].add(code_id)
            
            # Index short description if different
            if code['short_description'] != code['long_description']:
                words = self.tokenize(code['short_description'])
                for word in words:
                    word_index[word].add(code_id)
        
        # Convert sets to lists
        return {word: list(code_ids) for word, code_ids in word_index.items()}
    
    def create_chapter_index(self, codes: Dict[str, Dict]) -> Dict[str, List[str]]:
        """Create index by chapter"""
        chapter_index = defaultdict(list)
        
        for code_id, code in codes.items():
            chapter = code['chapter']
            if chapter:
                chapter_index[chapter].append(code_id)
        
        return dict(chapter_index)
    
    def create_category_index(self, codes: Dict[str, Dict]) -> Dict[str, List[str]]:
        """Create index by 3-character category"""
        category_index = defaultdict(list)
        
        for code_id, code in codes.items():
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
        stop_words = {'the', 'and', 'or', 'with', 'without', 'in', 'of', 'to', 'for', 'as', 'by'}
        return [w for w in words if len(w) > 2 and w not in stop_words]
    
    def save_processed_data(self, codes: Dict[str, Dict], 
                          chapters: Dict[str, str],
                          groups: Dict[str, Dict],
                          search_index: Dict[str, List[str]],
                          chapter_index: Dict[str, List[str]],
                          category_index: Dict[str, List[str]],
                          hierarchy: Dict[str, Set[str]]):
        """Save processed data"""
        
        # Save codes by level for efficient loading
        logger.info("Saving processed codes...")
        
        codes_by_level = defaultdict(dict)
        for code_id, code in codes.items():
            level = code['level']
            codes_by_level[level][code_id] = code
        
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
            'preprocessing_version': '1.0'
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
        
        # Save groups if available
        if groups:
            with open(self.output_path / 'groups.json', 'w') as f:
                json.dump(groups, f, indent=2)
        
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
                    'chapter_name': code['chapter_name'],
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
        print("Usage: python preprocess_icd10.py <input_path> <output_path>")
        print("Example: python preprocess_icd10.py data/icd10 data/icd10_processed")
        sys.exit(1)
    
    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    
    if not input_path.exists():
        print(f"Error: Input path does not exist: {input_path}")
        sys.exit(1)
    
    preprocessor = ICD10Preprocessor(input_path, output_path)
    total_codes = preprocessor.process()
    
    print(f"\nPreprocessing complete!")
    print(f"Total codes processed: {total_codes:,}")
    print(f"Output saved to: {output_path}")


if __name__ == "__main__":
    main()