# Kubernetes Troubleshooting Guide

Common issues and solutions for the Pinecone RAG deployment.

## 🔍 General Debugging Workflow

```bash
# 1. Check overall status
kubectl get all -n pinecone-rag

# 2. Check pod status
kubectl get pods -n pinecone-rag

# 3. Describe problematic resource
kubectl describe pod <pod-name> -n pinecone-rag

# 4. Check logs
kubectl logs <pod-name> -n pinecone-rag

# 5. Check events
kubectl get events -n pinecone-rag --sort-by='.lastTimestamp'

# 6. Exec into pod if running
kubectl exec -it <pod-name> -n pinecone-rag -- /bin/sh
```

---

## 🚨 Common Issues

### Issue 1: Pods Stuck in `Pending` State

**Symptoms:**
```bash
$ kubectl get pods -n pinecone-rag
NAME                              READY   STATUS    RESTARTS   AGE
frontend-xxx                      0/1     Pending   0          5m
```

**Possible Causes:**

#### A. Insufficient Resources

```bash
# Check node resources
kubectl describe nodes | grep -A5 "Allocated resources"

# Check pod resource requests
kubectl describe pod <pod-name> -n pinecone-rag | grep -A5 "Requests"
```

**Solution:** Scale down or adjust resource requests in deployment YAML.

#### B. PVC Not Bound

```bash
# Check PVC status
kubectl get pvc -n pinecone-rag
```

**Solution:**
```bash
# Check if PV exists
kubectl get pv

# Describe PVC for details
kubectl describe pvc pdf-storage -n pinecone-rag

# For local development, ensure storage class exists
kubectl get storageclass

# If using Kind, create PV manually or use local-path provisioner
```

#### C. Image Not Available

```bash
# Check events
kubectl describe pod <pod-name> -n pinecone-rag | tail -20
```

**Solution:**
```bash
# Load image into Kind cluster
kind load docker-image pinecone-rag-app:v2.0 --name pinecone-rag
```

---

### Issue 2: Pods in `ImagePullBackOff` or `ErrImagePull`

**Symptoms:**
```bash
$ kubectl get pods -n pinecone-rag
NAME                              READY   STATUS             RESTARTS   AGE
frontend-xxx                      0/1     ImagePullBackOff   0          5m
```

**Causes:**
- Image doesn't exist locally
- Image not loaded into Kind cluster
- Wrong image name or tag

**Solutions:**

```bash
# Verify Docker image exists
docker images | grep pinecone-rag-app

# If image doesn't exist, build it
docker build -t pinecone-rag-app:v2.0 .

# Load into Kind cluster
kind load docker-image pinecone-rag-app:v2.0 --name pinecone-rag

# Restart deployment
kubectl rollout restart deployment/frontend -n pinecone-rag
```

---

### Issue 3: Pods in `CrashLoopBackOff`

**Symptoms:**
```bash
$ kubectl get pods -n pinecone-rag
NAME                              READY   STATUS             RESTARTS   AGE
autogen-backend-xxx               0/1     CrashLoopBackOff   5          5m
```

**Diagnosis:**

```bash
# Check current logs
kubectl logs <pod-name> -n pinecone-rag

# Check previous container logs
kubectl logs <pod-name> -n pinecone-rag --previous

# Describe pod for events
kubectl describe pod <pod-name> -n pinecone-rag
```

**Common Causes:**

#### A. Missing Environment Variables

```bash
# Check if secrets/configmaps exist
kubectl get secret api-keys -n pinecone-rag
kubectl get configmap app-config -n pinecone-rag

# Verify secret contents (base64 encoded)
kubectl get secret api-keys -n pinecone-rag -o yaml
```

**Solution:**
```bash
# Create missing secrets
kubectl create secret generic api-keys \
  --from-literal=OPENAI_API_KEY=your-key \
  --from-literal=PINECONE_API_KEY=your-key \
  -n pinecone-rag
```

#### B. Application Errors

Check logs for application-specific errors:
- API key validation failures
- Database connection issues
- Port conflicts

