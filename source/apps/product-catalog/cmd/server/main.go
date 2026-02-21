// Package main is the entrypoint for the Product Catalog service.
// It wires dependencies, registers feature routes, and starts the HTTP server.
package main

import (
	"log"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"github.com/buidangkhoa05/iKho/apps/product-catalog/internal/features/categories"
	"github.com/buidangkhoa05/iKho/apps/product-catalog/internal/features/products"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Health check
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]string{"status": "ok"})
	})

	// API v1 group
	api := e.Group("/api/v1")

	// Register feature slices
	products.RegisterRoutes(api)
	categories.RegisterRoutes(api)

	// Start server
	log.Printf("Product Catalog service starting on :%s", port)
	if err := e.Start(":" + port); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
