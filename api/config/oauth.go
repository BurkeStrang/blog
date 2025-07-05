package config

import (
    "log"
    "os"
    "golang.org/x/oauth2"
    "golang.org/x/oauth2/google"
    "github.com/joho/godotenv"
)

var GoogleOAuthConfig *oauth2.Config

func InitOAuth() {
    // Load .env file if it exists
    if err := godotenv.Load(".env"); err != nil {
        log.Println("No .env file found, using system environment variables")
    }

    clientID := getEnv("GOOGLE_CLIENT_ID", "")
    clientSecret := getEnv("GOOGLE_CLIENT_SECRET", "")
    
    // Validate required OAuth configuration
    if clientID == "" || clientSecret == "" {
        log.Println("WARNING: Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required for authentication")
        log.Println("Blog will run in public-only mode without authentication features")
    }

    GoogleOAuthConfig = &oauth2.Config{
        ClientID:     clientID,
        ClientSecret: clientSecret,
        RedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/auth/google/callback"),
        Scopes: []string{
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
        },
        Endpoint: google.Endpoint,
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}