---

### Issue 4: Service Not Accessible

**Symptoms:**
- Can't access service via ingress
- Service endpoints empty

**Diagnosis:**

```bash
# Check service
kubectl get svc frontend -n pinecone-rag

# Check endpoints (should show pod IPs)
kubectl get endpoints frontend -n pinecone-rag

# Describe service
kubectl describe svc frontend -n pinecone-rag
```

**Common Causes:**

#### A. Selector Mismatch

```bash
# Check service selector
kubectl get svc frontend -n pinecone-rag -o yaml | grep -A3 selector

# Check pod labels
kubectl get pods -n pinecone-rag --show-labels
```

**Solution:** Ensure service selector matches pod labels exactly.

#### B. Pods Not Ready

```bash
# Check readiness
kubectl get pods -n pinecone-rag -o wide
```

**Solution:** Fix readiness probe or underlying app issues.

---

### Issue 5: Ingress Returns 404

**Symptoms:**
```bash
$ curl http://localhost
<html>
<head><title>404 Not Found</title></head>
<body>
<center><h1>404 Not Found</h1></center>
</body>
</html>
```

**Diagnosis:**

```bash
# Check ingress
kubectl get ingress -n pinecone-rag

# Describe ingress (look for backend status)
kubectl describe ingress main-ingress -n pinecone-rag

# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

**Common Causes:**

#### A. Ingress Controller Not Running

```bash
# Check if ingress controller is installed
kubectl get pods -n ingress-nginx

# If not installed, install it
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for it to be ready
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

#### B. Wrong Service Name or Port

Verify ingress backend configuration:
```bash
kubectl get ingress main-ingress -n pinecone-rag -o yaml
```

#### C. Service Not Ready

```bash
# Test service directly (bypass ingress)
kubectl port-forward svc/frontend 3000:80 -n pinecone-rag

# In browser, visit http://localhost:3000
```

---

### Issue 6: Persistent Volume Claims Pending

**Symptoms:**
```bash
$ kubectl get pvc -n pinecone-rag
NAME           STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
pdf-storage    Pending                                      standard       5m
```

**Diagnosis:**

```bash
# Describe PVC
kubectl describe pvc pdf-storage -n pinecone-rag

# Check storage class
kubectl get storageclass

# Check for available PVs
kubectl get pv
```

**Solutions:**

#### For Kind/Minikube (Local Development):

```bash
# Apply the PV from our manifests
kubectl apply -f k8s/manifests/04-pvc.yaml

# Verify PV is bound
kubectl get pv
kubectl get pvc -n pinecone-rag
```

#### For Cloud Providers:

Usually auto-provisioned, but check:
- Storage class exists
- Sufficient quota
- Cloud provider credentials configured

---

### Issue 7: High Resource Usage

**Symptoms:**
- Pods being evicted
- Cluster running slow

**Diagnosis:**

```bash
# Check node resources
kubectl top nodes

# Check pod resources
kubectl top pods -n pinecone-rag

# Describe node to see resource pressure
kubectl describe node <node-name> | grep -A5 "Conditions\|Allocated"
```

**Solutions:**

```bash
# Scale down replicas
kubectl scale deployment frontend --replicas=1 -n pinecone-rag

# Adjust resource limits
kubectl set resources deployment frontend \
  --limits=cpu=200m,memory=256Mi \
  -n pinecone-rag

# For Kind, you can resize the cluster by recreating it
```

---

### Issue 8: DNS Resolution Issues

**Symptoms:**
- Pods can't communicate with services
- DNS lookups failing

**Diagnosis:**

```bash
# Check CoreDNS
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns

# Test DNS from pod
kubectl run test --image=busybox -it --rm -n pinecone-rag -- /bin/sh
# Inside pod:
nslookup kubernetes.default
nslookup frontend.pinecone-rag.svc.cluster.local
```

**Solution:**

Usually CoreDNS restarts fix it:
```bash
kubectl rollout restart deployment coredns -n kube-system
```

---

### Issue 9: ConfigMap/Secret Changes Not Applied

