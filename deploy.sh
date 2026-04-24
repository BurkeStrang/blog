#!/bin/bash
set -e

# Parse arguments
DEPLOY_API=false
DEPLOY_UI=false

if [ $# -eq 0 ]; then
  # No arguments - deploy both
  DEPLOY_API=true
  DEPLOY_UI=true
else
  # Parse arguments
  for arg in "$@"; do
    case $arg in
      api)
        DEPLOY_API=true
        ;;
      ui)
        DEPLOY_UI=true
        ;;
      *)
        echo "Usage: ./deploy.sh [api] [ui]"
        echo "  No arguments: Deploy both API and UI"
        echo "  api: Deploy only API"
        echo "  ui: Deploy only UI"
        echo "  api ui: Deploy both"
        exit 1
        ;;
    esac
  done
fi

# Get ACR login server from Terraform
cd terraform
ACR_SERVER=$(terraform output -raw acr_login_server)
cd ..

echo "🔐 Logging into Azure Container Registry: $ACR_SERVER"
az acr login --name ${ACR_SERVER%%.*}

if [ "$DEPLOY_API" = true ]; then
  echo ""
  echo "🏗️  Building and pushing API Docker image..."
  cd api
  docker build  -t ${ACR_SERVER}/blog-api:latest .
  docker push ${ACR_SERVER}/blog-api:latest
  cd ..
fi

if [ "$DEPLOY_UI" = true ]; then
  echo ""
  echo "🏗️  Building and pushing UI Docker image..."
  cd ui
  docker build --build-arg VITE_API_URL=https://api.brxstrng.com -t ${ACR_SERVER}/blog-ui:latest .
  docker push ${ACR_SERVER}/blog-ui:latest
  cd ..
fi

echo ""
echo "✅ Docker images built and pushed successfully!"
echo ""
echo "🚀 Deploying to Azure Container Apps..."

# Get timestamp for forcing new revisions
TIMESTAMP=$(date +%s)

if [ "$DEPLOY_API" = true ]; then
  echo "Deploying API with revision suffix: ${TIMESTAMP}"
  az containerapp update \
    --name blog-api \
    --resource-group rg-blog-prod \
    --image ${ACR_SERVER}/blog-api:latest \
    --revision-suffix "deploy-${TIMESTAMP}"
fi

if [ "$DEPLOY_UI" = true ]; then
  echo "Deploying UI with revision suffix: ${TIMESTAMP}"
  az containerapp update \
    --name blog-ui \
    --resource-group rg-blog-prod \
    --image ${ACR_SERVER}/blog-ui:latest \
    --revision-suffix "deploy-${TIMESTAMP}"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Container App URLs:"
cd terraform
echo "  API: $(terraform output -raw api_url)"
echo "  UI:  $(terraform output -raw ui_url)"
cd ..
