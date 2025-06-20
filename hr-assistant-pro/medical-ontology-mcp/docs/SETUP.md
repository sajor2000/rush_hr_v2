# Medical Ontology MCP Server - Setup Guide

This guide provides detailed instructions for setting up the Medical Ontology MCP Server in various environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Setup](#quick-setup)
3. [Manual Setup](#manual-setup)
4. [Docker Setup](#docker-setup)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)

## Prerequisites

### Required Software

- **Python 3.8+** or **Docker**
- **Git** for cloning the repository
- **4GB RAM** minimum (8GB recommended for full ontologies)
- **10GB disk space** for ontology data

### Required Data

⚠️ **Medical ontology data files are NOT included in this repository.** You must obtain them separately:

📖 **[Data Acquisition Guide](../DATA_ACQUISITION.md)** - Complete instructions for downloading:
- SNOMED CT (NLM, free US license)
- ICD-10-CM (CMS, public domain)
- RxNorm (NLM, free)
- LOINC (Regenstrief, free registration)

### Optional Software

- **Docker** and **Docker Compose** (recommended for easy deployment)
- **Redis** for caching (improves performance)
- **PostgreSQL** or **MongoDB** for persistent storage

## Quick Setup

The fastest way to get started:

```bash
# Clone the repository
git clone https://github.com/yourusername/medical-ontology-mcp.git
cd medical-ontology-mcp

# Run the setup script
./setup/quick_start.sh
```

The script will:
1. Check prerequisites
2. Guide you through data setup
3. Install dependencies
4. Configure the server
5. Start the service

## Manual Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/medical-ontology-mcp.git
cd medical-ontology-mcp
```

### Step 2: Create Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Set Up Data

Create the data directory structure:

```bash
mkdir -p data/{snomed,icd10,rxnorm,loinc}
```

Copy your ontology files to the appropriate directories. See [DATA_SOURCES.md](DATA_SOURCES.md) for details on obtaining these files.

### Step 5: Configure the Server

Copy the example configuration:

```bash
cp config/config.example.yaml config/config.yaml
```

Edit `config/config.yaml` to match your setup:

```yaml
server:
  host: "0.0.0.0"
  port: 8080
  log_level: "INFO"

data_source:
  type: "local"
  local:
    path: "./data"

ontologies:
  - name: "SNOMED"
    enabled: true
  - name: "ICD10"
    enabled: true
  - name: "RxNorm"
    enabled: true
  - name: "LOINC"
    enabled: true
```

### Step 6: Verify Data

```bash
python setup/verify_data.py
```

### Step 7: Start the Server

```bash
python src/server.py
```

The server will start on `http://localhost:8080`

## Docker Setup

### Using Docker Compose (Recommended)

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### Using Docker Directly

```bash
# Build the image
docker build -t medical-ontology-mcp .

# Run the container
docker run -d \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data:ro \
  -v $(pwd)/config:/app/config \
  --name medical-mcp \
  medical-ontology-mcp

# View logs
docker logs -f medical-mcp

# Stop the container
docker stop medical-mcp
```

## Configuration

### Environment Variables

You can override configuration using environment variables:

```bash
export MCP_PORT=8080
export MCP_HOST=0.0.0.0
export LOG_LEVEL=DEBUG
export DATA_PATH=/path/to/data
```

### Configuration File

The main configuration file is `config/config.yaml`:

```yaml
# Server Configuration
server:
  host: "0.0.0.0"
  port: 8080
  log_level: "INFO"  # DEBUG, INFO, WARNING, ERROR
  cors_enabled: true
  cors_origins: ["*"]

# Data Source Configuration
data_source:
  type: "local"  # local, remote, or hybrid
  
  # Local data configuration
  local:
    path: "./data"
    cache_enabled: true
    cache_ttl: 3600
  
  # Remote data configuration (optional)
  remote:
    url: "https://ontology-server.institution.edu"
    auth_token: "your-token-here"
    timeout: 30
    retry_count: 3

# Ontology Configuration
ontologies:
  - name: "SNOMED"
    enabled: true
    version: "2024-01-31"
    index_path: "./indices/snomed"
  
  - name: "ICD10"
    enabled: true
    version: "2024"
    index_path: "./indices/icd10"
  
  - name: "RxNorm"
    enabled: true
    version: "2024-06"
    index_path: "./indices/rxnorm"
  
  - name: "LOINC"
    enabled: true
    version: "2.76"
    index_path: "./indices/loinc"

# Search Configuration
search:
  max_results: 100
  fuzzy_threshold: 0.8
  enable_synonyms: true
  enable_stemming: true
  
# Performance Configuration
performance:
  max_workers: 4
  batch_size: 1000
  index_on_startup: true
  preload_cache: false

# Optional: Cache Configuration
cache:
  type: "memory"  # memory or redis
  redis:
    host: "localhost"
    port: 6379
    db: 0
    password: ""
```

### MCP Client Configuration

Add to your MCP client configuration file:

```json
{
  "medical-ontology": {
    "command": "python",
    "args": ["/path/to/medical-ontology-mcp/src/server.py"],
    "env": {
      "PYTHONPATH": "/path/to/medical-ontology-mcp"
    }
  }
}
```

## Testing

### Run Unit Tests

```bash
pytest tests/
```

### Run Integration Tests

```bash
pytest tests/integration/
```

### Test with Sample Data

```bash
# Create sample data
python setup/create_sample_data.py

# Run basic usage example
python examples/basic_usage.py
```

### Health Check

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "ontologies": {
    "SNOMED": "loaded",
    "ICD10": "loaded",
    "RxNorm": "loaded",
    "LOINC": "loaded"
  }
}
```

## Production Deployment

### System Requirements

- **CPU**: 4+ cores recommended
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 20GB for data and indices
- **OS**: Linux (Ubuntu 20.04+ recommended)

### Security Considerations

1. **Authentication**: Configure authentication in production
2. **HTTPS**: Use a reverse proxy (nginx) for SSL
3. **Firewall**: Restrict access to necessary ports only
4. **Updates**: Keep ontology data and software updated

### Systemd Service

Create `/etc/systemd/system/medical-mcp.service`:

```ini
[Unit]
Description=Medical Ontology MCP Server
After=network.target

[Service]
Type=simple
User=mcp-user
WorkingDirectory=/opt/medical-ontology-mcp
Environment="PATH=/opt/medical-ontology-mcp/venv/bin"
ExecStart=/opt/medical-ontology-mcp/venv/bin/python src/server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable medical-mcp
sudo systemctl start medical-mcp
```

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name mcp.institution.edu;
    
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Monitoring

1. **Logs**: Check `logs/medical-mcp.log`
2. **Metrics**: Export to Prometheus (optional)
3. **Alerts**: Set up alerts for errors and high latency

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

## Next Steps

1. Test the installation with examples
2. Configure for your specific use case
3. Set up regular data updates
4. Consider contributing improvements back to the project

For questions or issues, please open a GitHub issue or contact support.