**Symptoms:**
- Updated ConfigMap but pods still use old values

**Cause:**
Pods don't automatically reload ConfigMaps/Secrets.

**Solutions:**

```bash
# Option 1: Restart deployment
kubectl rollout restart deployment/frontend -n pinecone-rag

# Option 2: Delete pods (deployment recreates them)
kubectl delete pods -l component=frontend -n pinecone-rag

# Option 3: Use a ConfigMap hash in deployment annotations
# (requires updating the deployment template)
```

---

### Issue 10: Port Forwarding Not Working

**Symptoms:**
```bash
$ kubectl port-forward svc/frontend 3000:80 -n pinecone-rag
error: unable to forward port because pod is not running
```

**Solutions:**

```bash
# Check if service has endpoints
kubectl get endpoints frontend -n pinecone-rag

# Check if pods are running
kubectl get pods -n pinecone-rag -l component=frontend

# Try port-forwarding to pod directly
kubectl port-forward <pod-name> 3000:3000 -n pinecone-rag
```

---

## 🛠️ Advanced Debugging

### Get Shell in Failing Container

```bash
# If container keeps crashing, debug with a different image
kubectl debug <pod-name> -n pinecone-rag -it --image=busybox

# Or create debug pod with same volumes
kubectl run debug --image=busybox -it --rm \
  --overrides='{"spec":{"volumes":[{"name":"pdf-storage","persistentVolumeClaim":{"claimName":"pdf-storage"}}],"containers":[{"name":"debug","image":"busybox","volumeMounts":[{"name":"pdf-storage","mountPath":"/data"}]}]}}' \
  -n pinecone-rag
```

### Network Debugging

```bash
# Run network debug pod
kubectl run netshoot --image=nicolaka/netshoot -it --rm -n pinecone-rag -- /bin/bash

# Inside pod, test connectivity:
ping frontend
curl http://frontend
nslookup frontend
```

### Check etcd Health (Advanced)

```bash
# Only if you have access to control plane
kubectl exec -it -n kube-system etcd-<control-plane-node> -- etcdctl endpoint health
```

---

## 📋 Quick Reference

### Pod Status Meanings

| Status | Meaning | Action |
|--------|---------|--------|
| Pending | Waiting to be scheduled | Check resources, PVC, nodes |
| ContainerCreating | Image pull in progress | Wait, or check image availability |
| Running | Pod is running | Check logs if not working |
| CrashLoopBackOff | Container keeps crashing | Check logs, env vars, app code |
| ImagePullBackOff | Can't pull image | Check image name, load to Kind |
| Terminating | Pod being deleted | Wait, or force delete |
| Completed | Job/pod finished | Normal for Jobs |
| Error | Pod failed | Check logs |

### Useful JSON Paths

```bash
# Get pod IPs
kubectl get pods -n pinecone-rag -o jsonpath='{.items[*].status.podIP}'

# Get node names
kubectl get pods -n pinecone-rag -o jsonpath='{.items[*].spec.nodeName}'

# Get container images
kubectl get pods -n pinecone-rag -o jsonpath='{.items[*].spec.containers[*].image}'

# Get restart counts
kubectl get pods -n pinecone-rag -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}'
```

---

## 🆘 Still Stuck?

1. **Check events:** `kubectl get events -n pinecone-rag --sort-by='.lastTimestamp'`
2. **Check logs:** `kubectl logs -f <pod-name> -n pinecone-rag`
3. **Delete and recreate:** Sometimes the easiest solution
4. **Check Kubernetes documentation:** https://kubernetes.io/docs/tasks/debug/
5. **Ask the community:** Kubernetes Slack, Stack Overflow

---

## 🔄 Nuclear Option (Start Fresh)

If all else fails:

```bash
# Delete everything
kubectl delete namespace pinecone-rag

# Or delete and recreate cluster
kind delete cluster --name pinecone-rag
./k8s/local-dev/setup.sh
```

Remember: It's OK to start over when learning! This is why we use local clusters. 🎓
