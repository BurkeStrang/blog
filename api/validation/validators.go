package validation

import (
	"encoding/json"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"blogapi/models"
)

// ValidationError represents a validation error
type ValidationError struct {
	Field   string      `json:"field"`
	Message string      `json:"message"`
	Value   interface{} `json:"value,omitempty"`
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("validation error on field '%s': %s", e.Field, e.Message)
}

// ValidationErrors represents multiple validation errors
type ValidationErrors []ValidationError

func (e ValidationErrors) Error() string {
	if len(e) == 0 {
		return "no validation errors"
	}

	var messages []string
	for _, err := range e {
		messages = append(messages, err.Error())
	}
	return strings.Join(messages, "; ")
}

// Common validation patterns
var (
	slugRegex  = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	urlRegex   = regexp.MustCompile(`^https?://[^\s]+$`)
)

func validateOptionalSlug(field string, value string) *ValidationError {
	if value == "" {
		return nil
	}

	if len(value) > 100 {
		return &ValidationError{
			Field:   field,
			Message: fmt.Sprintf("%s must be less than 100 characters", field),
			Value:   value,
		}
	}

	if !slugRegex.MatchString(value) {
		return &ValidationError{
			Field:   field,
			Message: fmt.Sprintf("%s must contain only lowercase letters, numbers, and hyphens", field),
			Value:   value,
		}
	}

	return nil
}

// ValidatePost validates a blog post (for creation)
func ValidatePost(post *models.Post) ValidationErrors {
	var errors ValidationErrors

	// Validate slug
	if post.Slug == "" {
		errors = append(errors, ValidationError{
			Field:   "slug",
			Message: "slug is required",
			Value:   post.Slug,
		})
	} else if len(post.Slug) > 100 {
		errors = append(errors, ValidationError{
			Field:   "slug",
			Message: "slug must be less than 100 characters",
			Value:   post.Slug,
		})
	} else if !slugRegex.MatchString(post.Slug) {
		errors = append(errors, ValidationError{
			Field:   "slug",
			Message: "slug must contain only lowercase letters, numbers, and hyphens",
			Value:   post.Slug,
		})
	}

	// Validate title
	if post.Title == "" {
		errors = append(errors, ValidationError{
			Field:   "title",
			Message: "title is required",
			Value:   post.Title,
		})
	} else if len(post.Title) > 200 {
		errors = append(errors, ValidationError{
			Field:   "title",
			Message: "title must be less than 200 characters",
			Value:   len(post.Title),
		})
	}

	// Validate body
	if post.Body == "" {
		errors = append(errors, ValidationError{
			Field:   "body",
			Message: "body is required",
			Value:   post.Body,
		})
	} else if len(post.Body) > 1000000 { // 1MB limit
		errors = append(errors, ValidationError{
			Field:   "body",
			Message: "body exceeds maximum length of 1MB",
			Value:   len(post.Body),
		})
	}

	// Validate author
	if post.Author == "" {
		errors = append(errors, ValidationError{
			Field:   "author",
			Message: "author is required",
			Value:   post.Author,
		})
	} else if len(post.Author) > 100 {
		errors = append(errors, ValidationError{
			Field:   "author",
			Message: "author must be less than 100 characters",
			Value:   post.Author,
		})
	}

	if validationErr := validateOptionalSlug("previous", post.Previous); validationErr != nil {
		errors = append(errors, *validationErr)
	}

	if validationErr := validateOptionalSlug("next", post.Next); validationErr != nil {
		errors = append(errors, *validationErr)
	}

	return errors
}

