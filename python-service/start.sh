#!/bin/bash

# Start script for AutoGen service

echo "Starting AutoGen RAG Service..."

# Ensure environment variables are set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "ERROR: OPENAI_API_KEY environment variable is not set"
    exit 1
fi

if [ -z "$PINECONE_API_KEY" ]; then
    echo "ERROR: PINECONE_API_KEY environment variable is not set"
    exit 1
fi

if [ -z "$PINECONE_INDEX" ]; then
    echo "ERROR: PINECONE_INDEX environment variable is not set"
    exit 1
fi

# Install dependencies if requirements.txt is newer
if [ "requirements.txt" -nt ".requirements_installed" ]; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
    touch .requirements_installed
fi

# Start the FastAPI server
echo "Starting FastAPI server on port ${PORT:-8000}..."
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --reload