# CKA Exam Preparation Notes

Practical exercises and exam tips using this Pinecone RAG deployment.

## 📋 CKA Exam Domains

| Domain | Weight | Covered Here |
|--------|--------|--------------|
| Cluster Architecture, Installation & Configuration | 25% | ⚠️ Partial |
| Workloads & Scheduling | 15% | ✅ Full |
| Services & Networking | 20% | ✅ Full |
| Storage | 10% | ✅ Full |
| Troubleshooting | 30% | ✅ Full |

## 🎯 Practice Exercises

### Exercise 1: Deployments & Scaling

**Task:** Scale the frontend to 5 replicas and verify.

```bash
# Scale deployment
kubectl scale deployment frontend --replicas=5 -n pinecone-rag

# Verify
kubectl get deployment frontend -n pinecone-rag
kubectl get pods -n pinecone-rag -l component=frontend

# Watch rolling scale
kubectl get pods -n pinecone-rag -w
```

**Expected Result:** 5 frontend pods running

---

### Exercise 2: Rolling Updates

**Task:** Update the frontend image to a new version and rollback if needed.

```bash
# Record the change
kubectl set image deployment/frontend \
  frontend=pinecone-rag-app:v2.1 \
  --record -n pinecone-rag

# Watch rollout
kubectl rollout status deployment/frontend -n pinecone-rag

# Check history
kubectl rollout history deployment/frontend -n pinecone-rag

# Rollback if needed
kubectl rollout undo deployment/frontend -n pinecone-rag

# Rollback to specific revision
kubectl rollout undo deployment/frontend --to-revision=1 -n pinecone-rag
```

---

### Exercise 3: ConfigMap & Secret Updates

**Task:** Update configuration and restart pods to pick up changes.

```bash
# Edit ConfigMap
kubectl edit configmap app-config -n pinecone-rag

# Restart deployment to pick up changes
kubectl rollout restart deployment/frontend -n pinecone-rag

# Alternative: Delete pods (deployment recreates them)
kubectl delete pods -l component=frontend -n pinecone-rag

# Update secret
kubectl create secret generic api-keys \
  --from-literal=OPENAI_API_KEY=new-key \
  --from-literal=PINECONE_API_KEY=new-key \
  -n pinecone-rag \
  --dry-run=client -o yaml | kubectl apply -f -
```

---

### Exercise 4: Troubleshooting Pods

**Task:** Diagnose and fix pod issues.

```bash
# Get pod status
kubectl get pods -n pinecone-rag

# Describe pod (shows events)
kubectl describe pod <pod-name> -n pinecone-rag

# Check logs
kubectl logs <pod-name> -n pinecone-rag
kubectl logs <pod-name> -n pinecone-rag --previous  # Previous container

# Check events
kubectl get events -n pinecone-rag --sort-by='.lastTimestamp'

# Execute commands in pod
kubectl exec -it <pod-name> -n pinecone-rag -- /bin/sh

# Debug with temporary pod
kubectl run debug --image=busybox -it --rm -n pinecone-rag -- /bin/sh
```

---

### Exercise 5: Service Discovery

**Task:** Verify service endpoints and DNS resolution.

```bash
# Get services
kubectl get svc -n pinecone-rag

# Get endpoints (pods backing the service)
kubectl get endpoints -n pinecone-rag

# Describe service
kubectl describe svc frontend -n pinecone-rag

# Test DNS from within cluster
kubectl run test --image=busybox -it --rm -n pinecone-rag -- /bin/sh
# Inside the pod:
nslookup frontend
nslookup autogen-service
nslookup frontend.pinecone-rag.svc.cluster.local
wget -O- http://frontend
```

---

### Exercise 6: Resource Limits

**Task:** Modify resource requests and limits.

```bash
# View current resources
kubectl describe deployment frontend -n pinecone-rag | grep -A5 "Limits\\|Requests"

# Edit deployment to change resources
kubectl edit deployment frontend -n pinecone-rag

# Alternative: kubectl set resources
kubectl set resources deployment frontend \
  --requests=cpu=200m,memory=512Mi \
  --limits=cpu=500m,memory=1Gi \
  -n pinecone-rag
```

---

### Exercise 7: Persistent Volumes

**Task:** Inspect and resize PVC (if supported by storage class).

```bash
# Get PVC
kubectl get pvc -n pinecone-rag

# Describe PVC
kubectl describe pvc pdf-storage -n pinecone-rag

# Get PV
kubectl get pv

# See which pod uses the PVC
kubectl get pods -n pinecone-rag -o json | \
  jq '.items[] | select(.spec.volumes[]?.persistentVolumeClaim.claimName=="pdf-storage") | .metadata.name'

# Exec into pod and check mount
kubectl exec -it deployment/frontend -n pinecone-rag -- df -h
kubectl exec -it deployment/frontend -n pinecone-rag -- ls -la /app/data/uploads
```

---

### Exercise 8: Labels & Selectors

**Task:** Use labels to organize and query resources.

```bash
# Get pods by label
kubectl get pods -n pinecone-rag -l app=pinecone-rag
kubectl get pods -n pinecone-rag -l component=frontend
kubectl get pods -n pinecone-rag -l component=backend

# Show labels
kubectl get pods -n pinecone-rag --show-labels

# Add label to pod
kubectl label pod <pod-name> environment=dev -n pinecone-rag

# Remove label
kubectl label pod <pod-name> environment- -n pinecone-rag

# Get resources with specific label value
kubectl get all -n pinecone-rag -l component=frontend
```

