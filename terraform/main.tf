terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Get current Azure client configuration for tenant ID
data "azurerm_client_config" "current" {}

# Resource Group
resource "azurerm_resource_group" "blog" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }
}

# Cosmos DB Account
resource "azurerm_cosmosdb_account" "blog" {
  name                = var.cosmosdb_account_name
  location            = azurerm_resource_group.blog.location
  resource_group_name = azurerm_resource_group.blog.name
  offer_type          = "Standard"
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }

  geo_location {
    location          = azurerm_resource_group.blog.location
    failover_priority = 0
  }

  # Enable free tier (400 RU/s and 5GB storage)
  free_tier_enabled = true

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }
}

# Cosmos DB SQL Database
resource "azurerm_cosmosdb_sql_database" "blog" {
  name                = "blog"
  resource_group_name = azurerm_resource_group.blog.name
  account_name        = azurerm_cosmosdb_account.blog.name
}

# Container for Posts
resource "azurerm_cosmosdb_sql_container" "posts" {
  name                  = "posts"
  resource_group_name   = azurerm_resource_group.blog.name
  account_name          = azurerm_cosmosdb_account.blog.name
  database_name         = azurerm_cosmosdb_sql_database.blog.name
  partition_key_paths   = ["/type"]
  partition_key_version = 1
  throughput            = 400

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

  }

  unique_key {
    paths = ["/slug"]
  }
}

# Container for Comments
resource "azurerm_cosmosdb_sql_container" "comments" {
  name                  = "comments"
  resource_group_name   = azurerm_resource_group.blog.name
  account_name          = azurerm_cosmosdb_account.blog.name
  database_name         = azurerm_cosmosdb_sql_database.blog.name
  partition_key_paths   = ["/postId"]
  partition_key_version = 1
  throughput            = 400

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }

    composite_index {
      index {
        path  = "/likeCount"
        order = "descending"
      }
      index {
        path  = "/createdAt"
        order = "descending"
      }
    }

    composite_index {
      index {
        path  = "/likeCount"
        order = "descending"
      }
      index {
        path  = "/createdAt"
        order = "ascending"
      }
    }
  }
}

# Container for Users (preferences, notifications, etc.)
resource "azurerm_cosmosdb_sql_container" "users" {
  name                  = "users"
  resource_group_name   = azurerm_resource_group.blog.name
  account_name          = azurerm_cosmosdb_account.blog.name
  database_name         = azurerm_cosmosdb_sql_database.blog.name
  partition_key_paths   = ["/username"]
  partition_key_version = 1
  throughput            = 400

  indexing_policy {
    indexing_mode = "consistent"

    included_path {
      path = "/*"
    }
  }
}

# Random password generator for JWT secret
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# Azure Key Vault for secret management
resource "azurerm_key_vault" "blog" {
  name                       = "kv-blog-${substr(md5(azurerm_resource_group.blog.id), 0, 8)}"
  location                   = azurerm_resource_group.blog.location
  resource_group_name        = azurerm_resource_group.blog.name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = true
  enable_rbac_authorization  = true

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }
}

# RBAC: Grant Terraform service principal admin access to create secrets
resource "azurerm_role_assignment" "terraform_kv_admin" {
  scope                = azurerm_key_vault.blog.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}

# Key Vault Secrets
resource "azurerm_key_vault_secret" "cosmos_db_key" {
  name         = "cosmos-db-key"
  value        = azurerm_cosmosdb_account.blog.primary_key
  key_vault_id = azurerm_key_vault.blog.id

  depends_on = [azurerm_role_assignment.terraform_kv_admin]

  tags = {
    ManagedBy = "terraform"
  }
}

resource "azurerm_key_vault_secret" "google_client_id" {
  name         = "google-client-id"
  value        = var.google_client_id
  key_vault_id = azurerm_key_vault.blog.id

  depends_on = [azurerm_role_assignment.terraform_kv_admin]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    ManagedBy = "terraform"
  }
}

resource "azurerm_key_vault_secret" "google_client_secret" {
  name         = "google-client-secret"
  value        = var.google_client_secret
  key_vault_id = azurerm_key_vault.blog.id

  depends_on = [azurerm_role_assignment.terraform_kv_admin]

  lifecycle {
    ignore_changes = [value]
  }

  tags = {
    ManagedBy = "terraform"
  }
}

resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret"
  value        = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret.result
  key_vault_id = azurerm_key_vault.blog.id

  depends_on = [azurerm_role_assignment.terraform_kv_admin]

  lifecycle {
    ignore_changes = [value] # Prevent accidental changes
  }

  tags = {
    ManagedBy = "terraform"
  }
}

resource "azurerm_key_vault_secret" "acr_password" {
  name         = "acr-password"
  value        = azurerm_container_registry.blog.admin_password
  key_vault_id = azurerm_key_vault.blog.id

  depends_on = [azurerm_role_assignment.terraform_kv_admin]

  tags = {
    ManagedBy = "terraform"
  }
}

# RBAC: Grant API Container App access to read Key Vault secrets
resource "azurerm_role_assignment" "api_kv_secrets_user" {
  scope                = azurerm_key_vault.blog.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_container_app.api.identity[0].principal_id

  depends_on = [azurerm_container_app.api]
}

