#!/usr/bin/env python3
"""
Research workflow example for the Medical Ontology MCP Server.
This demonstrates how to process clinical research data, map conditions
to standard codes, and prepare data for statistical analysis.
"""

import asyncio
import pandas as pd
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import aiohttp
import numpy as np


class ResearchDataProcessor:
    """Process clinical research data using medical ontologies"""
    
    def __init__(self, mcp_url: str = "http://localhost:8080"):
        self.mcp_url = mcp_url
        self.session = None
        self.stats = {
            'total_processed': 0,
            'successful_mappings': 0,
            'failed_mappings': 0,
            'mapping_confidence': []
        }
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def call_mcp_tool(self, tool: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Call an MCP tool"""
        async with self.session.post(
            f"{self.mcp_url}/mcp/tools/{tool}",
            json={"parameters": parameters}
        ) as response:
            return await response.json()
    
    async def process_patient_conditions(self, 
                                       conditions_df: pd.DataFrame,
                                       text_column: str = 'condition_description',
                                       patient_id_column: str = 'patient_id') -> pd.DataFrame:
        """
        Process patient conditions and map to standard codes.
        
        Args:
            conditions_df: DataFrame with patient conditions
            text_column: Column containing condition descriptions
            patient_id_column: Column containing patient IDs
            
        Returns:
            DataFrame with mapped codes and confidence scores
        """
        print(f"Processing {len(conditions_df)} patient conditions...")
        
        results = []
        
        # Process in batches for efficiency
        batch_size = 10
        for i in range(0, len(conditions_df), batch_size):
            batch = conditions_df.iloc[i:i+batch_size]
            
            # Create batch operations
            operations = []
            for _, row in batch.iterrows():
                operations.append({
                    "operation": "map_text",
                    "parameters": {
                        "text": row[text_column],
                        "ontologies": ["SNOMED", "ICD10"],
                        "context": "diagnosis"
                    }
                })
            
            # Process batch
            batch_result = await self.call_mcp_tool("batch_process", {
                "operations": operations
            })
            
            # Process results
            for j, (_, row) in enumerate(batch.iterrows()):
                mapping_result = batch_result.get('results', [])[j] if j < len(batch_result.get('results', [])) else {}
                
                # Extract mappings
                snomed_mapping = self._extract_best_mapping(mapping_result, 'SNOMED')
                icd10_mapping = self._extract_best_mapping(mapping_result, 'ICD10')
                
                result = {
                    patient_id_column: row[patient_id_column],
                    'original_text': row[text_column],
                    'snomed_code': snomed_mapping.get('code'),
                    'snomed_term': snomed_mapping.get('term'),
                    'snomed_confidence': snomed_mapping.get('confidence', 0),
                    'icd10_code': icd10_mapping.get('code'),
                    'icd10_term': icd10_mapping.get('term'),
                    'icd10_confidence': icd10_mapping.get('confidence', 0),
                    'mapping_status': 'success' if snomed_mapping.get('code') or icd10_mapping.get('code') else 'failed'
                }
                
                results.append(result)
                
                # Update statistics
                self.stats['total_processed'] += 1
                if result['mapping_status'] == 'success':
                    self.stats['successful_mappings'] += 1
                    if snomed_mapping.get('confidence'):
                        self.stats['mapping_confidence'].append(snomed_mapping['confidence'])
                else:
                    self.stats['failed_mappings'] += 1
            
            # Progress update
            processed = min(i + batch_size, len(conditions_df))
            print(f"  Processed {processed}/{len(conditions_df)} conditions...")
        
        return pd.DataFrame(results)
    
    def _extract_best_mapping(self, mapping_result: Dict, ontology: str) -> Dict:
        """Extract the best mapping for a given ontology"""
        mappings = mapping_result.get('mappings', [])
        
        for mapping in mappings:
            ontology_mappings = mapping.get('mappings', {}).get(ontology)
            if ontology_mappings:
                return {
                    'code': ontology_mappings.get('code'),
                    'term': ontology_mappings.get('preferred_term'),
                    'confidence': ontology_mappings.get('confidence', 0)
                }
        
        return {}
    
    async def enrich_with_hierarchy(self, mapped_df: pd.DataFrame) -> pd.DataFrame:
        """Enrich mapped data with ontology hierarchy information"""
        print("\nEnriching with hierarchy information...")
        
        # Get unique SNOMED codes
        unique_snomed_codes = mapped_df['snomed_code'].dropna().unique()
        
        # Fetch hierarchy for each code
        hierarchy_data = {}
        for code in unique_snomed_codes[:10]:  # Limit for demo
            try:
                result = await self.call_mcp_tool("get_concept", {
                    "ontology": "SNOMED",
                    "code": str(code),
                    "include_relationships": True
                })
                
                concept = result.get('concept', {})
                parents = concept.get('relationships', {}).get('parents', [])
                
                if parents:
                    hierarchy_data[code] = {
                        'parent_code': parents[0].get('code'),
                        'parent_term': parents[0].get('term')
                    }
            except:
                pass
        
        # Add hierarchy data to dataframe
        mapped_df['snomed_parent_code'] = mapped_df['snomed_code'].map(
            lambda x: hierarchy_data.get(x, {}).get('parent_code')
        )
        mapped_df['snomed_parent_term'] = mapped_df['snomed_code'].map(
            lambda x: hierarchy_data.get(x, {}).get('parent_term')
        )
        
        return mapped_df
    
    def generate_research_summary(self, mapped_df: pd.DataFrame) -> Dict[str, Any]:
        """Generate summary statistics for research"""
        
        # Basic statistics
        summary = {
            'total_patients': mapped_df['patient_id'].nunique(),
            'total_conditions': len(mapped_df),
            'mapping_success_rate': (self.stats['successful_mappings'] / self.stats['total_processed']) * 100,
            'average_confidence': np.mean(self.stats['mapping_confidence']) if self.stats['mapping_confidence'] else 0
        }
        
        # Top conditions by frequency
        if 'snomed_term' in mapped_df.columns:
            top_conditions = mapped_df['snomed_term'].value_counts().head(10)
            summary['top_conditions_snomed'] = top_conditions.to_dict()
        
        if 'icd10_code' in mapped_df.columns:
            # Group by ICD-10 chapter
            mapped_df['icd10_chapter'] = mapped_df['icd10_code'].str[:3]
            chapter_distribution = mapped_df['icd10_chapter'].value_counts()
            summary['icd10_chapter_distribution'] = chapter_distribution.to_dict()
        
        # Confidence distribution
        confidence_bins = pd.cut(
            mapped_df['snomed_confidence'],
            bins=[0, 0.5, 0.7, 0.9, 1.0],
            labels=['Low (0-0.5)', 'Medium (0.5-0.7)', 'High (0.7-0.9)', 'Very High (0.9-1.0)']
        )
        summary['confidence_distribution'] = confidence_bins.value_counts().to_dict()
        
        return summary
    
    def export_for_statistical_analysis(self, 
                                       mapped_df: pd.DataFrame,
                                       output_dir: Path,
                                       study_name: str = "medical_ontology_mapping") -> Dict[str, Path]:
        """Export data in formats suitable for statistical analysis"""
        
        output_dir = Path(output_dir)
        output_dir.mkdir(exist_ok=True)
        
        exported_files = {}
        
        # CSV format (universal)
        csv_path = output_dir / f"{study_name}_mapped.csv"
        mapped_df.to_csv(csv_path, index=False)
        exported_files['csv'] = csv_path
        
        # Excel format with multiple sheets
        excel_path = output_dir / f"{study_name}_analysis.xlsx"
        with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
            # Main data
            mapped_df.to_excel(writer, sheet_name='Mapped_Conditions', index=False)
            
            # Summary statistics
            summary_df = pd.DataFrame([self.generate_research_summary(mapped_df)])
            summary_df.to_excel(writer, sheet_name='Summary', index=False)
            
            # Top conditions
            if 'snomed_term' in mapped_df.columns:
                top_conditions = mapped_df['snomed_term'].value_counts().head(20)
                top_conditions.to_excel(writer, sheet_name='Top_Conditions')
        
        exported_files['excel'] = excel_path
        
        # Stata format (if available)
        try:
            stata_path = output_dir / f"{study_name}_mapped.dta"
            mapped_df.to_stata(stata_path, write_index=False)
            exported_files['stata'] = stata_path
        except:
            print("Note: Stata export not available")
        
        # R data format
        r_script = f"""
# R script to load the mapped medical ontology data
# Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

# Load the data
data <- read.csv("{csv_path.name}")

# Convert to factors
data$snomed_code <- as.factor(data$snomed_code)
data$icd10_code <- as.factor(data$icd10_code)
data$mapping_status <- as.factor(data$mapping_status)

# Basic summary
summary(data)

# Frequency tables
table(data$mapping_status)
head(sort(table(data$snomed_term), decreasing=TRUE), 20)

# Save as RData
save(data, file="{study_name}_mapped.RData")
"""
        
        r_script_path = output_dir / f"{study_name}_load_data.R"
        with open(r_script_path, 'w') as f:
            f.write(r_script)
        exported_files['r_script'] = r_script_path
        
        return exported_files


async def main():
    """Run the research workflow example"""
    
    print("Medical Ontology MCP Server - Research Workflow Example")
    print("=" * 70)
    
    # Create sample patient data
    print("\nCreating sample patient condition data...")
    sample_data = pd.DataFrame({
        'patient_id': [f'PT{i:04d}' for i in range(1, 101)],
        'condition_description': [
            'Type 2 diabetes mellitus with neuropathy',
            'Essential hypertension',
            'Acute myocardial infarction',
            'Chronic obstructive pulmonary disease',
            'Major depressive disorder, single episode',
            'Rheumatoid arthritis',
            'Gastroesophageal reflux disease',
            'Hypothyroidism',
            'Atrial fibrillation',
            'Pneumonia',
        ] * 10,  # Repeat to create 100 records
        'encounter_date': pd.date_range('2024-01-01', periods=100, freq='D')
    })
    
    # Save sample data
    sample_data.to_csv('sample_patient_conditions.csv', index=False)
    print(f"Created sample data with {len(sample_data)} records")
    
    # Process the data
    async with ResearchDataProcessor() as processor:
        # Map conditions to standard codes
        print("\nMapping conditions to standard medical codes...")
        mapped_data = await processor.process_patient_conditions(
            sample_data,
            text_column='condition_description',
            patient_id_column='patient_id'
        )
        
        # Enrich with hierarchy
        enriched_data = await processor.enrich_with_hierarchy(mapped_data)
        
        # Generate summary
        print("\nGenerating research summary...")
        summary = processor.generate_research_summary(enriched_data)
        
        print("\n" + "=" * 50)
        print("RESEARCH SUMMARY")
        print("=" * 50)
        print(f"Total patients: {summary['total_patients']}")
        print(f"Total conditions: {summary['total_conditions']}")
        print(f"Mapping success rate: {summary['mapping_success_rate']:.1f}%")
        print(f"Average confidence: {summary['average_confidence']:.2f}")
        
        print("\nTop conditions (SNOMED):")
        for condition, count in list(summary.get('top_conditions_snomed', {}).items())[:5]:
            print(f"  - {condition}: {count}")
        
        print("\nICD-10 chapter distribution:")
        for chapter, count in list(summary.get('icd10_chapter_distribution', {}).items())[:5]:
            print(f"  - {chapter}: {count}")
        
        # Export for analysis
        print("\nExporting data for statistical analysis...")
        output_dir = Path("research_output")
        exported_files = processor.export_for_statistical_analysis(
            enriched_data,
            output_dir,
            "diabetes_cohort_study"
        )
        
        print("\nExported files:")
        for format_name, file_path in exported_files.items():
            print(f"  - {format_name}: {file_path}")
        
        # Save detailed results
        detailed_results = {
            'summary': summary,
            'processing_stats': processor.stats,
            'export_info': {k: str(v) for k, v in exported_files.items()},
            'timestamp': datetime.now().isoformat()
        }
        
        with open(output_dir / 'processing_results.json', 'w') as f:
            json.dump(detailed_results, f, indent=2)
    
    print("\n" + "=" * 70)
    print("Research workflow completed!")
    print("Results saved to ./research_output/")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())