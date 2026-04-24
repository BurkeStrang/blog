# Copy this file to terraform.tfvars and update with your values

# Resource Group and Location
resource_group_name = "rg-blog-prod"
location            = "East US"
environment         = "prod"

# Cosmos DB Account Name (must be globally unique)
# Use your initials or company name to make it unique
cosmosdb_account_name = "cosmos-blog-brxstng-prod"

# Azure Container Registry Name (must be globally unique, alphanumeric only)
# No hyphens allowed in ACR names
acr_name = "acrblogbrxstngprod"
acr_sku  = "Basic" # Options: Basic, Standard, Premium

# OAuth and JWT secrets are fetched from Azure Key Vault via tf.sh — do not set here.
