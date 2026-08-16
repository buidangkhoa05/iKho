-- Runs once against an empty postgres data volume (docker-entrypoint-initdb.d).
-- Each warehouse service owns its own database on the shared postgres instance
-- (see Database:ConnectionString in every apps/ikho-warehouse-*/appsettings.json).
CREATE DATABASE ikho_warehouse_organization OWNER ikho;
CREATE DATABASE ikho_warehouse_catalog OWNER ikho;
CREATE DATABASE ikho_warehouse_partner OWNER ikho;
CREATE DATABASE ikho_warehouse_inventory OWNER ikho;
CREATE DATABASE ikho_warehouse_inbound OWNER ikho;
CREATE DATABASE ikho_warehouse_outbound OWNER ikho;
CREATE DATABASE ikho_warehouse_returns OWNER ikho;
CREATE DATABASE ikho_warehouse_billing OWNER ikho;
CREATE DATABASE ikho_warehouse_reporting OWNER ikho;
CREATE DATABASE ikho_identity OWNER ikho;
