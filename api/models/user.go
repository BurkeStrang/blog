package models

type User struct {
    Username string
    Password string
    Role     string // "admin" or "user"
}
