package handlers

import (
    "context"
    "crypto/rand"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "net/http"
    "net/url"
    "os"
    "time"
    "golang.org/x/oauth2"

    "blogapi/middleware"
    "blogapi/models"
    "blogapi/config"

    "github.com/gin-gonic/gin"
)

// Hardcoded user store; replace with DB for production
var users = map[string]models.User{
    "admin": {Username: "admin", Password: "adminpass", Role: "admin"},
    "user":  {Username: "user", Password: "userpass", Role: "user"},
}

// Store for OAuth states (in production, use Redis or database)
var oauthStates = make(map[string]time.Time)

type GoogleUser struct {
    ID            string `json:"id"`
    Email         string `json:"email"`
    VerifiedEmail bool   `json:"verified_email"`
    Name          string `json:"name"`
    GivenName     string `json:"given_name"`
    FamilyName    string `json:"family_name"`
    Picture       string `json:"picture"`
}

func Login(c *gin.Context) {
    var login models.User
    if err := c.BindJSON(&login); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
        return
    }
    user, exists := users[login.Username]
    if !exists || user.Password != login.Password {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
        return
    }
    token, err := middleware.GenerateToken(user)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "token error"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"token": token})
}

func GoogleLogin(c *gin.Context) {
    // Check if OAuth is configured
    if config.GoogleOAuthConfig.ClientID == "" || config.GoogleOAuthConfig.ClientSecret == "" {
        c.JSON(http.StatusServiceUnavailable, gin.H{
            "error": "Google OAuth not configured", 
            "message": "Authentication is not available - blog is running in public-only mode",
        })
        return
    }
    
    // Generate random state
    state := generateState()
    
    // Store state with expiration (5 minutes)
    oauthStates[state] = time.Now().Add(5 * time.Minute)
    
    // Clean up expired states
    cleanupExpiredStates()
    
    url := config.GoogleOAuthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
    c.JSON(http.StatusOK, gin.H{"url": url})
}

func GoogleCallback(c *gin.Context) {
    code := c.Query("code")
    state := c.Query("state")
    
    // Verify state
    if expiry, exists := oauthStates[state]; !exists || time.Now().After(expiry) {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired state"})
        return
    }
    
    // Delete used state
    delete(oauthStates, state)
    
    // Exchange code for token
    token, err := config.GoogleOAuthConfig.Exchange(context.Background(), code)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to exchange code for token"})
        return
    }
    
    // Get user info from Google
    client := config.GoogleOAuthConfig.Client(context.Background(), token)
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
    
    // Generate JWT token for our app
    jwtToken, err := middleware.GenerateToken(models.User{
        Username: googleUser.Email,
        Role:     "user",
    })
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "token generation failed"})
        return
    }
    
    // Redirect to frontend callback with token data
    // Create user JSON and properly escape it
    userJSON := fmt.Sprintf(`{"id":"%s","email":"%s","name":"%s","picture":"%s"}`,
        googleUser.ID, googleUser.Email, googleUser.Name, googleUser.Picture)
    
    // Use base64 encoding for cleaner URL transmission
    encodedUser := base64.URLEncoding.EncodeToString([]byte(userJSON))
    
    // Get frontend URL from environment or default to localhost:5173
    frontendURL := os.Getenv("FRONTEND_URL")
    if frontendURL == "" {
        frontendURL = "http://localhost:5173"
    }
    
    frontendCallback := fmt.Sprintf("%s/auth/callback?token=%s&user=%s",
        frontendURL, url.QueryEscape(jwtToken), encodedUser)
    
    c.Redirect(http.StatusTemporaryRedirect, frontendCallback)
}

func generateState() string {
    b := make([]byte, 32)
    rand.Read(b)
    return base64.URLEncoding.EncodeToString(b)
}

func cleanupExpiredStates() {
    now := time.Now()
    for state, expiry := range oauthStates {
        if now.After(expiry) {
            delete(oauthStates, state)
        }
    }
}
