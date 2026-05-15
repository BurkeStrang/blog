# Static Web Apps Free tier is only available in a handful of regions.
# East US 2 is the closest to our East US resource group.
resource "azurerm_static_web_app" "ui" {
  name                = "swa-blog-ui-prod"
  resource_group_name = azurerm_resource_group.blog.name
  location            = var.staticwebapp_location
  sku_tier            = "Free"
  sku_size            = "Free"

  tags = {
    Environment = var.environment
    Project     = "blog"
    ManagedBy   = "terraform"
  }
}
