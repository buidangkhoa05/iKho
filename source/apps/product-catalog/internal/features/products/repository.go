package products

import (
	"context"

	"github.com/buidangkhoa05/iKho/apps/product-catalog/internal/domain"
)

// Repository defines the data-access contract for products.
type Repository interface {
	List(ctx context.Context) ([]domain.Product, error)
	GetByID(ctx context.Context, id string) (domain.Product, error)
	Create(ctx context.Context, p domain.Product) error
	Update(ctx context.Context, p domain.Product) error
	Delete(ctx context.Context, id string) error
}