---

### Exercise 9: Ingress Debugging

**Task:** Troubleshoot ingress issues.

```bash
# Get ingress
kubectl get ingress -n pinecone-rag

# Describe ingress (shows backend status)
kubectl describe ingress main-ingress -n pinecone-rag

# Check ingress controller pods
kubectl get pods -n ingress-nginx

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Test service directly (bypass ingress)
kubectl port-forward svc/frontend 3000:80 -n pinecone-rag
```

---

### Exercise 10: Node Management

**Task:** Practice node operations (safe in local cluster).

```bash
# Get nodes
kubectl get nodes

# Describe node
kubectl describe node <node-name>

# Drain node (evict pods safely)
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Cordon node (mark unschedulable)
kubectl cordon <node-name>

# Uncordon node
kubectl uncordon <node-name>

# Get resource usage
kubectl top nodes
kubectl top pods -n pinecone-rag
```

---

## 🎓 CKA Exam Tips

### Time Management
- 2 hours for 15-20 questions
- ~6-8 minutes per question
- Flag difficult questions and return later
- Use imperative commands for speed

### kubectl Shortcuts

```bash
# Aliases (add to ~/.bashrc or ~/.zshrc)
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get svc'
alias kgd='kubectl get deployments'
alias kdp='kubectl describe pod'
alias kl='kubectl logs'
alias ke='kubectl exec -it'

# Use command completion
source <(kubectl completion bash)  # or zsh
```

### Imperative Commands (Faster than YAML!)

```bash
# Create pod
kubectl run nginx --image=nginx

# Create deployment
kubectl create deployment nginx --image=nginx --replicas=3

# Expose deployment
kubectl expose deployment nginx --port=80 --target-port=80 --type=ClusterIP

# Create configmap
kubectl create configmap app-config --from-literal=key=value

# Create secret
kubectl create secret generic api-key --from-literal=API_KEY=secret

# Generate YAML (dry-run)
kubectl create deployment nginx --image=nginx --dry-run=client -o yaml > deployment.yaml
```

### YAML Tricks

```bash
# Generate YAML from running resource
kubectl get deployment frontend -n pinecone-rag -o yaml > frontend.yaml

# Extract just the spec
kubectl get deployment frontend -n pinecone-rag -o jsonpath='{.spec}' | jq

# Quick edit
kubectl edit deployment frontend -n pinecone-rag

# Apply with force replace
kubectl replace --force -f deployment.yaml
```

### Documentation During Exam

You can access these during the exam:
- https://kubernetes.io/docs/
- https://kubernetes.io/blog/

**Bookmarks to prepare:**
- kubectl cheat sheet
- Pod spec reference
- Service networking
- PersistentVolume examples

### Common Mistakes to Avoid

1. ❌ Forgetting `-n namespace`
2. ❌ Wrong indentation in YAML (use spaces, not tabs!)
3. ❌ Not checking resource status after changes
4. ❌ Editing live resources without backup
5. ❌ Using wrong API version

### Exam Simulation

Practice these scenarios:

1. **Pod won't start** - Check image, resources, secrets
2. **Service not working** - Verify selector matches pod labels
3. **PVC pending** - Check storage class, PV availability
4. **Ingress 404** - Verify ingress controller, service names
5. **Resource exhaustion** - Check requests/limits, node resources

---

## 📚 Study Resources

### Official Documentation
- [Kubernetes Docs](https://kubernetes.io/docs/home/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [CKA Exam Curriculum](https://github.com/cncf/curriculum)

### Practice Platforms
- [Killer.sh](https://killer.sh) - CKA exam simulator (2 free sessions)
- [KodeKloud](https://kodekloud.com/) - Hands-on labs
- [Play with Kubernetes](https://labs.play-with-k8s.com/)

### Books
- "Kubernetes Up & Running" by Kelsey Hightower
- "Kubernetes in Action" by Marko Lukša

---

## ✅ Pre-Exam Checklist

- [ ] Can create/delete pods, deployments, services
- [ ] Understand labels and selectors
- [ ] Know how to scale deployments
- [ ] Can perform rolling updates and rollbacks
- [ ] Understand ConfigMaps and Secrets
- [ ] Know how to troubleshoot pod issues
- [ ] Understand PV/PVC binding
- [ ] Can configure services (ClusterIP, NodePort, LoadBalancer)
- [ ] Understand Ingress configuration
- [ ] Can drain/cordon nodes
- [ ] Know how to back up etcd
- [ ] Understand RBAC basics
- [ ] Can use kubectl efficiently with shortcuts

---

## 🎯 Final Tips

1. **Practice, practice, practice** - Use this repo daily
2. **Time yourself** - Simulate exam conditions
3. **Use imperative commands** - Faster than writing YAML
4. **Read questions carefully** - Note the exact requirements
5. **Verify your work** - Always check with `kubectl get/describe`
6. **Know the docs** - Practice navigating kubernetes.io quickly
7. **Stay calm** - You can flag and return to difficult questions

**Good luck with your CKA exam!** 🚀
