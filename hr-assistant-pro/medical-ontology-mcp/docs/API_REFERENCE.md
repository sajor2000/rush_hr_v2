# Medical Ontology MCP Server - API Reference

## Overview

The Medical Ontology MCP Server implements the Model Context Protocol (MCP) specification, providing access to medical terminology services through standardized tools.

## MCP Tools

### 1. search

Search for medical concepts across one or more ontologies.

**Parameters:**
- `query` (string, required): The search term or phrase
- `ontologies` (array of strings, optional): List of ontologies to search ["SNOMED", "ICD10", "RxNorm", "LOINC"]
- `limit` (integer, optional): Maximum number of results per ontology (default: 10, max: 100)
- `fuzzy` (boolean, optional): Enable fuzzy matching (default: true)
- `include_synonyms` (boolean, optional): Search in synonyms (default: true)

**Example:**
```json
{
  "tool": "search",
  "parameters": {
    "query": "diabetes mellitus",
    "ontologies": ["SNOMED", "ICD10"],
    "limit": 5
  }
}
```

**Response:**
```json
{
  "results": {
    "SNOMED": [
      {
        "code": "73211009",
        "preferred_term": "Diabetes mellitus",
        "synonyms": ["DM", "Diabetes"],
        "semantic_types": ["Disease or Syndrome"],
        "score": 0.95
      }
    ],
    "ICD10": [
      {
        "code": "E11.9",
        "preferred_term": "Type 2 diabetes mellitus without complications",
        "parent_code": "E11",
        "chapter": "IV",
        "score": 0.90
      }
    ]
  }
}
```

### 2. get_concept

Retrieve detailed information about a specific concept.

**Parameters:**
- `ontology` (string, required): The ontology name
- `code` (string, required): The concept code
- `include_relationships` (boolean, optional): Include related concepts (default: false)
- `include_mappings` (boolean, optional): Include cross-ontology mappings (default: false)

**Example:**
```json
{
  "tool": "get_concept",
  "parameters": {
    "ontology": "SNOMED",
    "code": "73211009",
    "include_relationships": true,
    "include_mappings": true
  }
}
```

**Response:**
```json
{
  "concept": {
    "code": "73211009",
    "preferred_term": "Diabetes mellitus",
    "fully_qualified_name": "Diabetes mellitus (disorder)",
    "synonyms": [
      "DM",
      "Diabetes",
      "Diabetes mellitus, NOS"
    ],
    "semantic_types": ["Disease or Syndrome"],
    "is_active": true,
    "effective_date": "2002-01-31",
    "relationships": {
      "parents": [
        {
          "code": "408540003",
          "term": "Disorder of endocrine system"
        }
      ],
      "children": [
        {
          "code": "44054006",
          "term": "Type 2 diabetes mellitus"
        },
        {
          "code": "46635009",
          "term": "Type 1 diabetes mellitus"
        }
      ]
    },
    "mappings": {
      "ICD10": [
        {
          "code": "E10-E14",
          "term": "Diabetes mellitus",
          "mapping_type": "broad"
        }
      ]
    }
  }
}
```

### 3. map_text

Map free text to standardized medical concepts.

**Parameters:**
- `text` (string, required): The text to analyze
- `ontologies` (array of strings, optional): Target ontologies for mapping
- `context` (string, optional): Clinical context (e.g., "diagnosis", "medication", "procedure")
- `threshold` (float, optional): Minimum confidence threshold (0.0-1.0, default: 0.7)

**Example:**
```json
{
  "tool": "map_text",
  "parameters": {
    "text": "Patient has high blood pressure and takes metformin for diabetes",
    "ontologies": ["SNOMED", "RxNorm"],
    "context": "clinical_note"
  }
}
```

**Response:**
```json
{
  "mappings": [
    {
      "text_span": "high blood pressure",
      "start": 12,
      "end": 31,
      "mappings": {
        "SNOMED": {
          "code": "38341003",
          "preferred_term": "Hypertension",
          "confidence": 0.92
        }
      }
    },
    {
      "text_span": "metformin",
      "start": 42,
      "end": 51,
      "mappings": {
        "RxNorm": {
          "code": "6809",
          "preferred_term": "Metformin",
          "confidence": 0.98
        }
      }
    },
    {
      "text_span": "diabetes",
      "start": 56,
      "end": 64,
      "mappings": {
        "SNOMED": {
          "code": "73211009",
          "preferred_term": "Diabetes mellitus",
          "confidence": 0.88
        }
      }
    }
  ]
}
```