# RBAC: Grant UI Container App access to read Key Vault secrets
resource "azurerm_role_assignment" "ui_kv_secrets_user" {
  scope                = azurerm_key_vault.blog.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_container_app.ui.identity[0].principal_id

  depends_on = [azurerm_container_app.ui]
}

# Azure Container Registry
resource "azurerm_container_registry" "blog" {
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.blog.name
  location            = azurerm_resource_group.blog.location
  sku                 = var.acr_sku
  admin_enabled       = true

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }
}

# Log Analytics Workspace (required for Container Apps)
resource "azurerm_log_analytics_workspace" "blog" {
  name                = "${var.resource_group_name}-logs"
  location            = azurerm_resource_group.blog.location
  resource_group_name = azurerm_resource_group.blog.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }
}

# Container Apps Environment
resource "azurerm_container_app_environment" "blog" {
  name                       = "${var.resource_group_name}-env"
  location                   = azurerm_resource_group.blog.location
  resource_group_name        = azurerm_resource_group.blog.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.blog.id

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }
}

# Container App for API
resource "azurerm_container_app" "api" {
  name                         = "blog-api"
  container_app_environment_id = azurerm_container_app_environment.blog.id
  resource_group_name          = azurerm_resource_group.blog.name
  revision_mode                = "Single"

  identity {
    type = "SystemAssigned"
  }

  template {
    container {
      name   = "api"
      image  = "${azurerm_container_registry.blog.login_server}/blog-api:latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "COSMOS_DB_ENDPOINT"
        value = azurerm_cosmosdb_account.blog.endpoint
      }

      env {
        name        = "COSMOS_DB_KEY"
        secret_name = "cosmos-db-key"
      }

      env {
        name  = "COSMOS_DB_DATABASE_NAME"
        value = azurerm_cosmosdb_sql_database.blog.name
      }

      env {
        name  = "GOOGLE_CLIENT_ID"
        value = var.google_client_id
      }

      env {
        name        = "GOOGLE_CLIENT_SECRET"
        secret_name = "google-client-secret"
      }

      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }

      env {
        name  = "FRONTEND_URL"
        value = "https://brxstrng.com"
      }

      env {
        name  = "GOOGLE_REDIRECT_URL"
        value = "https://api.brxstrng.com/auth/google/callback"
      }
    }

    min_replicas = 1
    max_replicas = 3
  }

  secret {
    name                = "cosmos-db-key"
    key_vault_secret_id = azurerm_key_vault_secret.cosmos_db_key.versionless_id
    identity            = "System"
  }

  secret {
    name                = "google-client-secret"
    key_vault_secret_id = azurerm_key_vault_secret.google_client_secret.versionless_id
    identity            = "System"
  }

  secret {
    name                = "jwt-secret"
    key_vault_secret_id = azurerm_key_vault_secret.jwt_secret.versionless_id
    identity            = "System"
  }

  secret {
    name                = "acr-password"
    key_vault_secret_id = azurerm_key_vault_secret.acr_password.versionless_id
    identity            = "System"
  }

  registry {
    server               = azurerm_container_registry.blog.login_server
    username             = azurerm_container_registry.blog.admin_username
    password_secret_name = "acr-password"
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  # Note: Custom domain will be added manually via Azure CLI after DNS is configured
  # This allows Azure to automatically provision and manage TLS certificates
  #
  # Commands to add custom domains after DNS setup:
  # az containerapp hostname add --hostname api.brxstrng.com --name blog-api --resource-group rg-blog-prod
  # az containerapp hostname bind --hostname api.brxstrng.com --name blog-api --resource-group rg-blog-prod --environment rg-blog-prod-env --validation-method HTTP

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }
}

# Container App for UI
resource "azurerm_container_app" "ui" {
  name                         = "blog-ui"
  container_app_environment_id = azurerm_container_app_environment.blog.id
  resource_group_name          = azurerm_resource_group.blog.name
  revision_mode                = "Single"

  identity {
    type = "SystemAssigned"
  }

  template {
    container {
      name   = "ui"
      image  = "${azurerm_container_registry.blog.login_server}/blog-ui:latest"
      cpu    = 0.25
      memory = "0.5Gi"
    }

    min_replicas = 1
    max_replicas = 3
  }

  secret {
    name                = "acr-password"
    key_vault_secret_id = azurerm_key_vault_secret.acr_password.versionless_id
    identity            = "System"
  }

  registry {
    server               = azurerm_container_registry.blog.login_server
    username             = azurerm_container_registry.blog.admin_username
    password_secret_name = "acr-password"
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    traffic_weight {
      latest_revision = true
      percentage      = 100
    }

  }

  # Note: Custom domain will be added manually via Azure CLI after DNS is configured
  # This allows Azure to automatically provision and manage TLS certificates
  #
  # Commands to add custom domains after DNS setup:
  # az containerapp hostname add --hostname brxstrng.com --name blog-ui --resource-group rg-blog-prod
  # az containerapp hostname bind --hostname brxstrng.com --name blog-ui --resource-group rg-blog-prod --environment rg-blog-prod-env --validation-method HTTP

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }
}
