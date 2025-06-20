#!/bin/bash

# Medical Ontology MCP Server - Quick Start Script
# This script helps researchers set up the server with their own ontology data

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     Medical Ontology MCP Server - Academic Edition       ║"
echo "║                    Quick Setup Script                    ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        echo -e "${GREEN}✓${NC} Python $PYTHON_VERSION found"
        
        # Check Python version >= 3.8
        if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)" 2>/dev/null; then
            echo -e "${RED}✗${NC} Python 3.8 or higher is required"
            exit 1
        fi
    else
        echo -e "${RED}✗${NC} Python 3.8+ is required but not found"
        echo "Please install Python from https://www.python.org/"
        exit 1
    fi
    
    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker found (optional)"
        USE_DOCKER=true
    else
        echo -e "${YELLOW}!${NC} Docker not found (optional - will use Python)"
        USE_DOCKER=false
    fi
    
    # Check Git
    if command -v git &> /dev/null; then
        echo -e "${GREEN}✓${NC} Git found"
    else
        echo -e "${RED}✗${NC} Git is required but not found"
        exit 1
    fi
    
    echo ""
}

# Data setup wizard
setup_data() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Data Setup Wizard${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "This framework requires medical ontology data files."
    echo "Due to licensing, you need to obtain these separately."
    echo ""
    echo "Options:"
    echo "  1) I have already downloaded the ontology files"
    echo "  2) I need instructions on where to download them"
    echo "  3) I want to connect to my institution's data server"
    echo "  4) I only want to test with sample data"
    echo ""
    
    while true; do
        read -p "Select an option (1-4): " choice
        case $choice in
            1)
                setup_local_data
                break
                ;;
            2)
                show_download_instructions
                ;;
            3)
                setup_remote_data
                break
                ;;
            4)
                setup_sample_data
                break
                ;;
            *)
                echo -e "${RED}Invalid option. Please select 1-4.${NC}"
                ;;
        esac
    done
}

# Local data setup
setup_local_data() {
    echo ""
    echo -e "${YELLOW}Local Data Setup${NC}"
    echo -e "${BLUE}────────────────${NC}"
    
    # Create data directory structure
    mkdir -p data/{snomed,icd10,rxnorm,loinc}
    
    echo ""
    echo "Please copy your ontology files to the following directories:"
    echo ""
    echo -e "  ${GREEN}SNOMED CT:${NC} ./data/snomed/"
    echo "    Expected files: sct2_*.txt, der2_*.txt"
    echo ""
    echo -e "  ${GREEN}ICD-10:${NC} ./data/icd10/"
    echo "    Expected files: icd10*.txt or icd10*.xml"
    echo ""
    echo -e "  ${GREEN}RxNorm:${NC} ./data/rxnorm/"
    echo "    Expected files: RXN*.RRF"
    echo ""
    echo -e "  ${GREEN}LOINC:${NC} ./data/loinc/"
    echo "    Expected files: Loinc.csv, LoincPartLink*.csv"
    echo ""
    
    read -p "Press Enter when files are copied..."
    
    # Verify data
    echo ""
    echo -e "${YELLOW}Verifying data files...${NC}"
    python3 setup/verify_data.py
}

# Show download instructions
show_download_instructions() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}How to Obtain Medical Ontology Data${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}1. SNOMED CT${NC}"
    echo "   - Register at: https://uts.nlm.nih.gov/uts/umls/home"
    echo "   - Download from: UMLS Download page"
    echo "   - License: UMLS Metathesaurus License required"
    echo ""
    echo -e "${GREEN}2. ICD-10${NC}"
    echo "   - WHO version: https://www.who.int/standards/classifications/classification-of-diseases"
    echo "   - US version (ICD-10-CM): https://www.cms.gov/medicare/icd-10/icd-10-cm"
    echo "   - License: Free for WHO version, check CMS for US version"
    echo ""
    echo -e "${GREEN}3. RxNorm${NC}"
    echo "   - Register at: https://uts.nlm.nih.gov/uts/umls/home"
    echo "   - Download from: https://www.nlm.nih.gov/research/umls/rxnorm/docs/rxnormfiles.html"
    echo "   - License: UMLS Metathesaurus License required"
    echo ""
    echo -e "${GREEN}4. LOINC${NC}"
    echo "   - Register at: https://loinc.org"
    echo "   - Download from: https://loinc.org/downloads/"
    echo "   - License: LOINC License required (free for many uses)"
    echo ""
    echo "After downloading, run this script again and select option 1"
    echo ""
    read -p "Press Enter to continue..."
}

# Remote data setup
setup_remote_data() {
    echo ""
    echo -e "${YELLOW}Remote Data Configuration${NC}"
    echo -e "${BLUE}─────────────────────────${NC}"
    echo ""
    echo "Configure connection to your institution's data server."
    echo ""
    
    read -p "Enter your institution's data server URL: " DATA_SERVER
    read -p "Enter your authentication token (press Enter if none): " AUTH_TOKEN
    
    # Create config directory
    mkdir -p config
    
    # Update config
    cat > config/config.yaml << EOF
# Medical Ontology MCP Configuration
# Generated by quick_start.sh

server:
  host: "0.0.0.0"
  port: 8080
  log_level: "INFO"

data_source:
  type: "remote"
  remote:
    url: "${DATA_SERVER}"
    auth_token: "${AUTH_TOKEN}"
    timeout: 30
    cache_enabled: true
    cache_ttl: 3600

ontologies:
  - name: "SNOMED"
    enabled: true
  - name: "ICD10"
    enabled: true
  - name: "RxNorm"
    enabled: true
  - name: "LOINC"
    enabled: true

search:
  max_results: 100
  fuzzy_threshold: 0.8
  enable_synonyms: true
EOF
    
    echo -e "${GREEN}✓${NC} Remote data configured"
}

