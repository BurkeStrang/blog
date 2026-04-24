package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"blogapi/validation"
	"github.com/gin-gonic/gin"
)

// RequestValidationMiddleware validates incoming JSON requests
func RequestValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only validate JSON requests
		contentType := c.GetHeader("Content-Type")
		if !strings.Contains(contentType, "application/json") {
			c.Next()
			return
		}

		// Only validate POST, PUT, PATCH requests
		if c.Request.Method != "POST" && c.Request.Method != "PUT" && c.Request.Method != "PATCH" {
			c.Next()
			return
		}

		// Read the body
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "failed to read request body",
				"code":  "INVALID_REQUEST_BODY",
			})
			c.Abort()
			return
		}

		// Restore the body for the next handler
		c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

		// Skip validation for empty bodies
		if len(body) == 0 {
			c.Next()
			return
		}

		// Validate JSON structure
		if err := validation.ValidateJSON(body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "invalid JSON format",
				"code":  "INVALID_JSON",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// Check for reasonable size limits
		const maxRequestSize = 50 * 1024 * 1024 // 50MB
		if len(body) > maxRequestSize {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": "request body too large",
				"code":  "REQUEST_TOO_LARGE",
				"max_size": maxRequestSize,
				"actual_size": len(body),
			})
			c.Abort()
			return
		}

		// Check for potentially malicious content
		bodyStr := string(body)
		if containsMaliciousContent(bodyStr) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "request contains potentially malicious content",
				"code":  "MALICIOUS_CONTENT",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// ResponseValidationMiddleware validates outgoing JSON responses
func ResponseValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Use a custom response writer to capture the response
		writer := &validationResponseWriter{
			ResponseWriter: c.Writer,
			body:          make([]byte, 0),
		}
		c.Writer = writer

		c.Next()

		// Validate the response if it's JSON
		contentType := writer.Header().Get("Content-Type")
		if strings.Contains(contentType, "application/json") && len(writer.body) > 0 {
			if err := validateResponse(writer.body); err != nil {
				// Log the error but don't change the response in production
				// In development, you might want to return an error
				fmt.Printf("Response validation error: %v\n", err)
				
				// Optionally replace with error response in development
				if gin.Mode() == gin.DebugMode {
					writer.Header().Set("Content-Type", "application/json")
					errorResponse := gin.H{
						"error": "invalid response format",
						"code":  "INVALID_RESPONSE",
						"details": err.Error(),
					}
					errorJSON, _ := json.Marshal(errorResponse)
					writer.ResponseWriter.Header().Set("Content-Length", fmt.Sprintf("%d", len(errorJSON)))
					writer.ResponseWriter.WriteHeader(http.StatusInternalServerError)
					writer.ResponseWriter.Write(errorJSON)
					return
				}
			}
		}
	}
}

// validationResponseWriter captures response data for validation
type validationResponseWriter struct {
	gin.ResponseWriter
	body   []byte
	status int
}

func (w *validationResponseWriter) Write(data []byte) (int, error) {
	w.body = append(w.body, data...)
	return w.ResponseWriter.Write(data)
}

func (w *validationResponseWriter) WriteHeader(statusCode int) {
	w.status = statusCode
	w.ResponseWriter.WriteHeader(statusCode)
}

// containsMaliciousContent checks for potentially dangerous content
func containsMaliciousContent(content string) bool {
	lowerContent := strings.ToLower(content)
	
	// Check for script injection attempts
	dangerousPatterns := []string{
		"<script",
		"javascript:",
		"data:",
		"vbscript:",
		"onload=",
		"onerror=",
		"onclick=",
		"onfocus=",
		"onmouseover=",
		"eval(",
		"document.cookie",
		"document.write",
		"window.location",
		"alert(",
		"confirm(",
		"prompt(",
		"expression(",
		"@import",
		"behaviour:",
		"-moz-binding",
	}
	
	for _, pattern := range dangerousPatterns {
		if strings.Contains(lowerContent, pattern) {
			return true
		}
	}
	
	return false
}

