# Build stage — context is the repo root so we can pull in the shared
# Aspire ServiceDefaults project that BlogApi.csproj references.
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS builder
WORKDIR /src

COPY api-dotnet/BlogApi.csproj api-dotnet/
COPY aspire/Blog.ServiceDefaults/Blog.ServiceDefaults.csproj aspire/Blog.ServiceDefaults/
RUN dotnet restore api-dotnet/BlogApi.csproj

COPY api-dotnet/ api-dotnet/
COPY aspire/Blog.ServiceDefaults/ aspire/Blog.ServiceDefaults/
RUN dotnet publish api-dotnet/BlogApi.csproj -c Release -o /app --no-restore /p:UseAppHost=false

# Final stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine

RUN apk --no-cache add wget && \
    addgroup -g 1001 appuser && \
    adduser -D -u 1001 -G appuser appuser

WORKDIR /app
COPY --from=builder /app .
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "BlogApi.dll"]
