#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${1:-rg-blog-prod}"
CLUSTER_NAME="${2:-aks-blog-prod}"

NGINX_VERSION="4.15.1"
CERT_MANAGER_VERSION="1.20.2"

echo "Getting AKS credentials..."
az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" --overwrite-existing

echo "Updating Helm repos..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
helm repo add jetstack https://charts.jetstack.io 2>/dev/null || true
helm repo update

echo "Upgrading nginx ingress controller (${NGINX_VERSION})..."
helm upgrade ingress-nginx ingress-nginx/ingress-nginx \
  --version "$NGINX_VERSION" \
  --namespace ingress-nginx \
  --set controller.replicaCount=1 \
  --set controller.service.externalTrafficPolicy=Local \
  --wait

echo "Upgrading cert-manager (${CERT_MANAGER_VERSION})..."
helm upgrade cert-manager jetstack/cert-manager \
  --version "$CERT_MANAGER_VERSION" \
  --namespace cert-manager \
  --set installCRDs=true \
  --wait

echo ""
echo "Done. Run ./deploy.sh to redeploy the apps if needed."
