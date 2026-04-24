package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"blogapi/database"
	"blogapi/middleware"
	"blogapi/models"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/data/azcosmos"
	"github.com/gin-gonic/gin"
)

func usernameFromClaims(c *gin.Context) string {
	userI, exists := c.Get("user")
	if !exists {
		return ""
	}
	claims, ok := userI.(*middleware.Claims)
	if !ok {
		return ""
	}
	username := claims.Username
	if idx := strings.Index(username, "@"); idx != -1 {
		username = username[:idx]
	}
	return username
}

// GetUserPreferences handles GET /api/users/preferences
func GetUserPreferences(c *gin.Context) {
	ctx := context.Background()
	username := usernameFromClaims(c)
	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	id := "prefs-" + username
	partitionKey := azcosmos.NewPartitionKeyString(username)

	resp, err := database.UsersContainer.ReadItem(ctx, partitionKey, id, nil)
	if err != nil {
		// Not found is fine — return default
		var respErr *azcore.ResponseError
		if ok := errorAs(err, &respErr); ok && respErr.StatusCode == http.StatusNotFound {
			c.JSON(http.StatusOK, gin.H{"theme": "dark"})
			return
		}
		log.Printf("Error reading user preferences for %s: %v", username, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load preferences"})
		return
	}

	var prefs models.CosmosUserPreferences
	if err := json.Unmarshal(resp.Value, &prefs); err != nil {
		log.Printf("Error unmarshaling preferences for %s: %v", username, err)
		c.JSON(http.StatusOK, gin.H{"theme": "dark"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"theme": prefs.Theme})
}

// PutUserPreferences handles PUT /api/users/preferences
func PutUserPreferences(c *gin.Context) {
	ctx := context.Background()
	username := usernameFromClaims(c)
	if username == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	var body struct {
		Theme string `json:"theme"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || (body.Theme != "dark" && body.Theme != "light") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "theme must be 'dark' or 'light'"})
		return
	}

	prefs := models.CosmosUserPreferences{
		ID:        "prefs-" + username,
		Type:      "user_preferences",
		Username:  username,
		Theme:     body.Theme,
		UpdatedAt: time.Now().UTC(),
	}

	data, err := json.Marshal(prefs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save preferences"})
		return
	}

	partitionKey := azcosmos.NewPartitionKeyString(username)
	_, err = database.UsersContainer.UpsertItem(ctx, partitionKey, data, nil)
	if err != nil {
		log.Printf("Error upserting preferences for %s: %v", username, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save preferences"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"theme": prefs.Theme})
}

// errorAs is a helper since errors.As doesn't work directly with azcore.ResponseError pointer
func errorAs(err error, target **azcore.ResponseError) bool {
	if re, ok := err.(*azcore.ResponseError); ok {
		*target = re
		return true
	}
	return false
}
