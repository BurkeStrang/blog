package middleware

import (
    "log"
    "net/http"
    "os"
    "strings"
    "time"

    "blogapi/models"

    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
    "github.com/joho/godotenv"
)

var jwtKey []byte

// Initialize JWT key from environment
func init() {
    // Load .env.local file if it exists (for local development)
    _ = godotenv.Load(".env.local")

    jwtSecret := os.Getenv("JWT_SECRET")
    if jwtSecret == "" {
        log.Fatal("CRITICAL: JWT_SECRET environment variable is required")
    }
    jwtKey = []byte(jwtSecret)
    log.Println("JWT authentication initialized successfully")
}

type Claims struct {
    Username string `json:"username"`
    Role     string `json:"role"`
    jwt.RegisteredClaims
}

func GenerateToken(user models.User) (string, error) {
    exp := time.Now().Add(2 * time.Hour)
    claims := &Claims{
        Username: user.Username,
        Role:     user.Role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(exp),
        },
    }
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(jwtKey)
}

func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        tokenString := c.GetHeader("Authorization")
        if len(tokenString) > 7 && strings.HasPrefix(tokenString, "Bearer ") {
            tokenString = tokenString[7:]
        }
        claims := &Claims{}
        token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
            return jwtKey, nil
        })
        if err != nil || !token.Valid {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
            return
        }
        c.Set("user", claims)
        c.Next()
    }
}

// OptionalAuthMiddleware is like AuthMiddleware but doesn't require authentication
// If a valid token is provided, it sets the user in context
// If no token or invalid token, it just continues without error
func OptionalAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        tokenString := c.GetHeader("Authorization")
        if len(tokenString) > 7 && strings.HasPrefix(tokenString, "Bearer ") {
            tokenString = tokenString[7:]
        }

        // If no token provided, just continue without setting user
        if tokenString == "" {
            c.Next()
            return
        }

        // If token is provided, try to parse it
        claims := &Claims{}
        token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
            return jwtKey, nil
        })

        // If token is valid, set user in context
        if err == nil && token.Valid {
            c.Set("user", claims)
        }
        // If token is invalid, just continue without setting user (no error)

        c.Next()
    }
}

func RequireRole(role string) gin.HandlerFunc {
    return func(c *gin.Context) {
        claimsAny, ok := c.Get("user")
        claims, ok2 := claimsAny.(*Claims)
        if !ok || !ok2 || claims.Role != role {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
            return
        }
        c.Next()
    }
}
