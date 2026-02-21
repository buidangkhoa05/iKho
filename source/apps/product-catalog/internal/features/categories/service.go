package categories

import (
	"context"
	"fmt"
	"time"

	"github.com/buidangkhoa05/iKho/apps/product-catalog/internal/domain"
)

// Service contains the business logic for managing categories.
type Service struct {
	repo Repository
}

// NewService creates a new category Service.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// List returns all categories.
func (s *Service) List(ctx context.Context) ([]domain.Category, error) {
	return s.repo.List(ctx)
}

// GetByID returns a single category by ID.
func (s *Service) GetByID(ctx context.Context, id string) (domain.Category, error) {
	return s.repo.GetByID(ctx, id)
}

// Create persists a new category.
func (s *Service) Create(ctx context.Context, req CreateCategoryRequest) (domain.Category, error) {
	if req.Name == "" {
		return domain.Category{}, fmt.Errorf("validation: name is required")
	}

	now := time.Now().UTC()
	cat := domain.Category{
		ID:          fmt.Sprintf("cat_%d", now.UnixNano()),
		Name:        req.Name,
		Description: req.Description,
		ParentID:    req.ParentID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := s.repo.Create(ctx, cat); err != nil {
		return domain.Category{}, fmt.Errorf("creating category: %w", err)
	}
	return cat, nil
}
