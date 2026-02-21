package products

import (
	"context"
	"fmt"
	"sync"

	"github.com/buidangkhoa05/iKho/apps/product-catalog/internal/domain"
)

// MemoryRepository is an in-memory implementation of Repository for local dev / template purposes.
type MemoryRepository struct {
	mu    sync.RWMutex
	store map[string]domain.Product
}

// NewMemoryRepository creates a new in-memory product repository.
func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		store: make(map[string]domain.Product),
	}
}

func (r *MemoryRepository) List(_ context.Context) ([]domain.Product, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	items := make([]domain.Product, 0, len(r.store))
	for _, p := range r.store {
		items = append(items, p)
	}
	return items, nil
}

func (r *MemoryRepository) GetByID(_ context.Context, id string) (domain.Product, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	p, ok := r.store[id]
	if !ok {
		return domain.Product{}, fmt.Errorf("product %s not found", id)
	}
	return p, nil
}

func (r *MemoryRepository) Create(_ context.Context, p domain.Product) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.store[p.ID]; exists {
		return fmt.Errorf("product %s already exists", p.ID)
	}
	r.store[p.ID] = p
	return nil
}

func (r *MemoryRepository) Update(_ context.Context, p domain.Product) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.store[p.ID]; !exists {
		return fmt.Errorf("product %s not found", p.ID)
	}
	r.store[p.ID] = p
	return nil
}

func (r *MemoryRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.store[id]; !exists {
		return fmt.Errorf("product %s not found", id)
	}
	delete(r.store, id)
	return nil
}
