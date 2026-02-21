package categories

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/buidangkhoa05/iKho/apps/product-catalog/internal/domain"
	"github.com/buidangkhoa05/iKho/apps/product-catalog/internal/shared"
)

// Handler holds dependencies for category HTTP handlers.
type Handler struct {
	svc *Service
}

// NewHandler creates a new category Handler.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes wires category endpoints onto the given Echo group.
func RegisterRoutes(g *echo.Group) {
	repo := NewMemoryRepository()
	svc := NewService(repo)
	h := NewHandler(svc)

	cats := g.Group("/categories")
	cats.GET("", h.HandleList)
	cats.GET("/:id", h.HandleGetByID)
	cats.POST("", h.HandleCreate)
}

// HandleList returns all categories.
func (h *Handler) HandleList(c echo.Context) error {
	items, err := h.svc.List(c.Request().Context())
	if err != nil {
		return shared.WriteError(c, http.StatusInternalServerError, err.Error())
	}

	resp := make([]CategoryResponse, 0, len(items))
	for _, cat := range items {
		resp = append(resp, toCategoryResponse(cat))
	}

	return c.JSON(http.StatusOK, shared.ListResponse[CategoryResponse]{
		Data:  resp,
		Total: len(resp),
	})
}

// HandleGetByID returns a single category.
func (h *Handler) HandleGetByID(c echo.Context) error {
	id := c.Param("id")

	cat, err := h.svc.GetByID(c.Request().Context(), id)
	if err != nil {
		return shared.WriteNotFound(c, "category")
	}

	return c.JSON(http.StatusOK, toCategoryResponse(cat))
}

// HandleCreate creates a new category.
func (h *Handler) HandleCreate(c echo.Context) error {
	var req CreateCategoryRequest
	if err := c.Bind(&req); err != nil {
		return shared.WriteBadRequest(c, "invalid request body")
	}

	cat, err := h.svc.Create(c.Request().Context(), req)
	if err != nil {
		return shared.WriteBadRequest(c, err.Error())
	}

	return c.JSON(http.StatusCreated, toCategoryResponse(cat))
}

func toCategoryResponse(cat domain.Category) CategoryResponse {
	return CategoryResponse{
		ID:          cat.ID,
		Name:        cat.Name,
		Description: cat.Description,
		ParentID:    cat.ParentID,
		CreatedAt:   cat.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   cat.UpdatedAt.Format(time.RFC3339),
	}
}
