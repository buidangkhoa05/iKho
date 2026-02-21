package products_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"

	"github.com/buidangkhoa05/iKho/apps/product-catalog/internal/features/products"
)

func TestHandleList(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		path       string
		wantStatus int
	}{
		{
			name:       "list products returns 200",
			method:     http.MethodGet,
			path:       "/api/v1/products",
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			e := echo.New()
			api := e.Group("/api/v1")
			products.RegisterRoutes(api)

			req := httptest.NewRequest(tt.method, tt.path, nil)
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			rec := httptest.NewRecorder()

			e.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d", rec.Code, tt.wantStatus)
			}
		})
	}
}

func TestHandleCreate(t *testing.T) {
	e := echo.New()
	api := e.Group("/api/v1")
	products.RegisterRoutes(api)

	body := `{"sku":"SKU-001","name":"Test Product","barcode":"1234567890"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/products", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()

	e.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Errorf("got status %d, want %d", rec.Code, http.StatusCreated)
	}
}
