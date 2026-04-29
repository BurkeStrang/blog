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

# Log Analytics Workspace
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

# AKS Cluster
resource "azurerm_kubernetes_cluster" "blog" {
  name                = "aks-blog-prod"
  location            = azurerm_resource_group.blog.location
  resource_group_name = azurerm_resource_group.blog.name
  dns_prefix          = "blog"

  automatic_channel_upgrade = "stable"

  maintenance_window_auto_upgrade {
    frequency   = "Weekly"
    interval    = 1
    duration    = 4
    day_of_week = "Sunday"
    start_time  = "03:00"
    utc_offset  = "+00:00"
  }

  maintenance_window_node_os {
    frequency   = "Weekly"
    interval    = 1
    duration    = 4
    day_of_week = "Sunday"
    start_time  = "05:00"
    utc_offset  = "+00:00"
  }

  default_node_pool {
    name       = "system"
    node_count = 1
    vm_size    = var.aks_system_vm_size

    upgrade_settings {
      max_surge = "10%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.blog.id
  }

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }
}

# API node pool
resource "azurerm_kubernetes_cluster_node_pool" "api" {
  name                  = "api"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.blog.id
  vm_size               = var.aks_api_vm_size
  node_count            = 1

  node_labels = {
    "workload" = "api"
  }

  upgrade_settings {
    max_surge = "1"
  }

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }
}

# UI node pool
resource "azurerm_kubernetes_cluster_node_pool" "ui" {
  name                  = "ui"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.blog.id
  vm_size               = var.aks_ui_vm_size
  node_count            = 1

  node_labels = {
    "workload" = "ui"
  }

  upgrade_settings {
    max_surge = "1"
  }

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }
}

# Grant AKS kubelet identity AcrPull on ACR
resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = azurerm_container_registry.blog.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.blog.kubelet_identity[0].object_id
}
