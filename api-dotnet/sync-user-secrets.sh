#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_file="$script_dir/BlogApi.csproj"
env_file=""
dry_run=0

secret_keys=(
  COSMOS_DB_ENDPOINT
  COSMOS_DB_KEY
  COSMOS_DB_DATABASE_NAME
  JWT_SECRET
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_REDIRECT_URL
  FRONTEND_URL
  ADMIN_EMAILS
  OTEL_SERVICE_NAME
  OTEL_SERVICE_VERSION
  OTEL_DEPLOYMENT_ENVIRONMENT
  OTEL_TRACES_EXPORTER
  OTEL_TRACES_SAMPLER_ARG
  OTEL_EXPORTER_OTLP_ENDPOINT
  OTEL_EXPORTER_OTLP_HEADERS
  ASPNETCORE_URLS
)

declare -A file_values=()

usage() {
  cat <<'EOF'
Usage: ./sync-user-secrets.sh [--env-file PATH] [--project PATH] [--dry-run]

Copies known BlogApi configuration keys into dotnet user-secrets.

Sources:
  1. Current shell environment
  2. Optional .env-style file for any keys not already exported

Examples:
  ./sync-user-secrets.sh
  ./sync-user-secrets.sh --env-file .env.local
  ./sync-user-secrets.sh --env-file .env.local --dry-run
EOF
}

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

parse_env_file() {
  local path="$1"
  local line key raw_value value

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    line="$(trim "$line")"

    [[ -z "$line" ]] && continue
    [[ "$line" == \#* ]] && continue

    if [[ "$line" =~ ^export[[:space:]]+ ]]; then
      line="$(trim "${line#export}")"
    fi

    if [[ ! "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      printf 'Skipping unsupported line in %s: %s\n' "$path" "$line" >&2
      continue
    fi

    key="${BASH_REMATCH[1]}"
    raw_value="${BASH_REMATCH[2]}"
    value="$(trim "$raw_value")"

    if [[ "$value" == \"*\" && "$value" == *\" && "${#value}" -ge 2 ]]; then
      value="${value:1:${#value}-2}"
      value="${value//\\\"/\"}"
      value="${value//\\\\/\\}"
    elif [[ "$value" == \'*\' && "$value" == *\' && "${#value}" -ge 2 ]]; then
      value="${value:1:${#value}-2}"
    fi

    file_values["$key"]="$value"
  done < "$path"
}

get_value() {
  local key="$1"

  if [[ -v "$key" ]]; then
    printf '%s' "${!key}"
    return 0
  fi

  if [[ -v "file_values[$key]" ]]; then
    printf '%s' "${file_values[$key]}"
    return 0
  fi

  return 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      env_file="${2:-}"
      shift 2
      ;;
    --project)
      project_file="${2:-}"
      shift 2
      ;;
    --dry-run)
      dry_run=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n\n' "$1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$project_file" || ! -f "$project_file" ]]; then
  printf 'Project file not found: %s\n' "$project_file" >&2
  exit 1
fi

if [[ -n "$env_file" ]]; then
  if [[ ! -f "$env_file" ]]; then
    printf 'Env file not found: %s\n' "$env_file" >&2
    exit 1
  fi
  parse_env_file "$env_file"
fi

if ! grep -q '<UserSecretsId>' "$project_file"; then
  if [[ "$dry_run" -eq 1 ]]; then
    printf '[dry-run] dotnet user-secrets init --project %q\n' "$project_file"
  else
    dotnet user-secrets init --project "$project_file" >/dev/null
    printf 'Initialized user-secrets for %s\n' "$project_file"
  fi
fi

set_count=0
skip_count=0

for key in "${secret_keys[@]}"; do
  if value="$(get_value "$key")"; then
    if [[ "$dry_run" -eq 1 ]]; then
      printf '[dry-run] dotnet user-secrets set %q %q --project %q\n' "$key" "$value" "$project_file"
    else
      dotnet user-secrets set "$key" "$value" --project "$project_file" >/dev/null
      printf 'Set %s\n' "$key"
    fi
    ((set_count += 1))
  else
    printf 'Skipped %s (not set)\n' "$key"
    ((skip_count += 1))
  fi
done

printf 'Done. %d secret(s) set, %d key(s) skipped.\n' "$set_count" "$skip_count"
