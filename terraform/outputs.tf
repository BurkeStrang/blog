output "cosmosdb_endpoint" {
  description = "Cosmos DB account endpoint"
  value       = azurerm_cosmosdb_account.blog.endpoint
}

output "cosmosdb_primary_key" {
  description = "Cosmos DB primary key"
  value       = azurerm_cosmosdb_account.blog.primary_key
  sensitive   = true
}

output "cosmosdb_account_name" {
  description = "Cosmos DB account name"
  value       = azurerm_cosmosdb_account.blog.name
}

output "database_name" {
  description = "Cosmos DB database name"
  value       = azurerm_cosmosdb_sql_database.blog.name
}

output "resource_group_name" {
  description = "Resource Group name"
  value       = azurerm_resource_group.blog.name
}

output "acr_login_server" {
  description = "ACR login server URL"
  value       = azurerm_container_registry.blog.login_server
}

output "acr_admin_username" {
  description = "ACR admin username"
  value       = azurerm_container_registry.blog.admin_username
}

output "acr_admin_password" {
  description = "ACR admin password"
  value       = azurerm_container_registry.blog.admin_password
  sensitive   = true
}

output "acr_name" {
  description = "ACR name"
  value       = azurerm_container_registry.blog.name
}

# Container Apps URLs
output "api_url" {
  description = "API Container App URL"
  value       = "https://${azurerm_container_app.api.ingress[0].fqdn}"
}

output "ui_url" {
  description = "UI Container App URL"
  value       = "https://${azurerm_container_app.ui.ingress[0].fqdn}"
}

output "api_fqdn" {
  description = "API Container App FQDN"
  value       = azurerm_container_app.api.ingress[0].fqdn
}

output "ui_fqdn" {
  description = "UI Container App FQDN"
  value       = azurerm_container_app.ui.ingress[0].fqdn
}

# Key Vault outputs
output "key_vault_name" {
  description = "Key Vault name"
  value       = azurerm_key_vault.blog.name
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.blog.vault_uri
}

output "api_managed_identity_principal_id" {
  description = "API Container App Managed Identity Principal ID"
  value       = azurerm_container_app.api.identity[0].principal_id
}

# Custom Domain Information
output "custom_domain_verification_id" {
  description = "Custom domain verification ID for Container Apps"
  value       = azurerm_container_app_environment.blog.custom_domain_verification_id
}

output "api_custom_domain" {
  description = "API custom domain"
  value       = "api.brxstrng.com"
}

output "ui_custom_domain" {
  description = "UI custom domain"
  value       = "brxstrng.com"
}