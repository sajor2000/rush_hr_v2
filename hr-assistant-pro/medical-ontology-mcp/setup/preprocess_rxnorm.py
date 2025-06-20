#!/usr/bin/env python3
"""
Preprocess RxNorm data for efficient loading and searching.
Filters to include only RXNORM source data and creates optimized indices.
"""

import csv
import json
import logging
from pathlib import Path
from collections import defaultdict
import gzip
from typing import Dict, List, Set, Tuple

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class RxNormPreprocessor:
    """Preprocess RxNorm data into optimized format"""
    
    def __init__(self, input_path: Path, output_path: Path):
        self.input_path = input_path
        self.output_path = output_path
        self.output_path.mkdir(parents=True, exist_ok=True)
        
        # Term types we care about
        self.IMPORTANT_TTY = {
            'IN': 'Ingredient',
            'BN': 'Brand Name',
            'SCD': 'Semantic Clinical Drug',
            'SBD': 'Semantic Branded Drug',
            'SCDC': 'Semantic Clinical Drug Component',
            'SCDF': 'Semantic Clinical Dose Form',
            'SCDG': 'Semantic Clinical Drug Group',
            'MIN': 'Multiple Ingredients',
            'PIN': 'Precise Ingredient',
            'DFG': 'Dose Form Group',
            'DF': 'Dose Form'
        }
    
    def process(self):
        """Main processing pipeline"""
        logger.info("Starting RxNorm preprocessing...")
        
        # Step 1: Load concepts from RXNCONSO
        concepts, ingredients = self.load_concepts()
        logger.info(f"Loaded {len(concepts)} RxNorm concepts")
        
        # Step 2: Load relationships
        relationships = self.load_relationships(concepts)
        logger.info("Loaded relationships")
        
        # Step 3: Load attributes (NDC codes, etc.)
        self.load_attributes(concepts)
        logger.info("Loaded attributes")
        
        # Step 4: Create search indices
        search_index = self.create_search_index(concepts)
        ingredient_index = self.create_ingredient_index(concepts, ingredients)
        logger.info("Created search indices")
        
        # Step 5: Save processed data
        self.save_processed_data(concepts, relationships, search_index, ingredient_index)
        logger.info("Preprocessing complete!")
        
        return len(concepts)
    
    def load_concepts(self) -> Tuple[Dict[str, Dict], Dict[str, Set[str]]]:
        """Load RxNorm concepts from RXNCONSO.RRF"""
        concepts = {}
        ingredients = defaultdict(set)  # ingredient -> set of RXCUIs
        
        # Look for RXNCONSO.RRF in multiple locations
        possible_paths = [
            self.input_path / "RXNCONSO.RRF",
            self.input_path / "rrf" / "RXNCONSO.RRF",
            self.input_path / "prescribe" / "rrf" / "RXNCONSO.RRF"
        ]
        
        conso_file = None
        for path in possible_paths:
            if path.exists():
                conso_file = path
                break
        
        if not conso_file:
            raise FileNotFoundError(f"RXNCONSO.RRF not found in {self.input_path} or subdirectories")
        
        logger.info(f"Loading concepts from {conso_file.name}")
        
        # First pass: collect all RXCUIs and their preferred terms
        rxcui_info = defaultdict(lambda: {
            'terms': [],
            'sources': set(),
            'tty': set(),
            'preferred_term': None,
            'brand_names': [],
            'ingredients': []
        })
        
        with open(conso_file, 'r', encoding='utf-8') as f:
            for line in f:
                fields = line.strip().split('|')
                if len(fields) < 15:
                    continue
                
                rxcui = fields[0]
                language = fields[1]
                term_status = fields[2]
                lui = fields[3]
                string_type = fields[4]
                sui = fields[5]
                is_preferred = fields[6]
                rxaui = fields[7]
                saui = fields[8]
                scui = fields[9]
                sdui = fields[10]
                source = fields[11]
                tty = fields[12]
                code = fields[13]
                term = fields[14]
                srl = fields[15] if len(fields) > 15 else ''
                suppress = fields[16] if len(fields) > 16 else 'N'
                
                # Skip non-English and suppressed terms
                if language != 'ENG' or suppress == 'Y':
                    continue
                
                rxcui_info[rxcui]['sources'].add(source)
                rxcui_info[rxcui]['tty'].add(tty)
                
                # Collect terms from RXNORM source
                if source == 'RXNORM':
                    rxcui_info[rxcui]['terms'].append({
                        'term': term,
                        'tty': tty,
                        'is_preferred': is_preferred == 'Y'
                    })
                    
                    # Track brand names
                    if tty == 'BN':
                        rxcui_info[rxcui]['brand_names'].append(term)
                    
                    # Set preferred term
                    if is_preferred == 'Y' and not rxcui_info[rxcui]['preferred_term']:
                        rxcui_info[rxcui]['preferred_term'] = term
        
        # Second pass: create concept entries for RXCUIs with RXNORM terms
        for rxcui, info in rxcui_info.items():
            if not info['terms']:  # Skip if no RXNORM terms
                continue
            
            # Determine primary TTY
            tty_list = list(info['tty'])
            primary_tty = None
            for tty in self.IMPORTANT_TTY:
                if tty in tty_list:
                    primary_tty = tty
                    break
            
            if not primary_tty and tty_list:
                primary_tty = tty_list[0]
            
            # Create concept entry
            concepts[rxcui] = {
                'rxcui': rxcui,
                'preferred_term': info['preferred_term'] or info['terms'][0]['term'],
                'synonyms': [t['term'] for t in info['terms'] if not t['is_preferred']][:10],
                'tty': primary_tty,
                'tty_description': self.IMPORTANT_TTY.get(primary_tty, primary_tty),
                'brand_names': info['brand_names'][:5],
                'sources': list(info['sources']),
                'ingredients': [],
                'strength': None,
                'dose_form': None,
                'ndc_codes': []
            }
            
            # Track ingredients
            if primary_tty in ['IN', 'PIN', 'MIN'] and info['preferred_term']:
                ingredients[info['preferred_term'].lower()].add(rxcui)
        
        return concepts, dict(ingredients)
    
    def load_relationships(self, concepts: Dict[str, Dict]) -> Dict[str, Dict[str, List[str]]]:
        """Load relationships from RXNREL.RRF"""
        relationships = defaultdict(lambda: defaultdict(list))
        
        # Look for RXNREL.RRF in the same directory as RXNCONSO.RRF
        possible_paths = [
            self.input_path / "RXNREL.RRF",
            self.input_path / "rrf" / "RXNREL.RRF",
            self.input_path / "prescribe" / "rrf" / "RXNREL.RRF"
        ]
        
        rel_file = None
        for path in possible_paths:
            if path.exists():
                rel_file = path
                break
        
        if not rel_file:
            logger.warning("RXNREL.RRF not found - skipping relationships")
            return relationships
        
        logger.info(f"Loading relationships from {rel_file.name}")
        
        # Relationship types we care about
        important_rels = {
            'has_ingredient', 'ingredient_of',
            'has_brand_name', 'brand_name_of',
            'has_dose_form', 'dose_form_of',
            'has_strength', 'strength_of',
            'consists_of', 'constitutes',
            'has_precise_ingredient', 'precise_ingredient_of'
        }
        
        with open(rel_file, 'r', encoding='utf-8') as f:
            for line in f:
                fields = line.strip().split('|')
                if len(fields) < 11:
                    continue
                
                rxcui1 = fields[0]
                rxaui1 = fields[1]
                stype1 = fields[2]
                rel = fields[3]
                rxcui2 = fields[4]
                rxaui2 = fields[5]
                stype2 = fields[6]
                rela = fields[7]
                rui = fields[8]
                srui = fields[9]
                sab = fields[10]
                
                # Only process relationships between concepts we have
                if rxcui1 not in concepts or rxcui2 not in concepts:
                    continue
                
                # Store specific relationship types
                if rela in important_rels:
                    relationships[rxcui1][rela].append(rxcui2)
                    
                    # Update concept with ingredient info
                    if rela == 'has_ingredient':
                        concepts[rxcui1]['ingredients'].append({
                            'rxcui': rxcui2,
                            'name': concepts[rxcui2]['preferred_term']
                        })
        
        return dict(relationships)
    
    def load_attributes(self, concepts: Dict[str, Dict]):
        """Load attributes from RXNSAT.RRF"""
        # Look for RXNSAT.RRF in the same directory as RXNCONSO.RRF
        possible_paths = [
            self.input_path / "RXNSAT.RRF",
            self.input_path / "rrf" / "RXNSAT.RRF",
            self.input_path / "prescribe" / "rrf" / "RXNSAT.RRF"
        ]
        
        sat_file = None
        for path in possible_paths:
            if path.exists():
                sat_file = path
                break
        
        if not sat_file:
            logger.warning("RXNSAT.RRF not found - skipping attributes")
            return
        
        logger.info(f"Loading attributes from {sat_file.name}")
        
        with open(sat_file, 'r', encoding='utf-8') as f:
            for line in f:
                fields = line.strip().split('|')
                if len(fields) < 11:
                    continue
                
                rxcui = fields[0]
                lui = fields[1]
                sui = fields[2]
                rxaui = fields[3]
                stype = fields[4]
                code = fields[5]
                atui = fields[6]
                satui = fields[7]
                atn = fields[8]  # Attribute name
                sab = fields[9]
                atv = fields[10]  # Attribute value
                
                if rxcui not in concepts:
                    continue
                
                # Extract useful attributes
                if atn == 'NDC' and atv:
                    concepts[rxcui]['ndc_codes'].append(atv)
                elif atn == 'RXN_STRENGTH' and atv:
                    concepts[rxcui]['strength'] = atv
                elif atn == 'RXN_DOSE_FORM' and atv:
                    concepts[rxcui]['dose_form'] = atv
    
    def create_search_index(self, concepts: Dict[str, Dict]) -> Dict[str, List[str]]:
        """Create inverted index for searching"""
        logger.info("Creating search index...")
        
        word_index = defaultdict(set)
        
        for rxcui, concept in concepts.items():
            # Index preferred term
            words = self.tokenize(concept['preferred_term'])
            for word in words:
                word_index[word].add(rxcui)
            
            # Index brand names
            for brand in concept['brand_names']:
                words = self.tokenize(brand)
                for word in words:
                    word_index[word].add(rxcui)
            
            # Index first few synonyms
            for synonym in concept['synonyms'][:3]:
                words = self.tokenize(synonym)
                for word in words:
                    word_index[word].add(rxcui)
        
        # Convert sets to lists
        return {word: list(rxcuis) for word, rxcuis in word_index.items()}
    
    def create_ingredient_index(self, concepts: Dict[str, Dict], 
                               ingredients: Dict[str, Set[str]]) -> Dict[str, List[str]]:
        """Create index for ingredient lookup"""
        logger.info("Creating ingredient index...")
        
        # Normalize ingredient names
        ingredient_index = {}
        
        for ingredient_name, rxcuis in ingredients.items():
            # Multiple normalization strategies
            normalized_names = [
                ingredient_name,
                ingredient_name.replace(' ', ''),
                ingredient_name.replace('-', ''),
                ingredient_name.replace(',', '')
            ]
            
            for name in normalized_names:
                if name:
                    ingredient_index[name.lower()] = list(rxcuis)
        
        return ingredient_index
    
    def tokenize(self, text: str) -> List[str]:
        """Tokenize text for indexing"""
        import re
        text = text.lower()
        # Keep alphanumeric and some special chars
        words = re.findall(r'[a-z0-9]+', text)
        return [w for w in words if len(w) > 1]
    
    def save_processed_data(self, concepts: Dict[str, Dict],
                          relationships: Dict[str, Dict[str, List[str]]],
                          search_index: Dict[str, List[str]],
                          ingredient_index: Dict[str, List[str]]):
        """Save processed data"""
        
        # Save concepts by type for efficient loading
        logger.info("Saving processed concepts...")
        
        concepts_by_type = defaultdict(dict)
        for rxcui, concept in concepts.items():
            tty = concept.get('tty', 'OTHER')
            concepts_by_type[tty][rxcui] = concept
        
        # Save each type separately
        for tty, tty_concepts in concepts_by_type.items():
            output_file = self.output_path / f"concepts_{tty}.json.gz"
            with gzip.open(output_file, 'wt', encoding='utf-8') as f:
                json.dump(tty_concepts, f)
        
        # Save metadata
        metadata = {
            'total_concepts': len(concepts),
            'concepts_by_type': {tty: len(concepts) for tty, concepts in concepts_by_type.items()},
            'preprocessing_version': '1.0'
        }
        
        with open(self.output_path / 'metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Save indices
        logger.info("Saving indices...")
        
        with gzip.open(self.output_path / 'search_index.json.gz', 'wt', encoding='utf-8') as f:
            json.dump(search_index, f)
        
        with gzip.open(self.output_path / 'ingredient_index.json.gz', 'wt', encoding='utf-8') as f:
            json.dump(ingredient_index, f)
        
        # Save common drugs for quick access
        logger.info("Saving common drugs...")
        common_drugs = self.extract_common_drugs(concepts)
        with open(self.output_path / 'common_drugs.json', 'w') as f:
            json.dump(common_drugs, f, indent=2)
    
    def extract_common_drugs(self, concepts: Dict[str, Dict]) -> Dict[str, Dict]:
        """Extract commonly prescribed drugs"""
        # Common drug RXCUIs
        common_rxcuis = {
            '6809': 'metformin',
            '1719': 'aspirin',
            '3640': 'lisinopril',
            '36567': 'simvastatin',
            '321988': 'amlodipine',
            '7052': 'morphine',
            '5640': 'ibuprofen',
            '70618': 'acetaminophen',
            '197361': 'albuterol',
            '35636': 'sertraline'
        }
        
        common = {}
        for rxcui, name in common_rxcuis.items():
            if rxcui in concepts:
                common[rxcui] = concepts[rxcui]
        
        return common


def main():
    """Run preprocessing"""
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python preprocess_rxnorm.py <input_path> <output_path>")
        print("Example: python preprocess_rxnorm.py data/rxnorm data/rxnorm_processed")
        sys.exit(1)
    
    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    
    if not input_path.exists():
        print(f"Error: Input path does not exist: {input_path}")
        sys.exit(1)
    
    preprocessor = RxNormPreprocessor(input_path, output_path)
    total_concepts = preprocessor.process()
    
    print(f"\nPreprocessing complete!")
    print(f"Total concepts processed: {total_concepts:,}")
    print(f"Output saved to: {output_path}")


if __name__ == "__main__":
    main()