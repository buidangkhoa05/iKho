package cmd

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/spf13/cobra"
)

var migrateSteps int

var migrateCmd = &cobra.Command{
	Use:   "migrate <up|down|status>",
	Short: "Run database migrations",
	Long: `Run database migrations against the PostgreSQL database.

The command automatically ensures the Postgres Docker container is running
before applying any migration — no external scripts or tools required.

Subcommands:
  up      Apply all pending migrations
  down    Roll back migrations (use --steps to control how many, default 1)
  status  Print the current migration version`,
	Args:         cobra.ExactArgs(1),
	ValidArgs:    []string{"up", "down", "status"},
	RunE:         runMigrate,
	SilenceUsage: true,
}

func init() {
	migrateCmd.Flags().IntVarP(&migrateSteps, "steps", "s", 1,
		"Number of migrations to roll back (only used with 'down')")
}

// ── Main handler ──────────────────────────────────────────────────────────────

func runMigrate(_ *cobra.Command, args []string) error {
	subCmd := args[0]
	if subCmd != "up" && subCmd != "down" && subCmd != "status" {
		return fmt.Errorf("unknown subcommand %q — use: up | down | status", subCmd)
	}

	if err := ensureDockerRunning(); err != nil {
		return err
	}
	if err := ensureContainerRunning(); err != nil {
		return err
	}
	if err := waitForPostgres(); err != nil {
		return err
	}

	root, err := projectRoot()
	if err != nil {
		return err
	}

	return runMigrations(subCmd, filepath.Join(root, "migrations"))
}

// ── Docker helpers ────────────────────────────────────────────────────────────

func ensureDockerRunning() error {
	printStep("Checking Docker...")
	if err := exec.Command("docker", "info").Run(); err != nil {
		return fmt.Errorf("Docker is not running — please start Docker Desktop and try again")
	}
	printOK("Docker is running.")
	return nil
}

func ensureContainerRunning() error {
	printStep(fmt.Sprintf("Checking Postgres container %q...", containerName))

	status, err := containerStatus()
	if err != nil {
		status = "not_found"
	}

	switch status {
	case "running":
		printOK("Container is already running.")
		return nil

	case "exited", "created":
		fmt.Printf("    Container exists but is %s. Starting...\n", status)
		if err := exec.Command("docker", "start", containerName).Run(); err != nil {
			return fmt.Errorf("failed to start container: %w", err)
		}
		printOK("Container started.")
		return nil

	default:
		// Container not found — check if another container already holds the port.
		if occupant := containerOnPort(dbPort); occupant != "" {
			fmt.Printf("    Port %s is already used by container %q. Starting it if needed...\n", dbPort, occupant)
			occStatus, _ := inspectContainerStatus(occupant)
			if occStatus != "running" {
				if err := exec.Command("docker", "start", occupant).Run(); err != nil {
					return fmt.Errorf("failed to start existing container %q: %w", occupant, err)
				}
			}
			// Update containerName so subsequent commands (waitForPostgres, etc.)
			// target the correct container.
			containerName = occupant
			printOK(fmt.Sprintf("Reusing existing container %q on port %s.", occupant, dbPort))
			return nil
		}

		// No conflict — pull the image if missing, then create and start.
		if err := ensureImageExists(); err != nil {
			return err
		}

		fmt.Println("    Creating and starting a new container...")
		err := exec.Command("docker", "run",
			"--name", containerName,
			"-e", "POSTGRES_USER="+dbUser,
			"-e", "POSTGRES_PASSWORD="+dbPassword,
			"-e", "POSTGRES_DB="+dbName,
			"-p", dbPort+":5432",
			"-d", postgresImage,
		).Run()
		if err != nil {
			return fmt.Errorf("failed to start Postgres container: %w", err)
		}
		printOK("Container created and started.")
	}
	return nil
}

