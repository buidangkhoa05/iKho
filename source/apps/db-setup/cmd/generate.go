package cmd

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/buidangkhoa05/iKho/apps/db-setup/internal/splitter"

	"github.com/spf13/cobra"
)

var generateCmd = &cobra.Command{
	Use:   "generate",
	Short: "Run sqlc generate, split models, and compile-check",
	Long: `generate runs three steps in sequence:

  1. sqlc generate       — regenerates db/ from query.sql + migrations/
  2. model split         — splits db/models.go into one .go file per struct
  3. go build ./...      — compile-checks the entire project`,
	RunE:         runGenerate,
	SilenceUsage: true,
}

func runGenerate(_ *cobra.Command, _ []string) error {
	root, err := projectRoot()
	if err != nil {
		return err
	}

	// Step 1: sqlc generate.
	fmt.Println("\n==> Step 1/3: Running sqlc generate...")
	sqlcCmd := exec.Command("sqlc", "generate")
	sqlcCmd.Dir = root
	sqlcCmd.Stdout = os.Stdout
	sqlcCmd.Stderr = os.Stderr
	if err := sqlcCmd.Run(); err != nil {
		return fmt.Errorf("sqlc generate failed: %w", err)
	}
	fmt.Println("    [OK] sqlc generate completed.")

	// Step 2: split db/models.go into per-struct files.
	fmt.Println("\n==> Step 2/3: Splitting db/models.go into per-struct files...")
	modelsFile := filepath.Join(root, "db", "models.go")
	outDir := filepath.Join(root, "db", "models")

	if err := os.MkdirAll(outDir, 0755); err != nil {
		return fmt.Errorf("create %s: %w", outDir, err)
	}

	moduleName, err := readModuleName(root)
	if err != nil {
		return err
	}
	importPath := moduleName + "/db/models"

	created, err := splitter.SplitToSubpackage(modelsFile, outDir, importPath)
	if err != nil {
		return fmt.Errorf("model split failed: %w", err)
	}
	for _, f := range created {
		rel, _ := filepath.Rel(root, f)
		fmt.Printf("    [created] %s\n", rel)
	}
	fmt.Println("    [OK] Model split completed.")

	// Step 3: compile-check.
	fmt.Println("\n==> Step 3/3: Running go build ./... to verify...")
	buildCmd := exec.Command("go", "build", "./...")
	buildCmd.Dir = root
	buildCmd.Stdout = os.Stdout
	buildCmd.Stderr = os.Stderr
	if err := buildCmd.Run(); err != nil {
		return fmt.Errorf("go build failed after generation: %w", err)
	}
	fmt.Println("    [OK] Build successful — all generated code is valid.")

	return nil
}

// readModuleName reads the module name from go.mod in the project root.
func readModuleName(root string) (string, error) {
	f, err := os.Open(filepath.Join(root, "go.mod"))
	if err != nil {
		return "", fmt.Errorf("open go.mod: %w", err)
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, "module ") {
			return strings.TrimSpace(strings.TrimPrefix(line, "module ")), nil
		}
	}
	return "", fmt.Errorf("module name not found in go.mod")
}
