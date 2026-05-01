#!/usr/bin/env bash
set -euo pipefail

DEPLOY_API=false
DEPLOY_UI=false
DEPLOY_REDIS=false

if [ $# -eq 0 ]; then
  DEPLOY_API=true
  DEPLOY_UI=true
  DEPLOY_REDIS=true
else
  for arg in "$@"; do
    case $arg in
      api)         DEPLOY_API=true ;;
      ui)          DEPLOY_UI=true ;;
      customredis) DEPLOY_REDIS=true ;;
      *)
        echo "Usage: ./deploy.sh [api] [ui] [customredis]"
        echo "  No arguments: deploy all"
        exit 1
        ;;
    esac
  done
fi

RESOURCE_GROUP="rg-blog-prod"
CLUSTER_NAME="aks-blog-prod"
VAULT_NAME=$(az keyvault list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv)

cd terraform
ACR_SERVER=$(terraform output -raw acr_login_server)
cd ..

GIT_SHA=$(git rev-parse --short HEAD)

echo "ACR: $ACR_SERVER  |  SHA: $GIT_SHA"
echo "Logging into ACR..."
az acr login --name "${ACR_SERVER%%.*}"

if [ "$DEPLOY_API" = true ]; then
  echo ""
  echo "Building and pushing API..."
  docker build -t "${ACR_SERVER}/blog-api:${GIT_SHA}" -t "${ACR_SERVER}/blog-api:latest" api/
  docker push "${ACR_SERVER}/blog-api:${GIT_SHA}"
  docker push "${ACR_SERVER}/blog-api:latest"
fi

if [ "$DEPLOY_UI" = true ]; then
  echo ""
  echo "Building and pushing UI..."
  docker build \
    --build-arg VITE_API_URL=https://api.brxstrng.com \
    -t "${ACR_SERVER}/blog-ui:${GIT_SHA}" \
    -t "${ACR_SERVER}/blog-ui:latest" \
    ui/
  docker push "${ACR_SERVER}/blog-ui:${GIT_SHA}"
  docker push "${ACR_SERVER}/blog-ui:latest"
fi

if [ "$DEPLOY_REDIS" = true ]; then
  echo ""
  echo "Building and pushing customredis..."
  docker build \
    -t "${ACR_SERVER}/blog-customredis:${GIT_SHA}" \
    -t "${ACR_SERVER}/blog-customredis:latest" \
    customredis/
  docker push "${ACR_SERVER}/blog-customredis:${GIT_SHA}"
  docker push "${ACR_SERVER}/blog-customredis:latest"
fi

echo ""
echo "Getting AKS credentials..."
az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$CLUSTER_NAME" --overwrite-existing

echo "Ensuring namespace, config, and manifests exist..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/customredis/deployment.yaml
kubectl apply -f k8s/customredis/service.yaml
kubectl apply -f k8s/api/deployment.yaml
kubectl apply -f k8s/api/service.yaml
kubectl apply -f k8s/ui/deployment.yaml
kubectl apply -f k8s/ui/service.yaml
kubectl apply -f k8s/ingress.yaml

echo "Syncing secrets from Key Vault to Kubernetes..."
COSMOS_DB_KEY=$(az keyvault secret show --vault-name "$VAULT_NAME" --name cosmos-db-key --query value -o tsv)
GOOGLE_CLIENT_ID=$(az keyvault secret show --vault-name "$VAULT_NAME" --name google-client-id --query value -o tsv)
GOOGLE_CLIENT_SECRET=$(az keyvault secret show --vault-name "$VAULT_NAME" --name google-client-secret --query value -o tsv)
JWT_SECRET=$(az keyvault secret show --vault-name "$VAULT_NAME" --name jwt-secret --query value -o tsv)

kubectl create secret generic blog-secrets \
  --namespace blog \
  --from-literal=COSMOS_DB_KEY="$COSMOS_DB_KEY" \
  --from-literal=GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  --from-literal=GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  --from-literal=JWT_SECRET="$JWT_SECRET" \
  --dry-run=client -o yaml | kubectl apply -f -

if [ "$DEPLOY_REDIS" = true ]; then
  echo ""
  echo "Deploying customredis (${GIT_SHA})..."
  kubectl set image deployment/blog-customredis blog-customredis="${ACR_SERVER}/blog-customredis:${GIT_SHA}" -n blog
  kubectl rollout status deployment/blog-customredis -n blog --timeout=120s
fi

if [ "$DEPLOY_API" = true ]; then
  echo ""
  echo "Deploying API (${GIT_SHA})..."
  kubectl set image deployment/blog-api blog-api="${ACR_SERVER}/blog-api:${GIT_SHA}" -n blog
  kubectl rollout status deployment/blog-api -n blog --timeout=120s
fi

if [ "$DEPLOY_UI" = true ]; then
  echo ""
  echo "Deploying UI (${GIT_SHA})..."
  kubectl set image deployment/blog-ui blog-ui="${ACR_SERVER}/blog-ui:${GIT_SHA}" -n blog
  kubectl rollout status deployment/blog-ui -n blog --timeout=120s
fi

echo ""
echo "Deployment complete!"
echo "  UI:  https://brxstrng.com"
echo "  API: https://api.brxstrng.com"