### 4. get_relationships

Get relationships between concepts.

**Parameters:**
- `source_ontology` (string, required): Source ontology
- `source_code` (string, required): Source concept code
- `relationship_type` (string, optional): Type of relationship ("parent", "child", "related")
- `target_ontology` (string, optional): Filter by target ontology

**Example:**
```json
{
  "tool": "get_relationships",
  "parameters": {
    "source_ontology": "SNOMED",
    "source_code": "73211009",
    "relationship_type": "child"
  }
}
```

### 5. validate_codes

Validate a list of medical codes.

**Parameters:**
- `codes` (array of objects, required): List of codes to validate
  - `ontology` (string): The ontology name
  - `code` (string): The code to validate

**Example:**
```json
{
  "tool": "validate_codes",
  "parameters": {
    "codes": [
      {"ontology": "ICD10", "code": "E11.9"},
      {"ontology": "SNOMED", "code": "73211009"},
      {"ontology": "RxNorm", "code": "6809"}
    ]
  }
}
```

**Response:**
```json
{
  "validations": [
    {
      "ontology": "ICD10",
      "code": "E11.9",
      "valid": true,
      "term": "Type 2 diabetes mellitus without complications"
    },
    {
      "ontology": "SNOMED",
      "code": "73211009",
      "valid": true,
      "term": "Diabetes mellitus"
    },
    {
      "ontology": "RxNorm",
      "code": "6809",
      "valid": true,
      "term": "Metformin"
    }
  ]
}
```

### 6. batch_process

Process multiple operations in a single request.

**Parameters:**
- `operations` (array of objects, required): List of operations to perform
  - `operation` (string): The operation type ("search", "get_concept", "map_text")
  - `parameters` (object): Parameters for the operation

**Example:**
```json
{
  "tool": "batch_process",
  "parameters": {
    "operations": [
      {
        "operation": "search",
        "parameters": {
          "query": "hypertension",
          "ontologies": ["SNOMED"]
        }
      },
      {
        "operation": "get_concept",
        "parameters": {
          "ontology": "ICD10",
          "code": "I10"
        }
      }
    ]
  }
}
```

## HTTP API Endpoints

While the primary interface is through MCP, the server also exposes HTTP endpoints for health checks and administration.

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "ontologies": {
    "SNOMED": {
      "status": "loaded",
      "concept_count": 350000,
      "version": "2024-01-31"
    },
    "ICD10": {
      "status": "loaded",
      "concept_count": 70000,
      "version": "2024"
    },
    "RxNorm": {
      "status": "loaded",
      "concept_count": 150000,
      "version": "2024-06"
    },
    "LOINC": {
      "status": "loaded",
      "concept_count": 95000,
      "version": "2.76"
    }
  }
}
```

### GET /stats

Get server statistics.

**Response:**
```json
{
  "requests_total": 10000,
  "requests_by_tool": {
    "search": 5000,
    "get_concept": 3000,
    "map_text": 2000
  },
  "average_response_time_ms": 45,
  "cache_hit_rate": 0.85
}
```

## Error Handling

All errors follow the MCP error format:

```json
{
  "error": {
    "code": "INVALID_ONTOLOGY",
    "message": "Ontology 'INVALID' is not supported",
    "details": {
      "supported_ontologies": ["SNOMED", "ICD10", "RxNorm", "LOINC"]
    }
  }
}
```

Common error codes:
- `INVALID_ONTOLOGY`: Specified ontology is not supported
- `CONCEPT_NOT_FOUND`: Requested concept code does not exist
- `INVALID_PARAMETER`: Invalid parameter value
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

Default rate limits:
- 1000 requests per minute per client
- 100 concurrent requests
- Batch operations count as single requests

## Performance Tips

1. **Use batch operations** for multiple queries
2. **Enable caching** for repeated queries
3. **Limit search results** to what you need
4. **Use specific ontologies** instead of searching all
5. **Preload common concepts** at startup

## Examples

See the `examples/` directory for complete working examples:
- `basic_usage.py` - Simple search and lookup
- `research_workflow.py` - Research data processing
- `batch_processing.py` - Efficient batch operations
- `clinical_mapping.py` - Clinical text analysis