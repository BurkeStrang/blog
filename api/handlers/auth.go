package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	"blogapi/config"
	"blogapi/middleware"
	"blogapi/models"
	"github.com/gin-gonic/gin"
)

// OAuth state management
var (
	oauthStates = make(map[string]time.Time)
	stateMutex  sync.RWMutex
)

// GoogleUser represents the user data from Google OAuth
type GoogleUser struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

// Cleanup expired states periodically
func init() {
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			cleanupExpiredStates()
		}
	}()
}

func GoogleLogin(c *gin.Context) {
	state := generateState()

	stateMutex.Lock()
	oauthStates[state] = time.Now().Add(10 * time.Minute)
	stateMutex.Unlock()

	url := config.GoogleOAuthConfig.AuthCodeURL(state)
	c.JSON(http.StatusOK, gin.H{"url": url})
}

func GoogleCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")

	// Verify state
	stateMutex.RLock()
	expiry, exists := oauthStates[state]
	stateMutex.RUnlock()

	if !exists || time.Now().After(expiry) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired state"})
		return
	}

	// Delete used state
	stateMutex.Lock()
	delete(oauthStates, state)
	stateMutex.Unlock()

	// Exchange code for token
	ctx := c.Request.Context()
	token, err := config.GoogleOAuthConfig.Exchange(ctx, code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to exchange code for token"})
		return
	}

	// Get user info from Google
	client := config.GoogleOAuthConfig.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user info"})
		return
	}
	defer resp.Body.Close()

	var googleUser GoogleUser
	if err := json.NewDecoder(resp.Body).Decode(&googleUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to decode user info"})
		return
	}

	// Determine user role based on email
	role := "user"
	if googleUser.Email == "bstrangwork@gmail.com" || googleUser.Email == "burke.strang@gmail.com" {
		role = "admin"
	}

	// Generate JWT token for our app
	// Use email as username (guaranteed unique by Google OAuth)
	jwtToken, err := middleware.GenerateToken(models.User{
		Username: googleUser.Email,
		Email:    googleUser.Email,
		Name:     googleUser.Name,
		Picture:  googleUser.Picture,
		Role:     role,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token generation failed"})
		return
	}

	// Redirect to frontend callback with token data
	userJSON := fmt.Sprintf(`{"id":"%s","username":"%s","email":"%s","name":"%s","picture":"%s","role":"%s"}`,
		googleUser.ID, googleUser.Email, googleUser.Email, googleUser.Name, googleUser.Picture, role)

	// Use base64 encoding for cleaner URL transmission
	encodedUser := base64.URLEncoding.EncodeToString([]byte(userJSON))

	// Get frontend URL from environment or default to localhost:5173
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	frontendCallback := fmt.Sprintf("%s/auth/callback?token=%s&user=%s",
		frontendURL, jwtToken, encodedUser)

	c.Redirect(http.StatusTemporaryRedirect, frontendCallback)
}

func generateState() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func cleanupExpiredStates() {
	stateMutex.Lock()
	defer stateMutex.Unlock()

	now := time.Now()
	for state, expiry := range oauthStates {
		if now.After(expiry) {
			delete(oauthStates, state)
		}
	}
}
