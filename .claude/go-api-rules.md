# Go API Development Rules

## Project Structure

### Standard Layout
```
cmd/
├── api/                # Main application
│   └── main.go
├── migrate/            # Database migrations
│   └── main.go
internal/
├── api/                # API layer
│   ├── handlers/       # HTTP handlers
│   ├── middleware/     # Custom middleware
│   └── routes/         # Route definitions
├── config/             # Configuration
├── database/           # Database layer
│   ├── migrations/     # SQL migrations
│   └── queries/        # SQL queries
├── models/             # Data models
├── services/           # Business logic
├── repository/         # Data access layer
└── utils/              # Utility functions
pkg/                    # Public packages
├── auth/               # Authentication utilities
├── logger/             # Logging utilities
└── validator/          # Validation utilities
```

## Code Organization

### Package Naming
- Use lowercase, single-word package names
- Avoid underscores or mixedCaps
- Make package names descriptive of their purpose
- Keep package names short but meaningful

### Import Organization
```go
package main

import (
    // Standard library
    "context"
    "fmt"
    "net/http"
    
    // Third-party packages
    "github.com/gin-gonic/gin"
    "github.com/golang-migrate/migrate/v4"
    
    // Internal packages
    "yourproject/internal/api/handlers"
    "yourproject/internal/config"
    "yourproject/pkg/logger"
)
```

## Error Handling

### Structured Error Handling
- Always handle errors explicitly
- Use structured error types for API responses
- Implement proper error wrapping with context
- Log errors with appropriate levels

```go
type APIError struct {
    Code    int    `json:"code"`
    Message string `json:"message"`
    Detail  string `json:"detail,omitempty"`
}

func (e APIError) Error() string {
    return e.Message
}

// Wrap errors with context
func (s *UserService) CreateUser(ctx context.Context, user *User) error {
    if err := s.repo.Create(ctx, user); err != nil {
        return fmt.Errorf("failed to create user: %w", err)
    }
    return nil
}
```

### HTTP Error Responses
```go
func HandleError(c *gin.Context, err error) {
    var apiErr APIError
    
    switch {
    case errors.Is(err, ErrUserNotFound):
        apiErr = APIError{
            Code:    http.StatusNotFound,
            Message: "User not found",
        }
    case errors.Is(err, ErrValidation):
        apiErr = APIError{
            Code:    http.StatusBadRequest,
            Message: "Validation error",
            Detail:  err.Error(),
        }
    default:
        apiErr = APIError{
            Code:    http.StatusInternalServerError,
            Message: "Internal server error",
        }
        logger.Error("unexpected error", "error", err)
    }
    
    c.JSON(apiErr.Code, apiErr)
}
```

## Database Best Practices

### Connection Management
- Use connection pooling
- Implement proper connection timeouts
- Handle database connectivity issues gracefully
- Use context for query cancellation

```go
func NewDB(cfg *config.Database) (*sql.DB, error) {
    db, err := sql.Open("postgres", cfg.DSN)
    if err != nil {
        return nil, fmt.Errorf("failed to open database: %w", err)
    }
    
    db.SetMaxOpenConns(cfg.MaxOpenConns)
    db.SetMaxIdleConns(cfg.MaxIdleConns)
    db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
    
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    if err := db.PingContext(ctx); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }
    
    return db, nil
}
```

### Repository Pattern
```go
type UserRepository interface {
    Create(ctx context.Context, user *User) error
    GetByID(ctx context.Context, id string) (*User, error)
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id string) error
    List(ctx context.Context, filters UserFilters) ([]*User, error)
}

type userRepository struct {
    db *sql.DB
}

func (r *userRepository) Create(ctx context.Context, user *User) error {
    query := `INSERT INTO users (id, email, name, created_at) VALUES ($1, $2, $3, $4)`
    
    _, err := r.db.ExecContext(ctx, query, user.ID, user.Email, user.Name, user.CreatedAt)
    if err != nil {
        return fmt.Errorf("failed to create user: %w", err)
    }
    
    return nil
}
```

## HTTP API Design

