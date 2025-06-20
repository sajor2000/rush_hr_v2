#!/bin/bash

# Start the Medical Ontology API Server

echo "Medical Ontology API Server"
echo "=========================="
echo ""

# Check if data is prepared
if [ ! -d "data/snomed" ] || [ ! -d "data/icd10" ] || [ ! -d "data/rxnorm" ] || [ ! -d "data/loinc" ]; then
    echo "Data not found. Running data preparation..."
    python3 setup/prepare_data.py
    
    if [ $? -ne 0 ]; then
        echo "Error preparing data. Please check your data source."
        exit 1
    fi
fi

# Start the server
echo ""
echo "Starting server..."
echo "This may take a few minutes to load all ontologies..."
echo ""

python3 src/simple_server.py