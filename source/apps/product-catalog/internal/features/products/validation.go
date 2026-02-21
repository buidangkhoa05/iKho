package products

import "fmt"

// Validate checks that required fields are present in a CreateProductRequest.
func (r CreateProductRequest) Validate() error {
	if r.SKU == "" {
		return fmt.Errorf("sku is required")
	}
	if r.Name == "" {
		return fmt.Errorf("name is required")
	}
	return nil
}

// Validate checks that at least one field is set in an UpdateProductRequest.
func (r UpdateProductRequest) Validate() error {
	if r.SKU == nil && r.Barcode == nil && r.Name == nil && r.Description == nil &&
		r.Dimensions == nil && r.Weight == nil && r.HazardClass == nil && r.CategoryID == nil {
		return fmt.Errorf("at least one field must be provided")
	}
	return nil
}
