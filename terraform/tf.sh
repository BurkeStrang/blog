#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${TF_RESOURCE_GROUP:-rg-blog-prod}"

VAULT_NAME=$(az keyvault list \
  --resource-group "$RESOURCE_GROUP" \
  --query "[0].name" -o tsv 2>/dev/null)

if [[ -z "$VAULT_NAME" ]]; then
  echo "Error: no Key Vault found in resource group '$RESOURCE_GROUP'" >&2
  echo "On first apply (vault doesn't exist yet), pass secrets via env:" >&2
  echo "  TF_VAR_google_client_id=... TF_VAR_google_client_secret=... TF_VAR_jwt_secret=... $0 apply" >&2
  exit 1
fi

echo "Using Key Vault: $VAULT_NAME"

fetch_secret() {
  az keyvault secret show --vault-name "$VAULT_NAME" --name "$1" --query value -o tsv 2>/dev/null || true
}

export TF_VAR_google_client_id=$(fetch_secret "google-client-id")
export TF_VAR_google_client_secret=$(fetch_secret "google-client-secret")
export TF_VAR_jwt_secret=$(fetch_secret "jwt-secret")

terraform "$@"
