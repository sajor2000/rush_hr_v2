"""
Jupyter Magic Commands for Medical Ontology MCP

Provides convenient magic commands for medical terminology search and lookup
in Jupyter notebooks.
"""

from IPython.core.magic import Magics, magics_class, line_magic, cell_magic
from IPython.display import display, HTML, JSON
import pandas as pd
import asyncio
from typing import Optional, List, Dict, Any
import json

from .client import MedicalOntologyClient


@magics_class
class MedicalOntologyMagics(Magics):
    """Magic commands for medical ontology operations"""
    
    def __init__(self, shell):
        super().__init__(shell)
        self.client = None
        self.data_path = None
        
    async def _get_client(self):
        """Get or create client instance"""
        if self.client is None:
            self.client = MedicalOntologyClient(data_path=self.data_path)
            await self.client.initialize()
        return self.client
    
    @line_magic
    def medical_config(self, line):
        """Configure medical ontology settings
        
        Usage:
            %medical_config data_path=/path/to/data
        """
        if line.strip():
            if line.strip().startswith('data_path='):
                self.data_path = line.strip().split('=', 1)[1]
                print(f"✅ Data path set to: {self.data_path}")
                # Reset client to use new path
                self.client = None
            else:
                print("Available options: data_path=/path/to/data")
        else:
            print(f"Current data path: {self.data_path or './data'}")
    
    @line_magic
    def medical_search(self, line):
        """Search medical terms across ontologies
        
        Usage:
            %medical_search diabetes
            %medical_search --ontology ICD10 diabetes
            %medical_search --limit 20 hypertension
        """
        args = line.strip().split()
        
        # Parse arguments
        ontologies = None
        limit = 10
        query_parts = []
        
        i = 0
        while i < len(args):
            if args[i] == '--ontology' and i + 1 < len(args):
                ontologies = [args[i + 1]]
                i += 2
            elif args[i] == '--limit' and i + 1 < len(args):
                limit = int(args[i + 1])
                i += 2
            else:
                query_parts.append(args[i])
                i += 1
        
        if not query_parts:
            print("❌ Please provide a search query")
            return
        
        query = ' '.join(query_parts)
        
        # Run search
        async def run_search():
            try:
                client = await self._get_client()
                results = await client.search(query, ontologies, limit)
                
                # Display results
                self._display_search_results(query, results)
                
                # Store results in namespace for further use
                self.shell.user_ns['_medical_search_results'] = results
                
            except Exception as e:
                print(f"❌ Search failed: {e}")
        
        # Run in event loop
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If already in event loop, create new task
            task = asyncio.create_task(run_search())
            loop.run_until_complete(task)
        else:
            loop.run_until_complete(run_search())
    
    @line_magic
    def medical_lookup(self, line):
        """Look up detailed information for a medical code
        
        Usage:
            %medical_lookup ICD10 E11.9
            %medical_lookup SNOMED 73211009
        """
        args = line.strip().split()
        
        if len(args) < 2:
            print("❌ Usage: %medical_lookup <ontology> <code>")
            print("   Example: %medical_lookup ICD10 E11.9")
            return
        
        ontology, code = args[0], args[1]
        
        # Run lookup
        async def run_lookup():
            try:
                client = await self._get_client()
                result = await client.get_concept(ontology, code)
                
                if result:
                    self._display_concept_details(result)
                    # Store result in namespace
                    self.shell.user_ns['_medical_lookup_result'] = result
                else:
                    print(f"❌ Code not found: {ontology}:{code}")
                
            except Exception as e:
                print(f"❌ Lookup failed: {e}")
        
        # Run in event loop
        loop = asyncio.get_event_loop()
        if loop.is_running():
            task = asyncio.create_task(run_lookup())
            loop.run_until_complete(task)
        else:
            loop.run_until_complete(run_lookup())
    
    @cell_magic
    def medical_batch(self, line, cell):
        """Process batch medical coding operations
        
        Usage:
            %%medical_batch
            diabetes
            hypertension
            pneumonia
        """
        queries = [q.strip() for q in cell.strip().split('\\n') if q.strip()]
        
        if not queries:
            print("❌ Please provide queries to process")
            return
        
        # Parse line arguments
        args = line.strip().split() if line.strip() else []
        ontologies = None
        limit = 5
        
        i = 0
        while i < len(args):
            if args[i] == '--ontology' and i + 1 < len(args):
                ontologies = [args[i + 1]]
                i += 2
            elif args[i] == '--limit' and i + 1 < len(args):
                limit = int(args[i + 1])
                i += 2
            else:
                i += 1
        
        # Run batch processing
        async def run_batch():
            try:
                client = await self._get_client()
                
                all_results = {}
                for query in queries:
                    print(f"🔍 Processing: {query}")
                    results = await client.search(query, ontologies, limit)
                    all_results[query] = results
                
                # Create comprehensive results DataFrame
                df = self._create_batch_dataframe(all_results)
                
                # Display and store results
                display(df)
                self.shell.user_ns['_medical_batch_results'] = all_results
                self.shell.user_ns['_medical_batch_df'] = df
                
                print(f"\\n✅ Processed {len(queries)} queries")
                print("📊 Results stored in: _medical_batch_results, _medical_batch_df")
                
            except Exception as e:
                print(f"❌ Batch processing failed: {e}")
        
        # Run in event loop
        loop = asyncio.get_event_loop()
        if loop.is_running():
            task = asyncio.create_task(run_batch())
            loop.run_until_complete(task)
        else:
            loop.run_until_complete(run_batch())
    
    def _display_search_results(self, query: str, results: Dict[str, List[Dict[str, Any]]]):
        """Display search results in a formatted way"""
        print(f"🔍 Search results for: '{query}'\\n")
        
        # Create HTML table for better display
        html_parts = []
        html_parts.append('<div style="font-family: monospace;">')
        
        for ontology, ont_results in results.items():
            if ont_results:
                html_parts.append(f'<h4>📋 {ontology} ({len(ont_results)} results)</h4>')
                html_parts.append('<table style="border-collapse: collapse; width: 100%;">')
                html_parts.append('<tr style="background-color: #f0f0f0;"><th style="border: 1px solid #ccc; padding: 8px;">Code</th><th style="border: 1px solid #ccc; padding: 8px;">Term</th></tr>')
                
                for result in ont_results:
                    code = result.get('code', 'N/A')
                    term = result.get('preferred_term', 'N/A')
                    html_parts.append(f'<tr><td style="border: 1px solid #ccc; padding: 8px;"><strong>{code}</strong></td><td style="border: 1px solid #ccc; padding: 8px;">{term}</td></tr>')
                
                html_parts.append('</table><br>')
        
        html_parts.append('</div>')
        
        if any(results.values()):
            display(HTML(''.join(html_parts)))
        else:
            print("❌ No results found")
    
    def _display_concept_details(self, concept: Dict[str, Any]):
        """Display detailed concept information"""
        html_parts = []
        html_parts.append('<div style="font-family: monospace; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">')
        html_parts.append(f'<h3>📋 Concept Details</h3>')
        html_parts.append('<table style="border-collapse: collapse; width: 100%;">')
        
        # Core information
        fields_to_show = [
            ('Code', 'code'),
            ('Preferred Term', 'preferred_term'),
            ('Chapter', 'chapter'),
            ('Chapter Description', 'chapter_description'),
            ('Parent Code', 'parent_code'),
            ('TTY', 'tty'),
            ('TTY Description', 'tty_description')
        ]
        
        for label, field in fields_to_show:
            if field in concept and concept[field]:
                value = concept[field]
                html_parts.append(f'<tr><td style="border: 1px solid #ccc; padding: 8px; font-weight: bold;">{label}</td><td style="border: 1px solid #ccc; padding: 8px;">{value}</td></tr>')
        
        # Synonyms
        if 'synonyms' in concept and concept['synonyms']:
            synonyms = ', '.join(concept['synonyms'][:5])
            if len(concept['synonyms']) > 5:
                synonyms += f" ... (+{len(concept['synonyms']) - 5} more)"
            html_parts.append(f'<tr><td style="border: 1px solid #ccc; padding: 8px; font-weight: bold;">Synonyms</td><td style="border: 1px solid #ccc; padding: 8px;">{synonyms}</td></tr>')
        
        html_parts.append('</table>')
        html_parts.append('</div>')
        
        display(HTML(''.join(html_parts)))
    
    def _create_batch_dataframe(self, all_results: Dict[str, Dict[str, List[Dict[str, Any]]]]) -> pd.DataFrame:
        """Create a pandas DataFrame from batch results"""
        rows = []
        
        for query, results in all_results.items():
            for ontology, ont_results in results.items():
                for i, result in enumerate(ont_results):
                    rows.append({
                        'query': query,
                        'ontology': ontology,
                        'rank': i + 1,
                        'code': result.get('code', ''),
                        'preferred_term': result.get('preferred_term', ''),
                        'chapter': result.get('chapter', ''),
                        'score': result.get('score', 0),
                    })
        
        return pd.DataFrame(rows)


# Load the extension
def load_ipython_extension(ipython):
    """Load the medical ontology magic commands"""
    ipython.register_magic_function(MedicalOntologyMagics)
    print("🏥 Medical Ontology MCP magic commands loaded!")
    print("Available commands:")
    print("  %medical_config    - Configure settings")
    print("  %medical_search    - Search medical terms")
    print("  %medical_lookup    - Look up specific codes")
    print("  %%medical_batch    - Batch process multiple queries")


def unload_ipython_extension(ipython):
    """Unload the extension"""
    # Remove registered magics if needed
    pass