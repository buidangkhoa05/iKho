// Package shared provides common response helpers and error types.
package shared

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// ErrorResponse is the standard error payload returned by the API.
type ErrorResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// ListResponse wraps a paginated list of items.
type ListResponse[T any] struct {
	Data  []T `json:"data"`
	Total int `json:"total"`
}

// WriteError sends a JSON error response.
func WriteError(c echo.Context, code int, message string) error {
	return c.JSON(code, ErrorResponse{
		Code:    code,
		Message: message,
	})
}

// WriteNotFound sends a 404 error response.
func WriteNotFound(c echo.Context, resource string) error {
	return WriteError(c, http.StatusNotFound, resource+" not found")
}

// WriteBadRequest sends a 400 error response.
func WriteBadRequest(c echo.Context, message string) error {
	return WriteError(c, http.StatusBadRequest, message)
}