### RESTful Endpoints
- Use standard HTTP methods appropriately
- Implement consistent URL patterns
- Use proper HTTP status codes
- Include pagination for list endpoints

```go
// REST endpoint patterns
// GET    /api/v1/users          - List users
// POST   /api/v1/users          - Create user
// GET    /api/v1/users/:id      - Get user by ID
// PUT    /api/v1/users/:id      - Update user
// DELETE /api/v1/users/:id      - Delete user
```

### Handler Structure
```go
type UserHandler struct {
    service UserService
    logger  logger.Logger
}

func (h *UserHandler) CreateUser(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        HandleError(c, fmt.Errorf("invalid request: %w", err))
        return
    }
    
    if err := h.validateCreateUser(&req); err != nil {
        HandleError(c, err)
        return
    }
    
    user, err := h.service.CreateUser(c.Request.Context(), &req)
    if err != nil {
        HandleError(c, err)
        return
    }
    
    c.JSON(http.StatusCreated, UserResponse{
        ID:        user.ID,
        Email:     user.Email,
        Name:      user.Name,
        CreatedAt: user.CreatedAt,
    })
}
```

## Validation and Sanitization

### Input Validation
```go
import "github.com/go-playground/validator/v10"

type CreateUserRequest struct {
    Email string `json:"email" validate:"required,email"`
    Name  string `json:"name" validate:"required,min=2,max=100"`
    Age   int    `json:"age" validate:"gte=0,lte=130"`
}

func (h *UserHandler) validateCreateUser(req *CreateUserRequest) error {
    validate := validator.New()
    if err := validate.Struct(req); err != nil {
        return fmt.Errorf("validation failed: %w", err)
    }
    return nil
}
```

### SQL Injection Prevention
- Always use parameterized queries
- Never concatenate user input into SQL strings
- Use proper escaping for dynamic queries

```go
// Good - parameterized query
query := "SELECT * FROM users WHERE email = $1 AND active = $2"
rows, err := db.QueryContext(ctx, query, email, true)

// Bad - string concatenation
query := fmt.Sprintf("SELECT * FROM users WHERE email = '%s'", email)
```

## Security Best Practices

### Authentication & Authorization
```go
func AuthMiddleware(secret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.JSON(http.StatusUnauthorized, APIError{
                Code:    http.StatusUnauthorized,
                Message: "Missing authorization token",
            })
            c.Abort()
            return
        }
        
        // Validate JWT token
        claims, err := ValidateJWT(token, secret)
        if err != nil {
            c.JSON(http.StatusUnauthorized, APIError{
                Code:    http.StatusUnauthorized,
                Message: "Invalid token",
            })
            c.Abort()
            return
        }
        
        c.Set("user_id", claims.UserID)
        c.Next()
    }
}
```

### Rate Limiting
```go
func RateLimitMiddleware(limit int, window time.Duration) gin.HandlerFunc {
    // Implementation using redis or in-memory store
    return func(c *gin.Context) {
        clientIP := c.ClientIP()
        
        if !rateLimiter.Allow(clientIP, limit, window) {
            c.JSON(http.StatusTooManyRequests, APIError{
                Code:    http.StatusTooManyRequests,
                Message: "Rate limit exceeded",
            })
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

## Configuration Management

### Environment-based Config
```go
type Config struct {
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
    Redis    RedisConfig    `mapstructure:"redis"`
    JWT      JWTConfig      `mapstructure:"jwt"`
}

type ServerConfig struct {
    Port         int           `mapstructure:"port"`
    ReadTimeout  time.Duration `mapstructure:"read_timeout"`
    WriteTimeout time.Duration `mapstructure:"write_timeout"`
}

func LoadConfig() (*Config, error) {
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath(".")
    viper.AddConfigPath("./config")
    
    viper.AutomaticEnv()
    viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
    
    if err := viper.ReadInConfig(); err != nil {
        return nil, fmt.Errorf("failed to read config: %w", err)
    }
    
    var config Config
    if err := viper.Unmarshal(&config); err != nil {
        return nil, fmt.Errorf("failed to unmarshal config: %w", err)
    }
    
    return &config, nil
}
```

## Logging and Monitoring

### Structured Logging
```go
import "go.uber.org/zap"

