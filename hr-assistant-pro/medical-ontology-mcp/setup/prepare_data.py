#!/usr/bin/env python3
"""
Prepare medical terminology data from mcp_friends_terminology for the MCP server.
This script creates symbolic links or copies data to the expected locations.
"""

import os
import shutil
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def prepare_data(source_base: Path, target_base: Path):
    """Prepare data from mcp_friends_terminology for the MCP server"""
    
    # Create target directories
    target_base.mkdir(parents=True, exist_ok=True)
    
    # SNOMED CT
    logger.info("Preparing SNOMED CT data...")
    snomed_source = source_base / "SnomedCT_ManagedServiceUS_PRODUCTION_US1000124_20250301T120000Z" / "Snapshot" / "Terminology"
    snomed_target = target_base / "snomed"
    snomed_target.mkdir(exist_ok=True)
    
    if snomed_source.exists():
        # Copy or link SNOMED files
        for file_pattern in ["sct2_Concept_*.txt", "sct2_Description_*.txt", "sct2_Relationship_*.txt"]:
            for source_file in snomed_source.glob(file_pattern):
                target_file = snomed_target / source_file.name
                if not target_file.exists():
                    logger.info(f"  Linking {source_file.name}")
                    try:
                        os.symlink(source_file, target_file)
                    except OSError:
                        # Fall back to copying if symlinks not supported
                        logger.info(f"  Copying {source_file.name} (symlink failed)")
                        shutil.copy2(source_file, target_file)
    
    # RxNorm
    logger.info("Preparing RxNorm data...")
    rxnorm_source = source_base / "RxNorm_full_06022025" / "rrf"
    rxnorm_target = target_base / "rxnorm"
    rxnorm_target.mkdir(exist_ok=True)
    
    if rxnorm_source.exists():
        for file_name in ["RXNCONSO.RRF", "RXNREL.RRF", "RXNSAT.RRF"]:
            source_file = rxnorm_source / file_name
            if source_file.exists():
                target_file = rxnorm_target / file_name
                if not target_file.exists():
                    logger.info(f"  Linking {file_name}")
                    try:
                        os.symlink(source_file, target_file)
                    except OSError:
                        logger.info(f"  Copying {file_name} (symlink failed)")
                        shutil.copy2(source_file, target_file)
    
    # LOINC
    logger.info("Preparing LOINC data...")
    loinc_source = source_base / "Loinc_2.80" / "LoincTable"
    loinc_target = target_base / "loinc"
    loinc_target.mkdir(exist_ok=True)
    
    if loinc_source.exists():
        source_file = loinc_source / "Loinc.csv"
        if source_file.exists():
            target_file = loinc_target / "Loinc.csv"
            if not target_file.exists():
                logger.info("  Linking Loinc.csv")
                try:
                    os.symlink(source_file, target_file)
                except OSError:
                    logger.info("  Copying Loinc.csv (symlink failed)")
                    shutil.copy2(source_file, target_file)
    
    # ICD-10
    logger.info("Preparing ICD-10 data...")
    icd10_source = source_base / "icd102019enMeta"
    icd10_target = target_base / "icd10"
    icd10_target.mkdir(exist_ok=True)
    
    if icd10_source.exists():
        for file_name in ["icd102019syst_codes.txt", "icd102019syst_chapters.txt"]:
            source_file = icd10_source / file_name
            if source_file.exists():
                target_file = icd10_target / file_name
                if not target_file.exists():
                    logger.info(f"  Linking {file_name}")
                    try:
                        os.symlink(source_file, target_file)
                    except OSError:
                        logger.info(f"  Copying {file_name} (symlink failed)")
                        shutil.copy2(source_file, target_file)
    
    logger.info("Data preparation complete!")
    
    # Verify
    logger.info("\nVerifying data...")
    for ontology in ["snomed", "icd10", "rxnorm", "loinc"]:
        ont_path = target_base / ontology
        if ont_path.exists():
            files = list(ont_path.iterdir())
            logger.info(f"  {ontology}: {len(files)} files")
        else:
            logger.warning(f"  {ontology}: directory missing")


if __name__ == "__main__":
    # Paths - configure these for your environment
    source_path = Path("../external_data")  # Update this path as needed
    target_path = Path("data")
    
    if not source_path.exists():
        logger.error(f"Source path not found: {source_path}")
        logger.info("Please update the source_path in this script to point to your data directory")
        exit(1)
    
    prepare_data(source_path, target_path)