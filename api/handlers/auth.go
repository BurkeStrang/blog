package handlers

import (
    "net/http"

    "blogapi/middleware"
    "blogapi/models"

    "github.com/gin-gonic/gin"
)

// Hardcoded user store; replace with DB for production
var users = map[string]models.User{
    "admin": {Username: "admin", Password: "adminpass", Role: "admin"},
    "user":  {Username: "user", Password: "userpass", Role: "user"},
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
