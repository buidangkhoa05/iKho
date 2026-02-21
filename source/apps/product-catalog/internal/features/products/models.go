package products

// CreateProductRequest is the payload for creating a new product.
type CreateProductRequest struct {
	SKU         string            `json:"sku"`
	Barcode     string            `json:"barcode"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Dimensions  DimensionsRequest `json:"dimensions"`
	Weight      WeightRequest     `json:"weight"`
	HazardClass string            `json:"hazardClass"`
	CategoryID  string            `json:"categoryId"`
}

// UpdateProductRequest is the payload for updating an existing product.
type UpdateProductRequest struct {
	SKU         *string            `json:"sku,omitempty"`
	Barcode     *string            `json:"barcode,omitempty"`
	Name        *string            `json:"name,omitempty"`
	Description *string            `json:"description,omitempty"`
	Dimensions  *DimensionsRequest `json:"dimensions,omitempty"`
	Weight      *WeightRequest     `json:"weight,omitempty"`
	HazardClass *string            `json:"hazardClass,omitempty"`
	CategoryID  *string            `json:"categoryId,omitempty"`
}

// DimensionsRequest is the dimensions portion of a create/update request.
type DimensionsRequest struct {
	Length float64 `json:"length"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
	Unit   string  `json:"unit"`
}

// WeightRequest is the weight portion of a create/update request.
type WeightRequest struct {
	Value float64 `json:"value"`
	Unit  string  `json:"unit"`
}

// ProductResponse is the API representation of a product.
type ProductResponse struct {
	ID          string            `json:"id"`
	SKU         string            `json:"sku"`
	Barcode     string            `json:"barcode"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Dimensions  DimensionsRequest `json:"dimensions"`
	Weight      WeightRequest     `json:"weight"`
	HazardClass string            `json:"hazardClass"`
	CategoryID  string            `json:"categoryId"`
	CreatedAt   string            `json:"createdAt"`
	UpdatedAt   string            `json:"updatedAt"`
}
