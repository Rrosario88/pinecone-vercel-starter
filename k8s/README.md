# Kubernetes Deployment for Pinecone RAG Application

Complete Kubernetes manifests for deploying the Pinecone RAG application with AutoGen multi-agent system.

**Perfect for CKA (Certified Kubernetes Administrator) exam preparation!**

## 📁 Structure

```
k8s/
├── manifests/              # Kubernetes resource definitions
│   ├── 01-namespace.yaml          # Namespace for isolation
│   ├── 02-configmap.yaml          # Application configuration
│   ├── 03-secrets-template.yaml   # API keys (template)
│   ├── 04-pvc.yaml                # Persistent storage for PDFs
│   ├── 05-backend-deployment.yaml # AutoGen service
│   ├── 06-frontend-deployment.yaml # Next.js frontend
│   ├── 07-services.yaml           # Service discovery
│   └── 08-ingress.yaml            # External access
├── local-dev/              # Local development setup
│   ├── kind-cluster.yaml   # Kind cluster configuration
│   └── setup.sh            # Automated setup script
├── README.md               # This file
├── CKA-NOTES.md           # CKA exam preparation notes
└── TROUBLESHOOTING.md     # Common issues and solutions
```

## 🚀 Quick Start

### Prerequisites

- **Docker**: Running Docker Desktop
- **kubectl**: Kubernetes CLI tool
- **Kind**: Kubernetes in Docker (for local development)

```bash
# macOS
brew install kubectl kind

# Verify installations
kubectl version --client
kind version
docker ps
```

### Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
./k8s/local-dev/setup.sh
```

This script will:
1. Create a Kind cluster with 3 nodes
2. Install Nginx Ingress Controller
3. Load your Docker images
4. Deploy all Kubernetes resources
5. Wait for everything to be ready

### Option 2: Manual Setup

```bash
# 1. Create Kind cluster
kind create cluster --config=k8s/local-dev/kind-cluster.yaml --name pinecone-rag

# 2. Install Nginx Ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# 3. Load Docker images
kind load docker-image pinecone-rag-app:v2.0 --name pinecone-rag
kind load docker-image autogen-rag-service:v2.0 --name pinecone-rag

# 4. Create secrets with your actual API keys
kubectl create secret generic api-keys \
  --from-literal=OPENAI_API_KEY=your-openai-key \
  --from-literal=PINECONE_API_KEY=your-pinecone-key \
  -n pinecone-rag

# 5. Deploy application
kubectl apply -f k8s/manifests/

# 6. Wait for deployments
kubectl wait --for=condition=available --timeout=180s \
  deployment/frontend deployment/autogen-backend -n pinecone-rag
```

## 🌐 Access Your Application

After deployment:

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api/autogen

## 📊 Monitor Your Deployment

```bash
# Get all resources
kubectl get all -n pinecone-rag

# Watch pods
kubectl get pods -n pinecone-rag -w

# Check pod logs
kubectl logs -f deployment/frontend -n pinecone-rag
kubectl logs -f deployment/autogen-backend -n pinecone-rag

# Describe resources
kubectl describe deployment frontend -n pinecone-rag
kubectl describe svc frontend -n pinecone-rag
kubectl describe ingress main-ingress -n pinecone-rag

# Get events
kubectl get events -n pinecone-rag --sort-by='.lastTimestamp'
```

## 🎓 CKA Exam Practice

This deployment covers **many CKA exam topics**:

### Core Concepts (13%)
- ✅ Namespaces (`01-namespace.yaml`)
- ✅ Pods (in Deployments)
- ✅ Labels and Selectors

### Workloads & Scheduling (15%)
- ✅ Deployments (`05-backend-deployment.yaml`, `06-frontend-deployment.yaml`)
- ✅ Rolling Updates
- ✅ Resource Requests and Limits
- ✅ Health Checks (liveness, readiness, startup probes)

### Services & Networking (20%)
- ✅ Services (`07-services.yaml`)
- ✅ ClusterIP, NodePort types
- ✅ Ingress (`08-ingress.yaml`)
- ✅ NetworkPolicies (exercise: add your own!)

### Storage (10%)
- ✅ PersistentVolumes (`04-pvc.yaml`)
- ✅ PersistentVolumeClaims
- ✅ Volume Mounts

### Configuration (18%)
- ✅ ConfigMaps (`02-configmap.yaml`)
- ✅ Secrets (`03-secrets-template.yaml`)
- ✅ Environment Variables

See `CKA-NOTES.md` for detailed practice exercises!

## 🔧 Common kubectl Commands

```bash
# Switch context to use pinecone-rag namespace by default
kubectl config set-context --current --namespace=pinecone-rag

# Scale deployments
kubectl scale deployment frontend --replicas=3

# Update image (rolling update)
kubectl set image deployment/frontend frontend=pinecone-rag-app:v2.1

# Check rollout status
kubectl rollout status deployment/frontend

# Rollback deployment
kubectl rollout undo deployment/frontend

# Port forwarding (access without ingress)
kubectl port-forward svc/frontend 3000:80

# Execute commands in pod
kubectl exec -it deployment/frontend -- /bin/sh

# Copy files to/from pod
kubectl cp ./local-file.txt deployment/frontend:/tmp/file.txt

# Get resource usage
kubectl top nodes
kubectl top pods -n pinecone-rag

# Debug with temporary pod
kubectl run debug --image=busybox -it --rm -- /bin/sh
```

## 🧹 Cleanup

```bash
# Delete all resources
kubectl delete -f k8s/manifests/

# Or delete namespace (deletes everything in it)
kubectl delete namespace pinecone-rag

# Delete Kind cluster
kind delete cluster --name pinecone-rag
```

## 📚 Learn More

- **CKA Exam**: See `CKA-NOTES.md` for exam-specific guidance
- **Troubleshooting**: See `TROUBLESHOOTING.md` for common issues
- **Kubernetes Docs**: https://kubernetes.io/docs/home/

## 🎯 Next Steps for CKA

1. ✅ Deploy this application locally
2. ✅ Practice all kubectl commands above
3. ✅ Work through exercises in `CKA-NOTES.md`
4. ✅ Try breaking things and fixing them
5. ✅ Add NetworkPolicies for security
6. ✅ Implement RBAC (Role-Based Access Control)
7. ✅ Practice backups with etcd
8. ✅ Simulate node failures

## 🤝 Contributing

Found an issue? Want to add more CKA-relevant examples? Feel free to improve these manifests!

## 📄 License

Same as the main project.
