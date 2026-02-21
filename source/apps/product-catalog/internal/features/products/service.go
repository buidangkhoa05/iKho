package products

import (
	"context"
	"fmt"
	"time"

	"github.com/buidangkhoa05/iKho/apps/product-catalog/internal/domain"
)

// Service contains the business logic for managing products.
type Service struct {
	repo Repository
}

// NewService creates a new product Service.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// List returns all products.
func (s *Service) List(ctx context.Context) ([]domain.Product, error) {
	return s.repo.List(ctx)
}

// GetByID returns a single product by ID.
func (s *Service) GetByID(ctx context.Context, id string) (domain.Product, error) {
	return s.repo.GetByID(ctx, id)
}

// Create validates the request and persists a new product.
func (s *Service) Create(ctx context.Context, req CreateProductRequest) (domain.Product, error) {
	if err := req.Validate(); err != nil {
		return domain.Product{}, fmt.Errorf("validation: %w", err)
	}

	now := time.Now().UTC()
	p := domain.Product{
		ID:      generateID(), // TODO: replace with proper ID generation
		SKU:     req.SKU,
		Barcode: req.Barcode,
		Name:    req.Name,
		Description: req.Description,
		Dimensions: domain.Dimensions{
			Length: req.Dimensions.Length,
			Width:  req.Dimensions.Width,
			Height: req.Dimensions.Height,
			Unit:   req.Dimensions.Unit,
		},
		Weight: domain.Weight{
			Value: req.Weight.Value,
			Unit:  req.Weight.Unit,
		},
		HazardClass: req.HazardClass,
		CategoryID:  req.CategoryID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.repo.Create(ctx, p); err != nil {
		return domain.Product{}, fmt.Errorf("creating product: %w", err)
	}
	return p, nil
}

// Update validates the request and updates an existing product.
func (s *Service) Update(ctx context.Context, id string, req UpdateProductRequest) (domain.Product, error) {
	if err := req.Validate(); err != nil {
		return domain.Product{}, fmt.Errorf("validation: %w", err)
	}

	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return domain.Product{}, fmt.Errorf("fetching product: %w", err)
	}

	// Apply partial updates
	if req.SKU != nil {
		existing.SKU = *req.SKU
	}
	if req.Barcode != nil {
		existing.Barcode = *req.Barcode
	}
	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.Description != nil {
		existing.Description = *req.Description
	}
	if req.Dimensions != nil {
		existing.Dimensions = domain.Dimensions{
			Length: req.Dimensions.Length,
			Width:  req.Dimensions.Width,
			Height: req.Dimensions.Height,
			Unit:   req.Dimensions.Unit,
		}
	}
	if req.Weight != nil {
		existing.Weight = domain.Weight{
			Value: req.Weight.Value,
			Unit:  req.Weight.Unit,
		}
	}
	if req.HazardClass != nil {
		existing.HazardClass = *req.HazardClass
	}
	if req.CategoryID != nil {
		existing.CategoryID = *req.CategoryID
	}
	existing.UpdatedAt = time.Now().UTC()

	if err := s.repo.Update(ctx, existing); err != nil {
		return domain.Product{}, fmt.Errorf("updating product: %w", err)
	}
	return existing, nil
}

// Delete removes a product by ID.
func (s *Service) Delete(ctx context.Context, id string) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("deleting product: %w", err)
	}
	return nil
}

// generateID produces a simple unique ID. Replace with UUID in production.
func generateID() string {
	return fmt.Sprintf("prod_%d", time.Now().UnixNano())
}
