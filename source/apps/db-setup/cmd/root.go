// Package cmd implements the CLI commands for db-setup.
package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "db-setup",
	Short: "db-setup — DB migration and code-generation CLI",
	Long: `db-setup is a developer CLI for managing PostgreSQL migrations
and generating type-safe Go code from SQL queries.

Commands:
  migrate   Run database migrations (up / down / status)
  generate  Run sqlc generate, split models into per-struct files, and compile-check`,
	Run: func(cmd *cobra.Command, _ []string) {
		fmt.Println(cmd.Long)
		fmt.Println()
		_ = cmd.Help()
	},
}

// Execute runs the root command. Called from main.go.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}

func init() {
	rootCmd.AddCommand(migrateCmd)
	rootCmd.AddCommand(generateCmd)
	rootCmd.AddCommand(dumpCmd)
}
