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

output "aks_cluster_name" {
  description = "AKS cluster name"
  value       = azurerm_kubernetes_cluster.blog.name
}

output "aks_resource_group" {
  description = "AKS resource group"
  value       = azurerm_kubernetes_cluster.blog.resource_group_name
}

output "aks_kubelet_identity" {
  description = "AKS kubelet managed identity object ID"
  value       = azurerm_kubernetes_cluster.blog.kubelet_identity[0].object_id
}
