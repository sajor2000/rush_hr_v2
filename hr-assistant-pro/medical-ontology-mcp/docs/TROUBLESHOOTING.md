# Troubleshooting Guide

This guide helps resolve common issues with the Medical Ontology MCP Server.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Data Loading Problems](#data-loading-problems)
3. [Server Startup Errors](#server-startup-errors)
4. [Performance Issues](#performance-issues)
5. [Search Problems](#search-problems)
6. [Network and Connection Issues](#network-and-connection-issues)
7. [Memory and Resource Issues](#memory-and-resource-issues)

## Installation Issues

### Python Version Error

**Problem**: `Python 3.8+ is required`

**Solution**:
```bash
# Check Python version
python3 --version

# Install Python 3.8+ on Ubuntu
sudo apt update
sudo apt install python3.9 python3.9-venv python3.9-dev

# Install Python 3.8+ on macOS
brew install python@3.9
```

### Missing Dependencies

**Problem**: `ModuleNotFoundError: No module named 'mcp'`

**Solution**:
```bash
# Ensure you're in the virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Reinstall dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### Permission Denied

**Problem**: `Permission denied` when accessing files

**Solution**:
```bash
# Fix ownership
sudo chown -R $USER:$USER .

# Fix permissions
chmod +x setup/quick_start.sh
chmod -R 755 src/
```

## Data Loading Problems

### Ontology Files Not Found

**Problem**: `FileNotFoundError: SNOMED CT files not found`

**Solution**:

1. Verify file locations:
```bash
# Check if files exist
ls -la data/snomed/
ls -la data/icd10/
ls -la data/rxnorm/
ls -la data/loinc/
```

2. Ensure correct file names:
- SNOMED: `sct2_Concept_*.txt`, `sct2_Description_*.txt`
- ICD-10: `icd10*.txt` or `icd10*.csv`
- RxNorm: `RXNCONSO.RRF`
- LOINC: `Loinc.csv`

3. Run verification:
```bash
python setup/verify_data.py
```

### Encoding Errors

**Problem**: `UnicodeDecodeError` when loading files

**Solution**:
```bash
# Convert file encoding
iconv -f ISO-8859-1 -t UTF-8 input_file.txt > output_file.txt

# Or in Python
with open('file.txt', 'r', encoding='latin-1') as f:
    content = f.read()
```

### Corrupted Data Files

**Problem**: `Invalid file format` errors

**Solution**:

1. Verify file integrity:
```bash
# Check file format
head -n 5 data/snomed/sct2_Concept_*.txt
```

2. Re-download files from official sources
3. Check for complete downloads (no partial files)

## Server Startup Errors

### Port Already in Use

**Problem**: `[Errno 48] Address already in use`

**Solution**:
```bash
# Find process using port 8080
lsof -i :8080  # Mac/Linux
netstat -ano | findstr :8080  # Windows

# Kill the process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows

# Or use a different port
export MCP_PORT=8081
python src/server.py
```

### Configuration File Not Found

**Problem**: `config.yaml not found`

**Solution**:
```bash
# Copy example configuration
cp config/config.example.yaml config/config.yaml

# Edit configuration
nano config/config.yaml
```

### Module Import Errors

**Problem**: `ImportError: cannot import name 'Server' from 'mcp'`

**Solution**:
```bash
# Ensure PYTHONPATH is set
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Or run from project root
cd /path/to/medical-ontology-mcp
python src/server.py
```

## Performance Issues

### Slow Startup

**Problem**: Server takes too long to start

**Solutions**:

1. Disable index building on startup:
```yaml
# config.yaml
performance:
  index_on_startup: false
```

2. Load only needed ontologies:
```yaml
ontologies:
  - name: "SNOMED"
    enabled: false  # Disable unused ontologies
```

3. Use sample data for testing:
```bash
python setup/create_sample_data.py
```

### Slow Search Responses

**Problem**: Search queries take too long

**Solutions**:

1. Enable caching:
```yaml
cache:
  type: "redis"
  redis:
    host: "localhost"
    port: 6379
```

2. Reduce search scope:
```python
# Search specific ontologies only
results = await client.search("diabetes", ontologies=["SNOMED"])
```

3. Limit results:
```python
results = await client.search("diabetes", limit=5)
```

## Search Problems

### No Search Results

**Problem**: Search returns empty results

**Debugging Steps**:

1. Check if data is loaded:
```bash
curl http://localhost:8080/health
```

2. Try exact term search:
```python
# Use exact medical terms
results = await client.search("Diabetes mellitus")
```

3. Check fuzzy search settings:
```yaml
search:
  fuzzy_threshold: 0.6  # Lower threshold
  enable_synonyms: true
```

### Incorrect Mappings

**Problem**: Text mapping returns wrong concepts

**Solutions**:

1. Adjust confidence threshold:
```python
mappings = await client.map_text(
    text="patient has high blood pressure",
    threshold=0.8  # Higher threshold
)
```

2. Specify context:
```python
mappings = await client.map_text(
    text="metformin 500mg",
    context="medication"
)
```

## Network and Connection Issues

### Connection Refused

**Problem**: `ConnectionRefusedError`

**Solutions**:

1. Check if server is running:
```bash
ps aux | grep "python.*server.py"
systemctl status medical-mcp  # If using systemd
```

2. Check firewall:
```bash
# Ubuntu/Debian
sudo ufw status
sudo ufw allow 8080

# RHEL/CentOS
sudo firewall-cmd --list-ports
sudo firewall-cmd --add-port=8080/tcp --permanent
```

3. Verify listening address:
```yaml
# config.yaml
server:
  host: "0.0.0.0"  # Listen on all interfaces
  port: 8080
```

### SSL/TLS Errors

**Problem**: SSL certificate errors

**Solutions**:

1. For self-signed certificates:
```python
# Disable SSL verification (development only!)
import ssl
ssl._create_default_https_context = ssl._create_unverified_context
```

2. Add certificate to trust store:
```bash
# Ubuntu/Debian
sudo cp your-cert.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

## Memory and Resource Issues

### Out of Memory Errors

**Problem**: `MemoryError` or server crashes

**Solutions**:

1. Increase available memory:
```bash
# Check current memory
free -h

# Add swap space
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

2. Load ontologies on demand:
```python
# Don't load all ontologies at startup
performance:
  preload_cache: false
```

3. Use streaming for large files:
```python
# Process files in chunks
chunk_size = 10000
for chunk in pd.read_csv('large_file.csv', chunksize=chunk_size):
    process_chunk(chunk)
```

### High CPU Usage

**Problem**: Server uses 100% CPU

**Solutions**:

1. Limit worker processes:
```yaml
performance:
  max_workers: 2  # Reduce from default
```

2. Enable rate limiting:
```python
from aiohttp import web
from aiohttp_middlewares import rate_limit_middleware

app = web.Application(
    middlewares=[
        rate_limit_middleware(limit=100, period=60),  # 100 requests per minute
    ]
)
```

## Debug Mode

Enable debug logging for more information:

```yaml
# config.yaml
server:
  log_level: "DEBUG"
```

Or via environment variable:
```bash
export LOG_LEVEL=DEBUG
python src/server.py
```

## Getting Help

If you're still experiencing issues:

1. **Check logs**:
```bash
# Application logs
tail -f logs/medical-mcp.log

# System logs
journalctl -u medical-mcp -f  # systemd
docker logs -f medical-mcp  # Docker
```

2. **Run diagnostics**:
```bash
# Verify installation
python -m pip check

# Test basic functionality
python -c "import mcp; print(mcp.__version__)"

# Check data integrity
python setup/verify_data.py
```

3. **Report issues**:
- Include error messages
- Provide configuration (without sensitive data)
- List steps to reproduce
- Mention OS and Python version

Open an issue at: https://github.com/yourusername/medical-ontology-mcp/issues