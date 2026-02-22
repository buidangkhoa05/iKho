-- ── Categories ─────────────────────────────────────────────────────────────

-- name: CreateCategory :one
INSERT INTO categories (name, description, parent_id)
VALUES ($1, $2, $3)
RETURNING id, name, description, parent_id, created_at, updated_at;

-- name: GetCategoryByID :one
SELECT id, name, description, parent_id, created_at, updated_at
FROM categories
WHERE id = $1 LIMIT 1;

-- name: ListCategories :many
SELECT id, name, description, parent_id, created_at, updated_at
FROM categories
ORDER BY name ASC;

-- name: UpdateCategory :one
UPDATE categories
SET name        = COALESCE(NULLIF($2, ''), name),
    description = COALESCE(NULLIF($3, ''), description),
    parent_id   = $4,
    updated_at  = NOW()
WHERE id = $1
RETURNING id, name, description, parent_id, created_at, updated_at;

-- name: DeleteCategory :exec
DELETE FROM categories WHERE id = $1;

-- ── Products ──────────────────────────────────────────────────────────────

-- name: CreateProduct :one
-- INSERT INTO products (sku, barcode, name, description, dimensions, weight, hazard_class, category_id)
-- VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
-- RETURNING id, sku, barcode, name, description, dimensions, weight, hazard_class, category_id, created_at, updated_at;

-- name: GetProductByID :one
-- SELECT id, sku, barcode, name, description, dimensions, weight, hazard_class, category_id, created_at, updated_at
-- FROM products
-- WHERE id = $1 LIMIT 1;

-- name: ListProducts :many
-- SELECT id, sku, barcode, name, description, dimensions, weight, hazard_class, category_id, created_at, updated_at
-- FROM products
-- ORDER BY created_at DESC;

-- name: UpdateProduct :one
-- UPDATE products
-- SET sku          = COALESCE(NULLIF($2, ''), sku),
--     barcode      = COALESCE(NULLIF($3, ''), barcode),
--     name         = COALESCE(NULLIF($4, ''), name),
--     description  = COALESCE(NULLIF($5, ''), description),
--     dimensions   = COALESCE($6, dimensions),
--     weight       = COALESCE($7, weight),
--     hazard_class = COALESCE(NULLIF($8, ''), hazard_class),
--     category_id  = COALESCE($9, category_id),
--     updated_at   = NOW()
-- WHERE id = $1
-- RETURNING id, sku, barcode, name, description, dimensions, weight, hazard_class, category_id, created_at, updated_at;

-- name: DeleteProduct :exec
-- DELETE FROM products WHERE id = $1;
