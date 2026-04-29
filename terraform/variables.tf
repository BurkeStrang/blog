variable "resource_group_name" {
  description = "Name of the Azure Resource Group"
  type        = string
  default     = "rg-blog-prod"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "East US"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "cosmosdb_account_name" {
  description = "Name of the Cosmos DB account (must be globally unique)"
  type        = string
  # Must be lowercase and unique globally
  validation {
    condition     = can(regex("^[a-z0-9-]{3,44}$", var.cosmosdb_account_name))
    error_message = "Cosmos DB account name must be 3-44 characters, lowercase, numbers, and hyphens only."
  }
}

variable "acr_name" {
  description = "Name of the Azure Container Registry (must be globally unique, alphanumeric only)"
  type        = string
  # Must be alphanumeric only (no hyphens) and globally unique
  validation {
    condition     = can(regex("^[a-zA-Z0-9]{5,50}$", var.acr_name))
    error_message = "ACR name must be 5-50 characters, alphanumeric only (no hyphens or special characters)."
  }
}

variable "acr_sku" {
  description = "SKU for Azure Container Registry (Basic, Standard, or Premium)"
  type        = string
  default     = "Basic"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.acr_sku)
    error_message = "ACR SKU must be Basic, Standard, or Premium."
  }
}

# OAuth and API Configuration
# Note: Secrets are stored in Azure Key Vault and referenced by Container Apps
# - google_client_secret: Optional on first apply, can be updated directly in Key Vault afterward
# - jwt_secret: Auto-generated if not provided, can be updated directly in Key Vault afterward
# To update secrets after deployment: az keyvault secret set --vault-name <vault-name> --name <secret-name> --value <new-value>

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_secret" {
  description = "JWT Secret for token generation"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aks_system_vm_size" {
  description = "VM size for AKS system node pool"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "aks_api_vm_size" {
  description = "VM size for AKS API node pool"
  type        = string
  default     = "Standard_B2s"
}

variable "aks_ui_vm_size" {
  description = "VM size for AKS UI node pool"
  type        = string
  default     = "Standard_B2s"
}
