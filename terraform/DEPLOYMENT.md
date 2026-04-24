# Deployment Guide - Azure Container Apps

This guide walks you through deploying your blog application (API + UI) to Azure using Terraform and Azure Container Apps.

## Overview

The infrastructure includes:
- **Azure Container Registry (ACR)**: Stores Docker images for API and UI
- **Azure Cosmos DB**: NoSQL database (already deployed)
- **Azure Container Apps**: Hosts the API and UI containers
- **Log Analytics**: Monitoring and logging for Container Apps

## Prerequisites

1. **Azure CLI** installed and authenticated
   ```bash
   az login
   az account show  # Verify you're using the correct subscription
   ```

2. **Terraform** installed (v1.0+)
   ```bash
   terraform --version
   ```

3. **Docker** installed for building images
   ```bash
   docker --version
   ```

4. **Go 1.24+** and **Node.js** for building applications

## Step 1: Configure Terraform Variables

1. Copy the example variables file:
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your values:
   ```hcl
   # Update these to be globally unique
   cosmosdb_account_name = "cosmos-blog-yourname-prod"
   acr_name = "acrblogyournameprod"  # No hyphens!

   # OAuth secrets (optional, but recommended)
   google_client_id     = "your-client-id.apps.googleusercontent.com"
   google_client_secret = "your-client-secret"
   jwt_secret           = "your-random-jwt-secret"  # Generate: openssl rand -base64 32
   ```

3. **Important**: Add `terraform.tfvars` to `.gitignore` (contains secrets!)

## Step 2: Deploy Infrastructure

1. Initialize Terraform:
   ```bash
   cd terraform
   terraform init
   ```

2. Review the deployment plan:
   ```bash
   terraform plan
   ```

3. Deploy the infrastructure:
   ```bash
   terraform apply
   ```
   Type `yes` to confirm. This will create:
   - Resource Group
   - Cosmos DB (if not already exists)
   - Container Registry
   - Log Analytics Workspace
   - Container Apps Environment
   - Container Apps for API and UI (with placeholder images)

4. Save the outputs:
   ```bash
   terraform output > outputs.txt
   terraform output -raw acr_admin_password > acr_password.txt  # Keep secure!
   ```

## Step 3: Build and Push Docker Images

### Build API Image

```bash
cd ../api

# Login to ACR
ACR_NAME=$(cd ../terraform && terraform output -raw acr_name)
ACR_LOGIN_SERVER=$(cd ../terraform && terraform output -raw acr_login_server)
ACR_PASSWORD=$(cd ../terraform && terraform output -raw acr_admin_password)

echo $ACR_PASSWORD | docker login $ACR_LOGIN_SERVER -u $ACR_NAME --password-stdin

# Build and push API
docker build -t $ACR_LOGIN_SERVER/blog-api:latest .
docker push $ACR_LOGIN_SERVER/blog-api:latest
```

### Build UI Image

```bash
cd ../ui

# Install dependencies and build
pnpm install
pnpm build

# Build and push UI
docker build -t $ACR_LOGIN_SERVER/blog-ui:latest .
docker push $ACR_LOGIN_SERVER/blog-ui:latest
```

## Step 4: Deploy Container Apps

After pushing images, trigger a new revision:

```bash
cd ../terraform

# Get resource group and app names
RG_NAME=$(terraform output -raw resource_group_name)

# Update API container app (pulls latest image)
az containerapp update \
  --name blog-api \
  --resource-group $RG_NAME \
  --image $(terraform output -raw acr_login_server)/blog-api:latest

# Update UI container app
az containerapp update \
  --name blog-ui \
  --resource-group $RG_NAME \
  --image $(terraform output -raw acr_login_server)/blog-ui:latest
```

## Step 5: Verify Deployment

1. Get your application URLs:
   ```bash
   terraform output api_url
   terraform output ui_url
   ```

2. Test the API:
   ```bash
   API_URL=$(terraform output -raw api_url)
   curl $API_URL/health  # Should return health status
   ```

3. Open the UI in your browser:
   ```bash
   UI_URL=$(terraform output -raw ui_url)
   echo "Visit: $UI_URL"
   ```

## Step 6: Configure Custom Domain (Optional)

To use a custom domain:

```bash
# Add custom domain to UI
az containerapp hostname add \
  --name blog-ui \
  --resource-group $RG_NAME \
  --hostname yourdomain.com

# Bind certificate (requires managed certificate or uploaded cert)
az containerapp hostname bind \
  --name blog-ui \
  --resource-group $RG_NAME \
  --hostname yourdomain.com \
  --environment blog-env \
  --validation-method CNAME
```

## Continuous Deployment

