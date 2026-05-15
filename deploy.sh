#!/usr/bin/env bash
set -euo pipefail

DEPLOY_API=false
DEPLOY_UI=false

if [ $# -eq 0 ]; then
  DEPLOY_API=true
  DEPLOY_UI=true
else
  for arg in "$@"; do
    case $arg in
      api) DEPLOY_API=true ;;
      ui)  DEPLOY_UI=true ;;
      *)
        echo "Usage: ./deploy.sh [api] [ui]"
        echo "  No arguments: deploy both"
        exit 1
        ;;
    esac
  done
fi

RESOURCE_GROUP="rg-blog-prod"
CONTAINERAPP_NAME="ca-blog-api-prod"

cd terraform
ACR_SERVER=$(terraform output -raw acr_login_server)
SWA_TOKEN=$(terraform output -raw staticwebapp_api_key)
cd ..

GIT_SHA=$(git rev-parse --short HEAD)

echo "ACR: $ACR_SERVER  |  SHA: $GIT_SHA"

if [ "$DEPLOY_API" = true ]; then
  echo ""
  echo "Building and pushing API..."
  az acr login --name "${ACR_SERVER%%.*}"
  docker build -t "${ACR_SERVER}/blog-api:${GIT_SHA}" -t "${ACR_SERVER}/blog-api:latest" api/
  docker push "${ACR_SERVER}/blog-api:${GIT_SHA}"
  docker push "${ACR_SERVER}/blog-api:latest"

  echo ""
  echo "Rolling out API to Container App (${GIT_SHA})..."
  az containerapp update \
    --name "$CONTAINERAPP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --image "${ACR_SERVER}/blog-api:${GIT_SHA}" \
    --query "properties.latestRevisionName" \
    -o tsv
fi

if [ "$DEPLOY_UI" = true ]; then
  echo ""
  echo "Building UI..."
  (cd ui && VITE_API_URL=https://api.brxstrng.com pnpm build)

  echo ""
  echo "Deploying UI to Static Web App..."
  npx -y @azure/static-web-apps-cli@latest deploy ui/dist \
    --deployment-token "$SWA_TOKEN" \
    --env Production
fi

echo ""
echo "Deployment complete!"
echo "  UI:  https://brxstrng.com"
echo "  API: https://api.brxstrng.com"