// ValidatePostUpdate validates a blog post update (author not required)
func ValidatePostUpdate(post *models.Post) ValidationErrors {
	var errors ValidationErrors

	// Validate slug
	if post.Slug == "" {
		errors = append(errors, ValidationError{
			Field:   "slug",
			Message: "slug is required",
			Value:   post.Slug,
		})
	} else if len(post.Slug) > 100 {
		errors = append(errors, ValidationError{
			Field:   "slug",
			Message: "slug must be less than 100 characters",
			Value:   post.Slug,
		})
	} else if !slugRegex.MatchString(post.Slug) {
		errors = append(errors, ValidationError{
			Field:   "slug",
			Message: "slug must contain only lowercase letters, numbers, and hyphens",
			Value:   post.Slug,
		})
	}

	// Validate title
	if post.Title == "" {
		errors = append(errors, ValidationError{
			Field:   "title",
			Message: "title is required",
			Value:   post.Title,
		})
	} else if len(post.Title) > 200 {
		errors = append(errors, ValidationError{
			Field:   "title",
			Message: "title must be less than 200 characters",
			Value:   len(post.Title),
		})
	}

	// Validate body
	if post.Body == "" {
		errors = append(errors, ValidationError{
			Field:   "body",
			Message: "body is required",
			Value:   post.Body,
		})
	} else if len(post.Body) > 1000000 { // 1MB limit
		errors = append(errors, ValidationError{
			Field:   "body",
			Message: "body exceeds maximum length of 1MB",
			Value:   len(post.Body),
		})
	}

	// Skip author validation for updates - we don't want to change the author

	// Validate view counts are non-negative
	if post.PageViews < 0 {
		errors = append(errors, ValidationError{
			Field:   "pageViews",
			Message: "page views cannot be negative",
			Value:   post.PageViews,
		})
	}

	if post.RecentViews < 0 {
		errors = append(errors, ValidationError{
			Field:   "recentViews",
			Message: "recent views cannot be negative",
			Value:   post.RecentViews,
		})
	}

	if validationErr := validateOptionalSlug("previous", post.Previous); validationErr != nil {
		errors = append(errors, *validationErr)
	}

	if validationErr := validateOptionalSlug("next", post.Next); validationErr != nil {
		errors = append(errors, *validationErr)
	}

	return errors
}

// ValidateComment validates a comment
func ValidateComment(comment *models.Comment) ValidationErrors {
	var errors ValidationErrors

	// Validate PostID
	if comment.PostID == 0 {
		errors = append(errors, ValidationError{
			Field:   "post_id",
			Message: "post_id is required",
			Value:   comment.PostID,
		})
	}

	// Validate content
	if comment.Content == "" {
		errors = append(errors, ValidationError{
			Field:   "content",
			Message: "content is required",
			Value:   comment.Content,
		})
	} else if len(comment.Content) > 10000 {
		errors = append(errors, ValidationError{
			Field:   "content",
			Message: "content must be less than 10,000 characters",
			Value:   len(comment.Content),
		})
	}

	// Validate author
	if comment.Author == "" {
		errors = append(errors, ValidationError{
			Field:   "author",
			Message: "author is required",
			Value:   comment.Author,
		})
	} else if len(comment.Author) > 100 {
		errors = append(errors, ValidationError{
			Field:   "author",
			Message: "author must be less than 100 characters",
			Value:   comment.Author,
		})
	}

	return errors
}

// ValidateUser validates a user
func ValidateUser(user *models.User) ValidationErrors {
	var errors ValidationErrors

	// Validate username
	if user.Username == "" {
		errors = append(errors, ValidationError{
			Field:   "username",
			Message: "username is required",
			Value:   user.Username,
		})
	} else if len(user.Username) < 3 {
		errors = append(errors, ValidationError{
			Field:   "username",
			Message: "username must be at least 3 characters",
			Value:   user.Username,
		})
	} else if len(user.Username) > 50 {
		errors = append(errors, ValidationError{
			Field:   "username",
			Message: "username must be less than 50 characters",
			Value:   user.Username,
		})
	}

	// Validate email
	if user.Email == "" {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "email is required",
			Value:   user.Email,
		})
	} else if !emailRegex.MatchString(user.Email) {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "email format is invalid",
			Value:   user.Email,
		})
	}

	// Validate name
	if user.Name == "" {
		errors = append(errors, ValidationError{
			Field:   "name",
			Message: "name is required",
			Value:   user.Name,
		})
	} else if len(user.Name) > 100 {
		errors = append(errors, ValidationError{
			Field:   "name",
			Message: "name must be less than 100 characters",
			Value:   user.Name,
		})
	}

	// Validate role
	validRoles := map[string]bool{"user": true, "admin": true, "moderator": true}
	if user.Role != "" && !validRoles[user.Role] {
		errors = append(errors, ValidationError{
			Field:   "role",
			Message: "role must be one of: user, admin, moderator",
			Value:   user.Role,
		})
	}

	// Validate picture URL if provided
	if user.Picture != "" && !urlRegex.MatchString(user.Picture) {
		errors = append(errors, ValidationError{
			Field:   "picture",
			Message: "picture must be a valid URL",
			Value:   user.Picture,
		})
	}

	return errors
}

