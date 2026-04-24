package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos"
)

var (
	CosmosClient      *azcosmos.Client
	DatabaseClient    *azcosmos.DatabaseClient
	PostsContainer    *azcosmos.ContainerClient
	CommentsContainer *azcosmos.ContainerClient
	UsersContainer    *azcosmos.ContainerClient
)

// InitializeCosmos initializes the Cosmos DB connection
func InitializeCosmos() error {
	endpoint := os.Getenv("COSMOS_DB_ENDPOINT")
	key := os.Getenv("COSMOS_DB_KEY")
	databaseName := os.Getenv("COSMOS_DB_DATABASE_NAME")

	if endpoint == "" || key == "" || databaseName == "" {
		return fmt.Errorf("missing required Cosmos DB environment variables: COSMOS_DB_ENDPOINT, COSMOS_DB_KEY, COSMOS_DB_DATABASE_NAME")
	}

	// Create credential from key
	cred, err := azcosmos.NewKeyCredential(key)
	if err != nil {
		return fmt.Errorf("failed to create cosmos credential: %v", err)
	}

	// Create client
	client, err := azcosmos.NewClientWithKey(endpoint, cred, nil)
	if err != nil {
		return fmt.Errorf("failed to create cosmos client: %v", err)
	}

	CosmosClient = client

	// Get database client
	DatabaseClient, err = client.NewDatabase(databaseName)
	if err != nil {
		return fmt.Errorf("failed to get database client: %v", err)
	}

	// Get container clients
	PostsContainer, err = DatabaseClient.NewContainer("posts")
	if err != nil {
		return fmt.Errorf("failed to get posts container client: %v", err)
	}
	
	CommentsContainer, err = DatabaseClient.NewContainer("comments")
	if err != nil {
		return fmt.Errorf("failed to get comments container client: %v", err)
	}

	UsersContainer, err = DatabaseClient.NewContainer("users")
	if err != nil {
		return fmt.Errorf("failed to get users container client: %v", err)
	}

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Try to read database properties to verify connection
	_, err = DatabaseClient.Read(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to connect to cosmos database: %v", err)
	}

	log.Printf("Successfully connected to Cosmos DB: %s", databaseName)
	return nil
}

// Close closes the Cosmos DB connection
func CloseCosmos() {
	// Cosmos DB client doesn't require explicit closing
	log.Println("Cosmos DB connection closed")
}