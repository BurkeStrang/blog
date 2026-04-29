#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${1:-rg-blog-prod}"
CLUSTER_NAME="${2:-aks-blog-prod}"

echo "Getting AKS credentials..."
az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" --overwrite-existing

echo "Adding Helm repos..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add jetstack https://charts.jetstack.io
helm repo update

NGINX_VERSION="4.10.1"
CERT_MANAGER_VERSION="1.14.5"

echo "Installing nginx ingress controller (${NGINX_VERSION})..."
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --version "$NGINX_VERSION" \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=1 \
  --set controller.service.externalTrafficPolicy=Local \
  --wait

echo "Installing cert-manager (${CERT_MANAGER_VERSION})..."
helm upgrade --install cert-manager jetstack/cert-manager \
  --version "$CERT_MANAGER_VERSION" \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --wait

echo "Applying namespace and config..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml

echo ""
echo "Next steps:"
echo "  1. Get the ingress IP:  kubectl get svc -n ingress-nginx ingress-nginx-controller"
echo "  2. Point brxstrng.com and api.brxstrng.com DNS A records to that IP"
echo "  3. Apply cert-manager ClusterIssuer: kubectl apply -f k8s/cert-manager/cluster-issuer.yaml"
echo "  4. Run ./deploy.sh to deploy the apps"