// SanitizeHTML removes potentially dangerous HTML content
func SanitizeHTML(input string) string {
	// Remove script tags and their content
	scriptRegex := regexp.MustCompile(`(?i)<script[^>]*>.*?</script>`)
	input = scriptRegex.ReplaceAllString(input, "")

	// Remove potentially dangerous attributes
	onEventRegex := regexp.MustCompile(`(?i)\s+on\w+\s*=\s*[^>]*`)
	input = onEventRegex.ReplaceAllString(input, "")

	// Remove javascript: links
	jsLinkRegex := regexp.MustCompile(`(?i)javascript:\s*[^"'>\s]*`)
	input = jsLinkRegex.ReplaceAllString(input, "")

	return input
}

// ValidateJSON checks if a string is valid JSON
func ValidateJSON(data []byte) error {
	var temp interface{}
	if err := json.Unmarshal(data, &temp); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}
	return nil
}

// ValidateStringLength validates string length with UTF-8 awareness
func ValidateStringLength(value string, fieldName string, minLength, maxLength int) *ValidationError {
	length := utf8.RuneCountInString(value)

	if length < minLength {
		return &ValidationError{
			Field:   fieldName,
			Message: fmt.Sprintf("must be at least %d characters", minLength),
			Value:   length,
		}
	}

	if length > maxLength {
		return &ValidationError{
			Field:   fieldName,
			Message: fmt.Sprintf("must be less than %d characters", maxLength),
			Value:   length,
		}
	}

	return nil
}

// ValidateURL validates URL format and safety
func ValidateURL(urlStr string, fieldName string) *ValidationError {
	if urlStr == "" {
		return nil // Allow empty URLs if optional
	}

	parsed, err := url.Parse(urlStr)
	if err != nil {
		return &ValidationError{
			Field:   fieldName,
			Message: "invalid URL format",
			Value:   urlStr,
		}
	}

	// Only allow http and https schemes
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return &ValidationError{
			Field:   fieldName,
			Message: "URL must use http or https protocol",
			Value:   parsed.Scheme,
		}
	}

	return nil
}

// ValidateTimeRange validates that time values are reasonable
func ValidateTimeRange(timeValue time.Time, fieldName string) *ValidationError {
	now := time.Now()

	// Don't allow times more than 10 years in the future
	if timeValue.After(now.AddDate(10, 0, 0)) {
		return &ValidationError{
			Field:   fieldName,
			Message: "time cannot be more than 10 years in the future",
			Value:   timeValue,
		}
	}

	// Don't allow times more than 100 years in the past
	if timeValue.Before(now.AddDate(-100, 0, 0)) {
		return &ValidationError{
			Field:   fieldName,
			Message: "time cannot be more than 100 years in the past",
			Value:   timeValue,
		}
	}

	return nil
}

// ValidateSearchQuery validates search query parameters
func ValidateSearchQuery(query string) ValidationErrors {
	var errors ValidationErrors

	if len(query) > 200 {
		errors = append(errors, ValidationError{
			Field:   "query",
			Message: "search query must be less than 200 characters",
			Value:   len(query),
		})
	}

	// Check for potentially malicious patterns
	maliciousPatterns := []string{
		"<script",
		"javascript:",
		"data:",
		"vbscript:",
		"onload",
		"onerror",
	}

	lowerQuery := strings.ToLower(query)
	for _, pattern := range maliciousPatterns {
		if strings.Contains(lowerQuery, pattern) {
			errors = append(errors, ValidationError{
				Field:   "query",
				Message: "search query contains potentially malicious content",
				Value:   pattern,
			})
			break
		}
	}

	return errors
}
