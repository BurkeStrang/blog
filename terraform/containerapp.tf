# User-assigned identity for the Container App.
# A UAI is used instead of SystemAssigned so RBAC role assignments (AcrPull,
# Key Vault Secrets User) can be created before the Container App is provisioned,
# avoiding chicken-and-egg failures when the app first pulls its image or secrets.
resource "azurerm_user_assigned_identity" "containerapp" {
  name                = "uai-blog-containerapp"
  location            = azurerm_resource_group.blog.location
  resource_group_name = azurerm_resource_group.blog.name

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }
}

resource "azurerm_role_assignment" "containerapp_acr_pull" {
  scope                = azurerm_container_registry.blog.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.containerapp.principal_id
}

resource "azurerm_role_assignment" "containerapp_kv_secrets" {
  scope                = azurerm_key_vault.blog.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.containerapp.principal_id
}

resource "azurerm_container_app_environment" "blog" {
  name                       = "cae-blog-prod"
  location                   = azurerm_resource_group.blog.location
  resource_group_name        = azurerm_resource_group.blog.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.blog.id

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }
}

resource "azurerm_container_app" "api" {
  name                         = "ca-blog-api-prod"
  container_app_environment_id = azurerm_container_app_environment.blog.id
  resource_group_name          = azurerm_resource_group.blog.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.containerapp.id]
  }

  registry {
    server   = azurerm_container_registry.blog.login_server
    identity = azurerm_user_assigned_identity.containerapp.id
  }

  secret {
    name                = "cosmos-db-key"
    identity            = azurerm_user_assigned_identity.containerapp.id
    key_vault_secret_id = azurerm_key_vault_secret.cosmos_db_key.id
  }

  secret {
    name                = "google-client-id"
    identity            = azurerm_user_assigned_identity.containerapp.id
    key_vault_secret_id = azurerm_key_vault_secret.google_client_id.id
  }

  secret {
    name                = "google-client-secret"
    identity            = azurerm_user_assigned_identity.containerapp.id
    key_vault_secret_id = azurerm_key_vault_secret.google_client_secret.id
  }

  secret {
    name                = "jwt-secret"
    identity            = azurerm_user_assigned_identity.containerapp.id
    key_vault_secret_id = azurerm_key_vault_secret.jwt_secret.id
  }

  secret {
    name                = "appinsights-connection-string"
    identity            = azurerm_user_assigned_identity.containerapp.id
    key_vault_secret_id = azurerm_key_vault_secret.appinsights_connection_string.id
  }

  template {
    min_replicas = var.containerapp_min_replicas
    max_replicas = var.containerapp_max_replicas

    container {
      name   = "blog-api"
      image  = "${azurerm_container_registry.blog.login_server}/blog-api:latest"
      cpu    = var.containerapp_cpu
      memory = var.containerapp_memory

      env {
        name  = "COSMOS_DB_ENDPOINT"
        value = azurerm_cosmosdb_account.blog.endpoint
      }
      env {
        name  = "COSMOS_DB_DATABASE_NAME"
        value = azurerm_cosmosdb_sql_database.blog.name
      }
      env {
        name  = "FRONTEND_URL"
        value = "https://brxstrng.com"
      }
      env {
        name  = "GOOGLE_REDIRECT_URL"
        value = "https://api.brxstrng.com/auth/google/callback"
      }
      env {
        name        = "COSMOS_DB_KEY"
        secret_name = "cosmos-db-key"
      }
      # Detected by Blog.ServiceDefaults — when set, UseAzureMonitor() lights
      # up and traces/metrics/logs flow to App Insights.
      env {
        name        = "APPLICATIONINSIGHTS_CONNECTION_STRING"
        secret_name = "appinsights-connection-string"
      }
      env {
        name        = "GOOGLE_CLIENT_ID"
        secret_name = "google-client-id"
      }
      env {
        name        = "GOOGLE_CLIENT_SECRET"
        secret_name = "google-client-secret"
      }
      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }

      liveness_probe {
        path      = "/health"
        port      = 8080
        transport = "HTTP"
      }

      readiness_probe {
        path      = "/health"
        port      = 8080
        transport = "HTTP"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8080
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }

  depends_on = [
    azurerm_role_assignment.containerapp_acr_pull,
    azurerm_role_assignment.containerapp_kv_secrets,
  ]
}
