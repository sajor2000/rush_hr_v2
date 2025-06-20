# Quick Start Guide - Medical Ontology MCP

## ⚠️ Get Data First

**Before starting, you need medical ontology data files:**

📖 **[Data Acquisition Guide](DATA_ACQUISITION.md)** - Get required data from:
- SNOMED CT (NLM, free US license)
- ICD-10-CM (CMS, public domain)  
- RxNorm (NLM, free)
- LOINC (Regenstrief, free registration)

## Prerequisites

- Python 3.8+ or Node.js 14+
- Medical ontology data files (see guide above)

## Starting the Server

1. **Simple HTTP API Server** (Recommended for testing):
   ```bash
   ./start_server.sh
   ```
   
   Or manually:
   ```bash
   python3 src/simple_server.py
   ```

   The server will start at http://localhost:8080

## API Endpoints

### Health Check
```bash
curl http://localhost:8080/health
```

### Search Concepts
```bash
# Search across all ontologies
curl "http://localhost:8080/search?q=diabetes&limit=5"

# Search specific ontology
curl "http://localhost:8080/search?q=diabetes&ontology=ICD10&limit=5"

# Search multiple ontologies
curl "http://localhost:8080/search?q=metformin&ontology=RxNorm&ontology=SNOMED"
```

### Get Specific Concept
```bash
# ICD-10 code
curl http://localhost:8080/concept/ICD10/E11.9

# SNOMED code
curl http://localhost:8080/concept/SNOMED/73211009

# RxNorm code
curl http://localhost:8080/concept/RxNorm/6809

# LOINC code
curl http://localhost:8080/concept/LOINC/4548-4
```

## Example Usage with Python

```python
import requests

# Search for diabetes codes
response = requests.get('http://localhost:8080/search', params={
    'q': 'diabetes',
    'ontology': 'ICD10',
    'limit': 5
})
results = response.json()

# Get specific concept
response = requests.get('http://localhost:8080/concept/ICD10/E11.9')
concept = response.json()
```

## Loading Progress

The server loads ontologies in this order:
1. SNOMED CT - May take 1-2 minutes (large dataset)
2. ICD-10 - Quick (small dataset)
3. RxNorm - May take 30-60 seconds
4. LOINC - May take 30-60 seconds

Total startup time: 2-4 minutes depending on system performance.

## Troubleshooting

### Server won't start
- Check Python version: `python3 --version` (need 3.8+)
- Check data files: `python3 setup/verify_data.py`

### Out of memory
- The full SNOMED dataset requires ~4GB RAM
- Consider using sample data for testing
- Increase system swap space if needed

### Slow performance
- First load is always slower (building indices)
- Subsequent searches should be fast
- Consider limiting the number of concepts loaded (edit loaders)

## Next Steps

1. Test the API endpoints
2. Integrate with your application
3. Configure for production use
4. Set up proper MCP integration when available