// validateResponse validates the structure and safety of response data
func validateResponse(data []byte) error {
	// Validate JSON structure
	if err := validation.ValidateJSON(data); err != nil {
		return fmt.Errorf("invalid JSON in response: %w", err)
	}
	
	// Check for actual JSON concatenation (not just legitimate content)
	// Look for patterns like }[ or ]{ or }{ or ][ with minimal whitespace
	concatenationPatterns := [][]byte{
		[]byte("}["),
		[]byte("]{"),
		[]byte("}{"),
		[]byte("] ["),
		[]byte("} ["),
		[]byte("] {"),
		[]byte("} {"),
	}
	
	for _, pattern := range concatenationPatterns {
		if bytes.Contains(data, pattern) {
			return fmt.Errorf("detected concatenated JSON arrays in response")
		}
	}
	
	// Check for reasonable size
	const maxResponseSize = 100 * 1024 * 1024 // 100MB
	if len(data) > maxResponseSize {
		return fmt.Errorf("response too large: %d bytes (max: %d)", len(data), maxResponseSize)
	}
	
	// Parse and validate structure
	var parsed interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		return fmt.Errorf("response JSON parsing failed: %w", err)
	}
	
	// Additional validation based on response type
	if err := validateResponseContent(parsed); err != nil {
		return fmt.Errorf("response content validation failed: %w", err)
	}
	
	return nil
}

// validateResponseContent performs deep validation of response content
func validateResponseContent(data interface{}) error {
	switch v := data.(type) {
	case map[string]interface{}:
		return validateJSONObject(v)
	case []interface{}:
		return validateJSONArray(v)
	default:
		return nil // Primitive types are generally safe
	}
}

// validateJSONObject validates a JSON object
func validateJSONObject(obj map[string]interface{}) error {
	for key, value := range obj {
		// Validate key
		if len(key) > 100 {
			return fmt.Errorf("object key too long: %s", key)
		}
		
		// Recursively validate value
		if err := validateResponseContent(value); err != nil {
			return err
		}
		
		// Check for potentially sensitive keys
		if containsSensitiveKey(key) && value != nil {
			return fmt.Errorf("response contains potentially sensitive data in key: %s", key)
		}
	}
	return nil
}

// validateJSONArray validates a JSON array
func validateJSONArray(arr []interface{}) error {
	// Check array size
	if len(arr) > 10000 {
		return fmt.Errorf("array too large: %d items (max: 10000)", len(arr))
	}
	
	// Validate each item
	for i, item := range arr {
		if err := validateResponseContent(item); err != nil {
			return fmt.Errorf("array item %d validation failed: %w", i, err)
		}
	}
	
	return nil
}

// containsSensitiveKey checks if a key might contain sensitive information
func containsSensitiveKey(key string) bool {
	lowerKey := strings.ToLower(key)
	sensitiveKeys := []string{
		"password",
		"secret",
		"token",
		"private_key",
		"api_key", 
		"credential",
		"session",
		"cookie",
	}
	
	// Exact matches only for sensitive keys
	for _, sensitive := range sensitiveKeys {
		if lowerKey == sensitive {
			return true
		}
	}
	
	return false
}

// InputSanitizationMiddleware sanitizes input data
func InputSanitizationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Sanitize query parameters
		for key, values := range c.Request.URL.Query() {
			for i, value := range values {
				c.Request.URL.Query()[key][i] = validation.SanitizeHTML(value)
			}
		}
		
		c.Next()
	}
}

// SecurityHeadersMiddleware adds security headers to responses
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent MIME type sniffing
		c.Header("X-Content-Type-Options", "nosniff")
		
		// Prevent clickjacking
		c.Header("X-Frame-Options", "DENY")
		
		// Enable XSS protection
		c.Header("X-XSS-Protection", "1; mode=block")
		
		// Prevent information disclosure
		c.Header("X-Powered-By", "")
		
		// Content Security Policy for API responses
		c.Header("Content-Security-Policy", "default-src 'none'")
		
		c.Next()
	}
}