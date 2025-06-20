#!/usr/bin/env python3
"""
Master preprocessing script for all medical ontologies.
Run this to preprocess all ontology data for optimal performance.
"""

import sys
import logging
import time
import shutil
from pathlib import Path
from datetime import datetime
import subprocess
import json

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class OntologyPreprocessor:
    """Master preprocessor for all ontologies"""
    
    def __init__(self, base_data_path: Path):
        self.base_data_path = base_data_path
        self.scripts_path = Path(__file__).parent
        
        # Ontology configurations
        self.ontologies = {
            'snomed': {
                'name': 'SNOMED CT',
                'script': 'preprocess_snomed.py',
                'input_subdir': 'snomed',
                'output_subdir': 'snomed_processed',
                'required_files': ['sct2_Concept_*.txt', 'sct2_Description_*.txt'],
                'estimated_time': '2-5 minutes'
            },
            'rxnorm': {
                'name': 'RxNorm',
                'script': 'preprocess_rxnorm.py',
                'input_subdir': 'rxnorm',
                'output_subdir': 'rxnorm_processed',
                'required_files': ['RXNCONSO.RRF'],
                'estimated_time': '1-2 minutes'
            },
            'loinc': {
                'name': 'LOINC',
                'script': 'preprocess_loinc.py',
                'input_subdir': 'loinc',
                'output_subdir': 'loinc_processed',
                'required_files': ['Loinc.csv'],
                'estimated_time': '30-60 seconds'
            },
            'icd10': {
                'name': 'ICD-10',
                'script': 'preprocess_icd10.py',  # Will be auto-detected
                'input_subdir': 'icd10',
                'output_subdir': 'icd10_processed',
                'required_files': ['icd102019syst_codes.txt', 'icd10cm_tabular_*.xml'],
                'estimated_time': '10-20 seconds'
            }
        }
        
        self.results = {}
    
    def check_prerequisites(self) -> bool:
        """Check if all required files are present"""
        logger.info("Checking prerequisites...")
        all_ready = True
        
        for ont_key, ont_config in self.ontologies.items():
            input_path = self.base_data_path / ont_config['input_subdir']
            
            if not input_path.exists():
                logger.error(f"❌ {ont_config['name']}: Input directory not found: {input_path}")
                all_ready = False
                continue
            
            # Check for required files (any pattern match is sufficient)
            found_files = False
            for pattern in ont_config['required_files']:
                # Check in subdirectories too with **/ prefix
                matches = list(input_path.glob(pattern)) + list(input_path.glob(f"**/{pattern}"))
                if matches:
                    found_files = True
                    break
            
            if found_files:
                logger.info(f"✅ {ont_config['name']}: Ready to preprocess")
            else:
                logger.error(f"❌ {ont_config['name']}: Required files not found")
                all_ready = False
        
        return all_ready
    
    def detect_icd10_format(self, input_path: Path) -> str:
        """Detect ICD-10 data format and return appropriate preprocessor script"""
        # Check for XML format first
        xml_files = list(input_path.glob('**/icd10cm_tabular_*.xml'))
        if xml_files:
            logger.info(f"  Detected ICD-10 XML format: {xml_files[0].name}")
            return 'preprocess_icd10_xml.py'
        
        # Check for text format
        text_files = list(input_path.glob('**/icd102019syst_codes.txt'))
        if text_files:
            logger.info(f"  Detected ICD-10 text format: {text_files[0].name}")
            return 'preprocess_icd10.py'
        
        # Default to XML (more common in recent distributions)
        logger.warning("  Could not detect ICD-10 format, defaulting to XML preprocessor")
        return 'preprocess_icd10_xml.py'
    
    def preprocess_ontology(self, ont_key: str) -> bool:
        """Preprocess a single ontology"""
        ont_config = self.ontologies[ont_key]
        logger.info(f"\nPreprocessing {ont_config['name']}...")
        logger.info(f"Estimated time: {ont_config['estimated_time']}")
        
        input_path = self.base_data_path / ont_config['input_subdir']
        output_path = self.base_data_path / ont_config['output_subdir']
        
        # For ICD-10, auto-detect the format and choose the right preprocessor
        if ont_key == 'icd10':
            script_name = self.detect_icd10_format(input_path)
            script_path = self.scripts_path / script_name
        else:
            script_path = self.scripts_path / ont_config['script']
        
        # Create output directory
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Run preprocessing script
        start_time = time.time()
        
        try:
            cmd = [sys.executable, str(script_path), str(input_path), str(output_path)]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            
            elapsed_time = time.time() - start_time
            
            # Parse output for concept count
            concept_count = 0
            output_lines = result.stdout.split('\n')
            for line in output_lines:
                if "Total concepts processed:" in line or "Total codes processed:" in line:
                    count_str = line.split(':')[1].strip().replace(',', '')
                    concept_count = int(count_str)
                    break
            
            self.results[ont_key] = {
                'success': True,
                'time': elapsed_time,
                'concept_count': concept_count,
                'output_path': str(output_path)
            }
            
            logger.info(f"✅ {ont_config['name']} preprocessed successfully")
            logger.info(f"   Concepts: {concept_count:,}")
            logger.info(f"   Time: {elapsed_time:.1f} seconds")
            
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ {ont_config['name']} preprocessing failed")
            logger.error(f"   Error: {e.stderr}")
            
            self.results[ont_key] = {
                'success': False,
                'error': str(e)
            }
            
            return False
        except Exception as e:
            logger.error(f"❌ {ont_config['name']} preprocessing failed")
            logger.error(f"   Error: {str(e)}")
            
            self.results[ont_key] = {
                'success': False,
                'error': str(e)
            }
            
            return False
    
    def preprocess_all(self):
        """Preprocess all ontologies"""
        logger.info("=" * 60)
        logger.info("Medical Ontology Preprocessing")
        logger.info("=" * 60)
        
        # Check prerequisites
        if not self.check_prerequisites():
            logger.error("\nPrerequisites not met. Please ensure all data files are present.")
            logger.info("Run: python setup/verify_data.py")
            return False
        
        # Preprocess each ontology
        total_start = time.time()
        success_count = 0
        
        for ont_key in self.ontologies:
            if self.preprocess_ontology(ont_key):
                success_count += 1
        
        total_time = time.time() - total_start
        
        # Save summary
        self.save_summary(total_time)
        
        # Print summary
        logger.info("\n" + "=" * 60)
        logger.info("Preprocessing Summary")
        logger.info("=" * 60)
        logger.info(f"Total time: {total_time:.1f} seconds")
        logger.info(f"Successful: {success_count}/{len(self.ontologies)}")
        
        for ont_key, result in self.results.items():
            ont_name = self.ontologies[ont_key]['name']
            if result['success']:
                logger.info(f"✅ {ont_name}: {result['concept_count']:,} concepts")
            else:
                logger.info(f"❌ {ont_name}: Failed")
        
        return success_count == len(self.ontologies)
    
    def save_summary(self, total_time: float):
        """Save preprocessing summary"""
        summary = {
            'timestamp': datetime.now().isoformat(),
            'total_time_seconds': total_time,
            'results': self.results,
            'data_path': str(self.base_data_path)
        }
        
        summary_path = self.base_data_path / 'preprocessing_summary.json'
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        
        logger.info(f"\nSummary saved to: {summary_path}")
    
    def clean_old_processed_data(self):
        """Clean old processed data before new preprocessing"""
        logger.info("Cleaning old processed data...")
        
        for ont_config in self.ontologies.values():
            output_path = self.base_data_path / ont_config['output_subdir']
            if output_path.exists():
                shutil.rmtree(output_path)
                logger.info(f"  Cleaned: {output_path}")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Preprocess medical ontology data for optimal performance'
    )
    parser.add_argument(
        'data_path',
        type=Path,
        help='Path to the data directory containing ontology subdirectories'
    )
    parser.add_argument(
        '--clean',
        action='store_true',
        help='Clean old processed data before preprocessing'
    )
    parser.add_argument(
        '--ontology',
        choices=['snomed', 'rxnorm', 'loinc', 'icd10'],
        help='Preprocess only specified ontology'
    )
    
    args = parser.parse_args()
    
    if not args.data_path.exists():
        logger.error(f"Data path does not exist: {args.data_path}")
        sys.exit(1)
    
    # Create preprocessor
    preprocessor = OntologyPreprocessor(args.data_path)
    
    # Clean if requested
    if args.clean:
        preprocessor.clean_old_processed_data()
    
    # Preprocess
    if args.ontology:
        # Single ontology
        success = preprocessor.preprocess_ontology(args.ontology)
        sys.exit(0 if success else 1)
    else:
        # All ontologies
        success = preprocessor.preprocess_all()
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()