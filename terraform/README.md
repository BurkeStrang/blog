# Terraform Configuration for Blog Infrastructure

This directory contains Terraform configuration to provision Azure Cosmos DB for the blog application.

## Prerequisites

1. **Azure CLI** installed and authenticated:
   ```bash
   az login
   ```

2. **Terraform** installed (version >= 1.0)

3. **Azure subscription** with appropriate permissions to create resources

## Setup

1. **Copy the example variables file**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit terraform.tfvars** with your values:
   ```hcl
   cosmosdb_account_name = "cosmos-blog-yourname-prod"  # Must be globally unique
   resource_group_name   = "rg-blog-prod"
   location             = "East US"
   environment          = "prod"
   ```

3. **Initialize Terraform**:
   ```bash
   terraform init
   ```

4. **Plan the deployment**:
   ```bash
   terraform plan
   ```

5. **Apply the configuration**:
   ```bash
   terraform apply
   ```

## Resources Created

- **Resource Group**: Container for all blog resources
- **Cosmos DB Account**: NoSQL database account with free tier enabled
- **Database**: "blog" database
- **Containers**:
  - `posts` - Blog posts (partitioned by /id)
  - `comments` - Comments (partitioned by /postId)
  - `users` - User accounts (partitioned by /id)

## Configuration Details

- **Consistency Level**: Session (good balance of performance and consistency)
- **Throughput**: 400 RU/s per container (free tier limit)
- **Free Tier**: Enabled (400 RU/s and 5GB storage free)
- **Indexing**: Automatic indexing on all paths
- **Unique Keys**: 
  - Posts: `/slug`
  - Users: `/email`

## Getting Connection Information

After deployment, get the connection details:

```bash
# Get Cosmos DB endpoint
terraform output cosmosdb_endpoint

# Get connection string (sensitive)
terraform output -raw cosmosdb_primary_key

# Get all outputs
terraform output
```

## Cost Management

- **Free Tier**: First 400 RU/s and 5GB storage are free
- **Estimated Cost**: $0/month with free tier, ~$24/month if exceeded
- **Monitoring**: Use Azure Cost Management to track usage

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

## Next Steps

1. Update your Go application to use Cosmos DB
2. Set environment variables with connection details
3. Update your CI/CD pipeline to use Terraform outputs