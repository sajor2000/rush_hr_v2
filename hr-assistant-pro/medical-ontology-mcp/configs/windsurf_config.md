# Windsurf IDE Configuration for Medical Ontology MCP

## Setup Instructions

1. **Open Windsurf Settings**
   - Navigate to `Windsurf → Settings → Advanced Settings`
   - Or use Command Palette: `Open Windsurf Settings Page`

2. **Configure MCP Server**
   - Scroll down to the "Cascade" section
   - Click "Add custom server +"
   - Add the following configuration to `mcp_config.json`:

```json
{
  "mcpServers": {
    "medical-ontology": {
      "command": "python",
      "args": [
        "-m",
        "medical_ontology_mcp.server"
      ],
      "env": {
        "DATA_PATH": "./data",
        "LOG_LEVEL": "INFO",
        "WINDSURF_INTEGRATION": "true",
        "ENABLE_AI_SUGGESTIONS": "true"
      },
      "description": "Medical Ontology MCP Server for clinical coding and research"
    }
  }
}
```

## Features in Windsurf

### Cascade Integration
- **Medical Code Suggestions**: Get real-time ICD-10, SNOMED CT suggestions while coding
- **Terminology Validation**: Automatic validation of medical terms in documentation
- **Cross-Reference Lookup**: Quick lookup of codes across different ontologies

### AI-Assisted Clinical Documentation
- **Smart Autocomplete**: Context-aware medical terminology completion
- **Code Generation**: Automatic generation of medical coding workflows
- **Documentation Templates**: Pre-built templates for clinical research

### Real-time Terminology Validation
- **Live Error Checking**: Highlight invalid or deprecated medical codes
- **Suggestion Popups**: Show alternative codes and mappings
- **Compliance Checking**: Ensure terminology meets regulatory standards

## Usage Examples

### In Clinical Documentation
```python
# Type "diabetes" and get ICD-10 suggestions
diabetes_codes = [
    "E11.9",  # Type 2 diabetes without complications
    "E10.9",  # Type 1 diabetes without complications
    "E13.9"   # Other specified diabetes without complications
]
```

### In Research Code
```python
# AI will suggest medical ontology functions
def analyze_patient_cohort(conditions):
    # Get ICD-10 codes for conditions
    icd_codes = medical_ontology.search_icd10(conditions)
    
    # Map to SNOMED CT for clinical analysis
    snomed_codes = medical_ontology.map_codes(
        icd_codes, 
        source="ICD10", 
        target="SNOMED"
    )
    
    return snomed_codes
```

## Troubleshooting

### Server Not Starting
- Ensure Python path is correct
- Check data directory exists
- Verify all dependencies are installed

### Slow Performance
- Enable preprocessing: `ENABLE_PREPROCESSING=true`
- Increase cache size: `CACHE_SIZE=2000`
- Use SSD storage for data files

### Integration Issues
- Restart Windsurf after configuration changes
- Check MCP server logs in Windsurf console
- Verify environment variables are set correctly

## Advanced Configuration

### Custom Data Sources
```json
{
  "env": {
    "DATA_PATH": "/path/to/custom/medical/data",
    "CUSTOM_ONTOLOGIES": "true",
    "ONTOLOGY_CONFIG": "./custom_ontology_config.yaml"
  }
}
```

### Research Institution Setup
```json
{
  "env": {
    "INSTITUTION_MODE": "research",
    "ENABLE_BATCH_PROCESSING": "true",
    "MAX_CONCURRENT_REQUESTS": "10",
    "AUDIT_LOGGING": "true"
  }
}
```

For more configuration options, see the [Advanced Configuration Guide](../docs/ADVANCED_CONFIG.md).