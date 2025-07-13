# Environment Setup

This document provides instructions for setting up an isolated environment for the Pinecone Vercel Starter project.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 20.x recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- Optional: [Conda](https://docs.conda.io/en/latest/miniconda.html) or [Anaconda](https://www.anaconda.com/products/distribution) for environment isolation

## Setup Instructions

### Option 1: Using Conda (Recommended for isolation)

#### 1. Create the conda environment

```bash
conda env create -f environment.yml
```

#### 2. Activate the environment

```bash
conda activate pinecone-vercel-starter
```

#### 3. Install Node.js dependencies

```bash
npm install
```

### Option 2: Using existing Node.js installation

#### 1. Install Node.js dependencies directly

```bash
npm install
```

## Configuration

### Set up environment variables

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:
- `OPENAI_API_KEY`: Your OpenAI API key
- `PINECONE_API_KEY`: Your Pinecone API key
- `PINECONE_CLOUD`: Your Pinecone cloud provider (e.g., "aws")
- `PINECONE_REGION`: Your Pinecone region (e.g., "us-east-1")
- `PINECONE_INDEX`: Your Pinecone index name

### Install Playwright browsers (for testing)

```bash
npx playwright install
```

## Running the Application

### Development mode

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Production build

```bash
npm run build
npm start
```

### Running tests

```bash
npm run test:e2e
```

## Deactivating the Environment

When you're done working on the project:

```bash
conda deactivate
```

## Updating the Environment

If you need to update the conda environment after changes to `environment.yml`:

```bash
conda env update -f environment.yml
```

## Removing the Environment

To completely remove the conda environment:

```bash
conda env remove -n pinecone-vercel-starter
```