#!/bin/bash
# Local Kubernetes Development Setup Script
# Sets up Kind cluster with all necessary components for CKA practice

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================"
echo "Pinecone RAG - Kubernetes Setup"
echo "Local Development Environment"
echo -e "======================================${NC}\n"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v kind &> /dev/null; then
    echo -e "${RED}Error: kind not installed${NC}"
    echo "Install with: brew install kind (macOS) or visit https://kind.sigs.k8s.io/"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl not installed${NC}"
    echo "Install with: brew install kubectl (macOS)"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker not running${NC}"
    echo "Start Docker Desktop and try again"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}\n"

# Create Kind cluster
echo -e "${YELLOW}Creating Kind cluster...${NC}"
if kind get clusters | grep -q "pinecone-rag"; then
    echo "Cluster 'pinecone-rag' already exists"
    read -p "Delete and recreate? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kind delete cluster --name pinecone-rag
        kind create cluster --config=k8s/local-dev/kind-cluster.yaml --name pinecone-rag
    fi
else
    kind create cluster --config=k8s/local-dev/kind-cluster.yaml --name pinecone-rag
fi

echo -e "${GREEN}✓ Cluster created${NC}\n"

# Wait for cluster to be ready
echo -e "${YELLOW}Waiting for cluster to be ready...${NC}"
kubectl wait --for=condition=Ready nodes --all --timeout=120s

# Install Nginx Ingress Controller
echo -e "${YELLOW}Installing Nginx Ingress Controller...${NC}"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

echo -e "${YELLOW}Waiting for ingress controller to be ready...${NC}"
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s

echo -e "${GREEN}✓ Ingress controller ready${NC}\n"

# Load Docker images into Kind cluster
echo -e "${YELLOW}Loading Docker images into cluster...${NC}"
if docker images | grep -q "pinecone-rag-app.*v2.0"; then
    kind load docker-image pinecone-rag-app:v2.0 --name pinecone-rag
    echo -e "${GREEN}✓ Loaded frontend image${NC}"
else
    echo -e "${YELLOW}! Frontend image not found. Build with: docker build -t pinecone-rag-app:v2.0 .${NC}"
fi

if docker images | grep -q "autogen-rag-service.*v2.0"; then
    kind load docker-image autogen-rag-service:v2.0 --name pinecone-rag
    echo -e "${GREEN}✓ Loaded backend image${NC}"
else
    echo -e "${YELLOW}! Backend image not found. Build with: cd python-service && docker build -t autogen-rag-service:v2.0 .${NC}"
fi

echo

# Create namespace
echo -e "${YELLOW}Creating namespace...${NC}"
kubectl apply -f k8s/manifests/01-namespace.yaml

# Create secrets (you'll need to edit these!)
echo -e "${YELLOW}Setting up configuration...${NC}"
echo -e "${RED}IMPORTANT: You need to create secrets with your API keys!${NC}"
echo "Run this command with your actual keys:"
echo ""
echo "kubectl create secret generic api-keys \\"
echo "  --from-literal=OPENAI_API_KEY=your-key-here \\"
echo "  --from-literal=PINECONE_API_KEY=your-key-here \\"
echo "  -n pinecone-rag"
echo ""
read -p "Press enter to continue (secrets will be created with placeholder values for now)..."

kubectl apply -f k8s/manifests/02-configmap.yaml
kubectl apply -f k8s/manifests/03-secrets-template.yaml

echo -e "${GREEN}✓ Configuration created${NC}\n"

# Deploy application
echo -e "${YELLOW}Deploying application...${NC}"
kubectl apply -f k8s/manifests/04-pvc.yaml
kubectl apply -f k8s/manifests/05-backend-deployment.yaml
kubectl apply -f k8s/manifests/06-frontend-deployment.yaml
kubectl apply -f k8s/manifests/07-services.yaml
kubectl apply -f k8s/manifests/08-ingress.yaml

echo -e "${GREEN}✓ Application deployed${NC}\n"

# Wait for deployments
echo -e "${YELLOW}Waiting for deployments to be ready...${NC}"
kubectl wait --for=condition=available --timeout=180s \
  deployment/frontend deployment/autogen-backend -n pinecone-rag

echo -e "${GREEN}✓ Deployments ready${NC}\n"

# Show status
echo -e "${GREEN}======================================"
echo "Setup Complete!"
echo -e "======================================${NC}\n"

echo "Cluster Info:"
kubectl cluster-info --context kind-pinecone-rag

echo -e "\nNamespace Resources:"
kubectl get all -n pinecone-rag

echo -e "\n${GREEN}Access your application:${NC}"
echo "  Frontend: http://localhost"
echo "  Backend:  http://localhost/api/autogen"

echo -e "\n${GREEN}Useful Commands:${NC}"
echo "  kubectl get pods -n pinecone-rag"
echo "  kubectl logs -f deployment/frontend -n pinecone-rag"
echo "  kubectl exec -it deployment/frontend -n pinecone-rag -- /bin/sh"
echo "  kubectl port-forward svc/frontend 3000:80 -n pinecone-rag"

echo -e "\n${GREEN}CKA Practice:${NC}"
echo "  See k8s/CKA-NOTES.md for practice exercises"

echo -e "\n${YELLOW}Don't forget to add your API keys to secrets!${NC}"
