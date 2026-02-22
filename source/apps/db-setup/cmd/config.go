package cmd

import (
	"fmt"
	"os"
)

// Database configuration — read from environment variables with sensible defaults.
// Override by setting the corresponding env var before running, e.g.:
//
//	DB_HOST=remote.example.com DB_NAME=orders ./db-setup migrate up
var (
	dbHost        = envOrDefault("DB_HOST", "localhost")
	dbPort        = envOrDefault("DB_PORT", "5432")
	dbUser        = envOrDefault("DB_USER", "postgres")
	dbPassword    = envOrDefault("DB_PASSWORD", "password")
	dbName        = envOrDefault("DB_NAME", "mydb")
	dbSSLMode     = envOrDefault("DB_SSLMODE", "disable")
	containerName = envOrDefault("CONTAINER_NAME", "ikho-postgres")
	postgresImage = envOrDefault("POSTGRES_IMAGE", "postgres:16")
)

const (
	maxRetries    = 20
	retryDelaySec = 2
)

// buildDBURL returns a postgres connection string from the current config.
func buildDBURL() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		dbUser, dbPassword, dbHost, dbPort, dbName, dbSSLMode)
}

// envOrDefault returns the value of the environment variable named key,
// or fallback if the variable is empty or unset.
func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
