package categories

import (
	"context"
	"fmt"
	"sync"

	"github.com/buidangkhoa05/iKho/apps/product-catalog/internal/domain"
)

// MemoryRepository is an in-memory implementation of Repository for local dev / template purposes.
type MemoryRepository struct {
	mu    sync.RWMutex
	store map[string]domain.Category
}

// NewMemoryRepository creates a new in-memory category repository.
func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		store: make(map[string]domain.Category),
	}
}

func (r *MemoryRepository) List(_ context.Context) ([]domain.Category, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	items := make([]domain.Category, 0, len(r.store))
	for _, c := range r.store {
		items = append(items, c)
	}
	return items, nil
}

func (r *MemoryRepository) GetByID(_ context.Context, id string) (domain.Category, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	c, ok := r.store[id]
	if !ok {
		return domain.Category{}, fmt.Errorf("category %s not found", id)
	}
	return c, nil
}

func (r *MemoryRepository) Create(_ context.Context, c domain.Category) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.store[c.ID]; exists {
		return fmt.Errorf("category %s already exists", c.ID)
	}
	r.store[c.ID] = c
	return nil
}