# Sample data setup
setup_sample_data() {
    echo ""
    echo -e "${YELLOW}Setting up sample data for testing...${NC}"
    
    # Create sample data
    python3 setup/create_sample_data.py
    
    # Update config for sample data
    mkdir -p config
    cat > config/config.yaml << EOF
# Medical Ontology MCP Configuration
# Using sample data for testing

server:
  host: "0.0.0.0"
  port: 8080
  log_level: "INFO"

data_source:
  type: "local"
  local:
    path: "./data/sample"

ontologies:
  - name: "SNOMED"
    enabled: true
  - name: "ICD10"
    enabled: true
  - name: "RxNorm"
    enabled: true
  - name: "LOINC"
    enabled: true

search:
  max_results: 100
  fuzzy_threshold: 0.8
  enable_synonyms: true

# Sample data warning
warning: "This instance is using sample data for testing only. Not for clinical use!"
EOF
    
    echo -e "${GREEN}✓${NC} Sample data created"
    echo -e "${YELLOW}⚠${NC}  Remember: Sample data is for testing only!"
}

# Install dependencies
install_dependencies() {
    echo ""
    echo -e "${YELLOW}Installing dependencies...${NC}"
    
    if [ "$USE_DOCKER" = true ]; then
        echo "Building Docker container..."
        docker-compose build
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} Docker container built successfully"
        else
            echo -e "${RED}✗${NC} Docker build failed"
            echo "Falling back to Python installation..."
            USE_DOCKER=false
        fi
    fi
    
    if [ "$USE_DOCKER" = false ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv venv
        
        echo "Activating virtual environment..."
        source venv/bin/activate
        
        echo "Installing Python packages..."
        pip install --upgrade pip
        pip install -r requirements.txt
        
        echo -e "${GREEN}✓${NC} Python dependencies installed"
    fi
}

# Preprocess data for better performance
preprocess_data() {
    echo ""
    echo -e "${YELLOW}Data Preprocessing${NC}"
    echo -e "${BLUE}──────────────────${NC}"
    echo ""
    echo "Preprocessing creates optimized indices for faster searching."
    echo "This is highly recommended for production use."
    echo ""
    
    # Check if already preprocessed
    if [ -d "data/snomed_processed" ] && [ -d "data/rxnorm_processed" ]; then
        echo -e "${GREEN}✓${NC} Preprocessed data already exists"
        read -p "Do you want to re-process the data? (y/N): " reprocess
        if [[ ! "$reprocess" =~ ^[Yy]$ ]]; then
            return
        fi
    else
        read -p "Do you want to preprocess data for better performance? (Y/n): " preprocess
        if [[ "$preprocess" =~ ^[Nn]$ ]]; then
            echo "Skipping preprocessing (not recommended for production)"
            return
        fi
    fi
    
    echo ""
    echo "Starting preprocessing (this may take 5-10 minutes)..."
    echo ""
    
    # Run preprocessing
    if [ "$USE_DOCKER" = false ]; then
        source venv/bin/activate
    fi
    
    python3 setup/preprocess_all.py data/
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓${NC} Data preprocessing complete!"
    else
        echo -e "${YELLOW}⚠${NC} Preprocessing failed - server will use raw data (slower)"
    fi
}

# Generate MCP config
generate_mcp_config() {
    echo ""
    echo -e "${YELLOW}Generating MCP client configuration...${NC}"
    
    CURRENT_DIR=$(pwd)
    
    cat > mcp_config.json << EOF
{
  "medical-ontology": {
    "command": "python",
    "args": ["${CURRENT_DIR}/src/server.py"],
    "env": {
      "PYTHONPATH": "${CURRENT_DIR}"
    }
  }
}
EOF
    
    echo -e "${GREEN}✓${NC} MCP configuration saved to mcp_config.json"
}

# Start server
start_server() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Starting Medical Ontology MCP Server${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if [ "$USE_DOCKER" = true ]; then
        echo "Starting Docker container..."
        docker-compose up -d
        
        if [ $? -eq 0 ]; then
            echo ""
            echo -e "${GREEN}✓${NC} Server running at http://localhost:8080"
            echo ""
            echo "Docker commands:"
            echo "  View logs:  docker-compose logs -f"
            echo "  Stop:       docker-compose down"
            echo "  Restart:    docker-compose restart"
        else
            echo -e "${RED}✗${NC} Failed to start Docker container"
            exit 1
        fi
    else
        echo "To start the server manually:"
        echo ""
        echo "  source venv/bin/activate"
        echo "  python src/server.py"
        echo ""
        echo "Or run in the background:"
        echo "  nohup python src/server.py > server.log 2>&1 &"
    fi
}

# Final instructions
show_final_instructions() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓ Setup Complete!${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo ""
    echo "1. Add to your MCP client configuration:"
    echo -e "   ${BLUE}cat mcp_config.json${NC}"
    echo ""
    echo "2. Test the setup:"
    echo -e "   ${BLUE}python examples/basic_usage.py${NC}"
    echo ""
    echo "3. Explore the examples:"
    echo -e "   ${BLUE}jupyter notebook examples/research_workflow.ipynb${NC}"
    echo ""
    echo "4. Read the documentation:"
    echo -e "   ${BLUE}open docs/README.md${NC}"
    echo ""
    echo -e "${YELLOW}For help:${NC}"
    echo "  Documentation: docs/"
    echo "  Issues: https://github.com/yourusername/medical-ontology-mcp/issues"
    echo ""
}

# Main execution flow
main() {
    check_prerequisites
    setup_data
    install_dependencies
    preprocess_data
    generate_mcp_config
    start_server
    show_final_instructions
}

# Run main function
main