### Option 1: GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build and push API
        run: |
          cd api
          docker build -t ${{ secrets.ACR_LOGIN_SERVER }}/blog-api:${{ github.sha }} .
          docker push ${{ secrets.ACR_LOGIN_SERVER }}/blog-api:${{ github.sha }}

      - name: Build and push UI
        run: |
          cd ui
          docker build -t ${{ secrets.ACR_LOGIN_SERVER }}/blog-ui:${{ github.sha }} .
          docker push ${{ secrets.ACR_LOGIN_SERVER }}/blog-ui:${{ github.sha }}

      - name: Deploy to Container Apps
        run: |
          az containerapp update --name blog-api --resource-group ${{ secrets.RESOURCE_GROUP }} --image ${{ secrets.ACR_LOGIN_SERVER }}/blog-api:${{ github.sha }}
          az containerapp update --name blog-ui --resource-group ${{ secrets.RESOURCE_GROUP }} --image ${{ secrets.ACR_LOGIN_SERVER }}/blog-ui:${{ github.sha }}
```

### Option 2: Manual Script

Create `deploy.sh`:

```bash
#!/bin/bash
set -e

cd terraform
ACR_LOGIN_SERVER=$(terraform output -raw acr_login_server)
ACR_NAME=$(terraform output -raw acr_name)
ACR_PASSWORD=$(terraform output -raw acr_admin_password)
RG_NAME=$(terraform output -raw resource_group_name)
cd ..

# Login
echo $ACR_PASSWORD | docker login $ACR_LOGIN_SERVER -u $ACR_NAME --password-stdin

# Build and push
docker build -t $ACR_LOGIN_SERVER/blog-api:latest ./api
docker push $ACR_LOGIN_SERVER/blog-api:latest

docker build -t $ACR_LOGIN_SERVER/blog-ui:latest ./ui
docker push $ACR_LOGIN_SERVER/blog-ui:latest

# Update apps
az containerapp update --name blog-api --resource-group $RG_NAME --image $ACR_LOGIN_SERVER/blog-api:latest
az containerapp update --name blog-ui --resource-group $RG_NAME --image $ACR_LOGIN_SERVER/blog-ui:latest

echo "Deployment complete!"
```

Make it executable: `chmod +x deploy.sh`

## Monitoring and Logs

### View Container Logs

```bash
# API logs
az containerapp logs show \
  --name blog-api \
  --resource-group $RG_NAME \
  --follow

# UI logs
az containerapp logs show \
  --name blog-ui \
  --resource-group $RG_NAME \
  --follow
```

### View in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Resource Group
3. Click on Container Apps
4. View metrics, logs, and revisions

## Scaling

Container Apps auto-scale based on HTTP traffic. Configuration is in `terraform/main.tf`:

```hcl
min_replicas = 0  # Scale to zero when idle
max_replicas = 3  # Max instances under load
```

To adjust:
1. Edit `main.tf`
2. Run `terraform apply`

## Troubleshooting

### Container App won't start
```bash
# Check logs
az containerapp logs show --name blog-api --resource-group $RG_NAME --tail 100

# Check revision status
az containerapp revision list --name blog-api --resource-group $RG_NAME -o table
```

### Image pull errors
```bash
# Verify ACR credentials
az acr login --name $ACR_NAME

# Check if image exists
az acr repository show-tags --name $ACR_NAME --repository blog-api
```

### Environment variables not set
```bash
# Update environment variables
az containerapp update \
  --name blog-api \
  --resource-group $RG_NAME \
  --set-env-vars "NEW_VAR=value"
```

## Cost Optimization

- **Free tier**: Cosmos DB uses free tier (400 RU/s)
- **Scale to zero**: Container Apps scale to 0 when idle
- **Basic ACR**: Use Basic tier ($5/month) for small projects
- **Log retention**: Set to 30 days (configurable in `main.tf`)

**Estimated monthly cost**: $15-30 for typical usage

## Cleanup

To destroy all resources:

```bash
cd terraform
terraform destroy
```

Type `yes` to confirm. This will delete all Azure resources.

## Security Best Practices

1. **Never commit secrets**: Add `terraform.tfvars` and `*.tfstate` to `.gitignore`
2. **Use Azure Key Vault**: For production, store secrets in Key Vault
3. **Enable HTTPS only**: Container Apps use HTTPS by default
4. **Restrict CORS**: Configure CORS in API to only allow your UI domain
5. **Use managed identities**: Avoid storing ACR passwords in Container Apps

## Next Steps

- [ ] Set up custom domain and SSL certificate
- [ ] Configure Azure Front Door for CDN
- [ ] Enable Application Insights for advanced monitoring
- [ ] Set up automated backups for Cosmos DB
- [ ] Implement CI/CD with GitHub Actions
- [ ] Configure alerts for errors and high usage
