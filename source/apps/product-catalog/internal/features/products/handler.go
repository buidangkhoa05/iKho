package products

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/buidangkhoa05/iKho/apps/product-catalog/internal/domain"
	"github.com/buidangkhoa05/iKho/apps/product-catalog/internal/shared"
)

// Handler holds dependencies for product HTTP handlers.
type Handler struct {
	svc *Service
}

// NewHandler creates a new product Handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes wires product endpoints onto the given Echo group.
// Each feature slice owns its own route registration.
func RegisterRoutes(g *echo.Group) {
	repo := NewMemoryRepository()
	svc := NewService(repo)
	h := NewHandler(svc)

	products := g.Group("/products")
	products.GET("", h.HandleList)
	products.GET("/:id", h.HandleGetByID)
	products.POST("", h.HandleCreate)
	products.PUT("/:id", h.HandleUpdate)
	products.DELETE("/:id", h.HandleDelete)
}

// HandleList returns all products.
func (h *Handler) HandleList(c echo.Context) error {
	items, err := h.svc.List(c.Request().Context())
	if err != nil {
		return shared.WriteError(c, http.StatusInternalServerError, err.Error())
	}

	resp := make([]ProductResponse, 0, len(items))
	for _, p := range items {
		resp = append(resp, toProductResponse(p))
	}

	return c.JSON(http.StatusOK, shared.ListResponse[ProductResponse]{
		Data:  resp,
		Total: len(resp),
	})
}

// HandleGetByID returns a single product.
func (h *Handler) HandleGetByID(c echo.Context) error {
	id := c.Param("id")

	p, err := h.svc.GetByID(c.Request().Context(), id)
	if err != nil {
		return shared.WriteNotFound(c, "product")
	}

	return c.JSON(http.StatusOK, toProductResponse(p))
}

// HandleCreate creates a new product.
func (h *Handler) HandleCreate(c echo.Context) error {
	var req CreateProductRequest
	if err := c.Bind(&req); err != nil {
		return shared.WriteBadRequest(c, "invalid request body")
	}

	p, err := h.svc.Create(c.Request().Context(), req)
	if err != nil {
		return shared.WriteBadRequest(c, err.Error())
	}

	return c.JSON(http.StatusCreated, toProductResponse(p))
}

// HandleUpdate updates an existing product.
func (h *Handler) HandleUpdate(c echo.Context) error {
	id := c.Param("id")

	var req UpdateProductRequest
	if err := c.Bind(&req); err != nil {
		return shared.WriteBadRequest(c, "invalid request body")
	}

	p, err := h.svc.Update(c.Request().Context(), id, req)
	if err != nil {
		return shared.WriteNotFound(c, "product")
	}

	return c.JSON(http.StatusOK, toProductResponse(p))
}

// HandleDelete removes a product.
func (h *Handler) HandleDelete(c echo.Context) error {
	id := c.Param("id")

	if err := h.svc.Delete(c.Request().Context(), id); err != nil {
		return shared.WriteNotFound(c, "product")
	}

	return c.NoContent(http.StatusNoContent)
}

func toProductResponse(p domain.Product) ProductResponse {
	return ProductResponse{
		ID:          p.ID,
		SKU:         p.SKU,
		Barcode:     p.Barcode,
		Name:        p.Name,
		Description: p.Description,
		Dimensions: DimensionsRequest{
			Length: p.Dimensions.Length,
			Width:  p.Dimensions.Width,
			Height: p.Dimensions.Height,
			Unit:   p.Dimensions.Unit,
		},
		Weight: WeightRequest{
			Value: p.Weight.Value,
			Unit:  p.Weight.Unit,
		},
		HazardClass: p.HazardClass,
		CategoryID:  p.CategoryID,
		CreatedAt:   p.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   p.UpdatedAt.Format(time.RFC3339),
	}
}
