CREATE TABLE products (
    id           BIGSERIAL    PRIMARY KEY,
    sku          VARCHAR(100) NOT NULL UNIQUE,
    barcode      VARCHAR(100) NOT NULL DEFAULT '',
    name         TEXT         NOT NULL,
    description  TEXT         NOT NULL DEFAULT '',
    dimensions   JSONB        NOT NULL DEFAULT '{}',
    weight       JSONB        NOT NULL DEFAULT '{}',
    hazard_class VARCHAR(50)  NOT NULL DEFAULT '',
    category_id  BIGINT       REFERENCES categories(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products (sku);
CREATE INDEX idx_products_category_id ON products (category_id);
