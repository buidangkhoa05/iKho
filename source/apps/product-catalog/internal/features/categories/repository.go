package categories

import (
	"context"

	"github.com/buidangkhoa05/iKho/apps/product-catalog/internal/domain"
)

// Repository defines the data-access contract for categories.
type Repository interface {
	List(ctx context.Context) ([]domain.Category, error)
	GetByID(ctx context.Context, id string) (domain.Category, error)
	Create(ctx context.Context, c domain.Category) error
}
