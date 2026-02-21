package categories

// CreateCategoryRequest is the payload for creating a new category.
type CreateCategoryRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	ParentID    string `json:"parentId,omitempty"`
}

// CategoryResponse is the API representation of a category.
type CategoryResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	ParentID    string `json:"parentId,omitempty"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}
