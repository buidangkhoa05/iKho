// Package domain contains shared domain types used across feature slices.
package domain

import "time"

// Product represents the core product entity in the catalog.
// This is the canonical representation — other services keep a read-only cache.
type Product struct {
	ID          string     `json:"id"`
	SKU         string     `json:"sku"`
	Barcode     string     `json:"barcode"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	Dimensions  Dimensions `json:"dimensions"`
	Weight      Weight     `json:"weight"`
	HazardClass string     `json:"hazardClass"`
	CategoryID  string     `json:"categoryId"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

// Dimensions represents the physical dimensions of a product.
type Dimensions struct {
	Length float64 `json:"length"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
	Unit   string  `json:"unit"` // e.g. "cm", "in"
}

// Weight represents the weight of a product.
type Weight struct {
	Value float64 `json:"value"`
	Unit  string  `json:"unit"` // e.g. "kg", "lb"
}

// Category represents a product category.
type Category struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	ParentID    string    `json:"parentId,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