// ensureImageExists pulls the Postgres image if it is not already available locally.
func ensureImageExists() error {
	if exec.Command("docker", "image", "inspect", postgresImage).Run() == nil {
		return nil
	}
	printStep(fmt.Sprintf("Pulling image %q...", postgresImage))
	pullCmd := exec.Command("docker", "pull", postgresImage)
	pullCmd.Stdout = os.Stdout
	pullCmd.Stderr = os.Stderr
	if err := pullCmd.Run(); err != nil {
		return fmt.Errorf("failed to pull image %q: %w", postgresImage, err)
	}
	printOK("Image pulled.")
	return nil
}

// containerOnPort returns the name of a container that has a port binding on
// the given host port, or "" if no container is using it.
func containerOnPort(hostPort string) string {
	out, err := exec.Command("docker", "ps", "-a",
		"--filter", "publish="+hostPort,
		"--format", "{{.Names}}",
	).Output()
	if err != nil {
		return ""
	}
	name := strings.TrimSpace(string(out))
	// docker may return multiple lines; take the first.
	if idx := strings.IndexByte(name, '\n'); idx != -1 {
		name = name[:idx]
	}
	return name
}

// inspectContainerStatus returns the status string of a container by name or ID.
func inspectContainerStatus(name string) (string, error) {
	out, err := exec.Command("docker", "inspect",
		"--format", "{{.State.Status}}", name).Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

func containerStatus() (string, error) {
	out, err := exec.Command("docker", "inspect",
		"--format", "{{.State.Status}}", containerName).Output()
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

// ── Readiness probe ───────────────────────────────────────────────────────────

func waitForPostgres() error {
	printStep(fmt.Sprintf("Waiting for Postgres to be ready (max %ds)...", maxRetries*retryDelaySec))
	for i := 1; i <= maxRetries; i++ {
		if exec.Command("docker", "exec", containerName,
			"pg_isready", "-U", dbUser, "-d", dbName).Run() == nil {
			printOK("Postgres is ready.")
			return nil
		}
		fmt.Printf("    Attempt %d/%d — not ready yet, waiting %ds...\n", i, maxRetries, retryDelaySec)
		time.Sleep(retryDelaySec * time.Second)
	}
	return fmt.Errorf("Postgres did not become ready in time — run: docker logs %s", containerName)
}

// ── Migration runner ──────────────────────────────────────────────────────────

func runMigrations(subCmd, migrationsDir string) error {
	printStep(fmt.Sprintf("Running migration: %q...", subCmd))

	m, err := migrate.New(
		"file://"+filepath.ToSlash(migrationsDir),
		buildDBURL(),
	)
	if err != nil {
		return fmt.Errorf("failed to initialise migrate: %w", err)
	}
	defer func() {
		srcErr, dbErr := m.Close()
		if srcErr != nil {
			fmt.Fprintf(os.Stderr, "    [warn] migrate source close: %v\n", srcErr)
		}
		if dbErr != nil {
			fmt.Fprintf(os.Stderr, "    [warn] migrate db close: %v\n", dbErr)
		}
	}()

	switch subCmd {
	case "up":
		err = m.Up()
	case "down":
		err = m.Steps(-migrateSteps)
	case "status":
		version, dirty, verErr := m.Version()
		if errors.Is(verErr, migrate.ErrNilVersion) {
			fmt.Println("    Migration version: none (no migrations applied yet)")
			return nil
		}
		if verErr != nil {
			return fmt.Errorf("could not read migration version: %w", verErr)
		}
		fmt.Printf("    Migration version: %d  dirty: %v\n", version, dirty)
		return nil
	}

	if errors.Is(err, migrate.ErrNoChange) {
		printOK("No changes — database is already up to date.")
		return nil
	}
	if err != nil {
		return fmt.Errorf("migration %q failed: %w", subCmd, err)
	}

	printOK(fmt.Sprintf("Migration %q completed successfully.", subCmd))
	return nil
}

// ── Output helpers ────────────────────────────────────────────────────────────

func printStep(msg string) { fmt.Printf("\n==> %s\n", msg) }
func printOK(msg string)   { fmt.Printf("    [OK] %s\n", msg) }

// ── Utilities ─────────────────────────────────────────────────────────────────

// projectRoot walks up from the working directory until it finds go.mod.
func projectRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return os.Getwd()
}
