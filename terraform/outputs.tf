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

# Key Vault outputs
output "key_vault_name" {
  description = "Key Vault name"
  value       = azurerm_key_vault.blog.name
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.blog.vault_uri
}

# Container Apps outputs
output "containerapp_name" {
  description = "Container App name (used by deploy.sh when pushing new images)"
  value       = azurerm_container_app.api.name
}

output "containerapp_fqdn" {
  description = "Container App default ingress FQDN (use this URL for pre-DNS-cutover testing)"
  value       = azurerm_container_app.api.latest_revision_fqdn
}

output "containerapp_environment_name" {
  description = "Container App Environment name"
  value       = azurerm_container_app_environment.blog.name
}

# Static Web Apps outputs
output "staticwebapp_name" {
  description = "Static Web App name"
  value       = azurerm_static_web_app.ui.name
}

output "staticwebapp_default_hostname" {
  description = "Static Web App default hostname (use this URL for pre-DNS-cutover testing)"
  value       = azurerm_static_web_app.ui.default_host_name
}

output "staticwebapp_api_key" {
  description = "Static Web App deployment token (passed to `swa deploy --deployment-token`)"
  value       = azurerm_static_web_app.ui.api_key
  sensitive   = true
}
