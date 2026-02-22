package cmd

import (
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/spf13/cobra"
)

var (
	dumpOutput     string
	dumpSchemaOnly bool
)

var dumpCmd = &cobra.Command{
	Use:   "dump",
	Short: "Export database schema to a SQL file using pg_dump",
	Long: `Export the PostgreSQL database schema to a .sql file via pg_dump.

The command ensures the Postgres Docker container is running, then uses
pg_dump (local install or via docker exec) to dump the schema.

Examples:
  db-setup dump                    # writes schema.sql
  db-setup dump -o backup.sql      # writes backup.sql
  db-setup dump --schema-only=false # include data`,
	RunE:         runDump,
	SilenceUsage: true,
}

func init() {
	dumpCmd.Flags().StringVarP(&dumpOutput, "output", "o", "schema.sql",
		"Output file path for the SQL dump")
	dumpCmd.Flags().BoolVar(&dumpSchemaOnly, "schema-only", true,
		"Dump only the schema (no data)")
}

// ── Main handler ──────────────────────────────────────────────────────────────

func runDump(_ *cobra.Command, _ []string) error {
	if err := ensureDockerRunning(); err != nil {
		return err
	}
	if err := ensureContainerRunning(); err != nil {
		return err
	}
	if err := waitForPostgres(); err != nil {
		return err
	}

	useLocal, version := detectPgDump()
	if useLocal {
		printOK(fmt.Sprintf("Using local pg_dump — %s", version))
	} else {
		printOK(fmt.Sprintf("Local pg_dump not found; using pg_dump from container %q", containerName))
	}

	printStep("Exporting database schema...")

	if useLocal {
		return dumpLocal()
	}
	return dumpViaDocker()
}

// ── Dump strategies ───────────────────────────────────────────────────────────

func dumpLocal() error {
	args := buildPgDumpArgs()
	args = append(args, "-f", dumpOutput)

	cmd := exec.Command("pg_dump", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(), "PGPASSWORD="+dbPassword)

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("pg_dump failed: %w", err)
	}

	printOK(fmt.Sprintf("Schema written to %s", dumpOutput))
	return nil
}

func dumpViaDocker() error {
	args := []string{
		"exec",
		"-e", "PGPASSWORD=" + dbPassword,
		containerName,
		"pg_dump",
	}
	args = append(args, buildPgDumpArgs()...)

	out, err := exec.Command("docker", args...).CombinedOutput()
	if err != nil {
		return fmt.Errorf("pg_dump via docker exec failed: %s: %w", strings.TrimSpace(string(out)), err)
	}

	if err := os.WriteFile(dumpOutput, out, 0644); err != nil {
		return fmt.Errorf("writing %s: %w", dumpOutput, err)
	}

	printOK(fmt.Sprintf("Schema written to %s", dumpOutput))
	return nil
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func buildPgDumpArgs() []string {
	args := []string{
		"-h", "localhost",
		"-U", dbUser,
		"-d", dbName,
		"--no-owner",
		"--no-privileges",
	}
	if dumpSchemaOnly {
		args = append(args, "--schema-only")
	}
	return args
}

func detectPgDump() (local bool, version string) {
	printStep("Checking for pg_dump...")

	out, err := exec.Command("pg_dump", "--version").Output()
	if err == nil {
		return true, strings.TrimSpace(string(out))
	}
	return false, ""
}