func NewLogger(level string) (*zap.Logger, error) {
    cfg := zap.NewProductionConfig()
    cfg.Level = zap.NewAtomicLevelAt(parseLevel(level))
    
    logger, err := cfg.Build()
    if err != nil {
        return nil, fmt.Errorf("failed to create logger: %w", err)
    }
    
    return logger, nil
}

// Usage in handlers
func (h *UserHandler) CreateUser(c *gin.Context) {
    h.logger.Info("creating user",
        zap.String("email", req.Email),
        zap.String("request_id", c.GetString("request_id")),
    )
}
```

### Request Logging Middleware
```go
func RequestLoggerMiddleware(logger *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        path := c.Request.URL.Path
        raw := c.Request.URL.RawQuery
        
        c.Next()
        
        latency := time.Since(start)
        
        logger.Info("HTTP request",
            zap.String("method", c.Request.Method),
            zap.String("path", path),
            zap.String("query", raw),
            zap.Int("status", c.Writer.Status()),
            zap.Duration("latency", latency),
            zap.String("user_agent", c.Request.UserAgent()),
        )
    }
}
```

## Testing Guidelines

### Unit Tests
```go
func TestUserService_CreateUser(t *testing.T) {
    tests := []struct {
        name    string
        user    *User
        wantErr bool
    }{
        {
            name: "valid user",
            user: &User{
                Email: "test@example.com",
                Name:  "Test User",
            },
            wantErr: false,
        },
        {
            name: "invalid email",
            user: &User{
                Email: "invalid-email",
                Name:  "Test User",
            },
            wantErr: true,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            service := NewUserService(mockRepo, mockLogger)
            err := service.CreateUser(context.Background(), tt.user)
            
            if (err != nil) != tt.wantErr {
                t.Errorf("CreateUser() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

### Integration Tests
- Test database operations with test database
- Use Docker for consistent test environments
- Test HTTP endpoints with httptest
- Mock external dependencies

## Performance Optimization

### Database Optimization
- Use database indexes appropriately
- Implement connection pooling
- Use prepared statements for repeated queries
- Monitor slow queries

### Caching Strategy
```go
type CacheService interface {
    Get(ctx context.Context, key string) ([]byte, error)
    Set(ctx context.Context, key string, value []byte, ttl time.Duration) error
    Delete(ctx context.Context, key string) error
}

func (s *UserService) GetUser(ctx context.Context, id string) (*User, error) {
    // Try cache first
    cacheKey := fmt.Sprintf("user:%s", id)
    if data, err := s.cache.Get(ctx, cacheKey); err == nil {
        var user User
        if err := json.Unmarshal(data, &user); err == nil {
            return &user, nil
        }
    }
    
    // Fallback to database
    user, err := s.repo.GetByID(ctx, id)
    if err != nil {
        return nil, err
    }
    
    // Cache the result
    if data, err := json.Marshal(user); err == nil {
        s.cache.Set(ctx, cacheKey, data, 30*time.Minute)
    }
    
    return user, nil
}
```

## Deployment and DevOps

### Docker Configuration
```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o api cmd/api/main.go

# Runtime stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/api .
COPY --from=builder /app/config ./config
EXPOSE 8080
CMD ["./api"]
```

### Health Checks
```go
func (h *HealthHandler) Health(c *gin.Context) {
    health := HealthResponse{
        Status:    "ok",
        Timestamp: time.Now(),
        Services:  make(map[string]string),
    }
    
    // Check database
    if err := h.db.Ping(); err != nil {
        health.Status = "degraded"
        health.Services["database"] = "down"
    } else {
        health.Services["database"] = "up"
    }
    
    // Check redis
    if err := h.redis.Ping().Err(); err != nil {
        health.Status = "degraded"
        health.Services["redis"] = "down"
    } else {
        health.Services["redis"] = "up"
    }
    
    statusCode := http.StatusOK
    if health.Status != "ok" {
        statusCode = http.StatusServiceUnavailable
    }
    
    c.JSON(statusCode, health)
}
```
