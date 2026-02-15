package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"

	"github.com/gorilla/mux"
)

// Task represents a task in the task manager
type Task struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Completed   bool   `json:"completed"`
	UserID      int    `json:"userId"`
}

// TaskStore provides thread-safe task storage
type TaskStore struct {
	mu     sync.RWMutex
	tasks  map[int]Task
	nextID int
}

var store = &TaskStore{
	tasks:  make(map[int]Task),
	nextID: 1,
}

func main() {
	// Seed some demo data
	store.tasks[1] = Task{ID: 1, Title: "Setup Bazel monorepo", Description: "Configure Go, React, and .NET", Completed: true, UserID: 1}
	store.tasks[2] = Task{ID: 2, Title: "Build Task API", Description: "Create CRUD endpoints for tasks", Completed: true, UserID: 1}
	store.tasks[3] = Task{ID: 3, Title: "Build User API", Description: "Create .NET user service", Completed: false, UserID: 2}
	store.nextID = 4

	r := mux.NewRouter()

	// CORS middleware
	r.Use(corsMiddleware)

	// Routes
	r.HandleFunc("/tasks", getTasks).Methods("GET", "OPTIONS")
	r.HandleFunc("/tasks/{id}", getTask).Methods("GET", "OPTIONS")
	r.HandleFunc("/tasks", createTask).Methods("POST", "OPTIONS")
	r.HandleFunc("/tasks/{id}", updateTask).Methods("PUT", "OPTIONS")
	r.HandleFunc("/tasks/{id}", deleteTask).Methods("DELETE", "OPTIONS")
	r.HandleFunc("/health", healthCheck).Methods("GET")

	log.Println("🚀 Task API running on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func getTasks(w http.ResponseWriter, r *http.Request) {
	store.mu.RLock()
	defer store.mu.RUnlock()

	tasks := make([]Task, 0, len(store.tasks))
	for _, task := range store.tasks {
		tasks = append(tasks, task)
	}

	respondJSON(w, tasks)
}

func getTask(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	store.mu.RLock()
	task, exists := store.tasks[id]
	store.mu.RUnlock()

	if !exists {
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	respondJSON(w, task)
}

func createTask(w http.ResponseWriter, r *http.Request) {
	var task Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	store.mu.Lock()
	task.ID = store.nextID
	store.nextID++
	store.tasks[task.ID] = task
	store.mu.Unlock()

	w.WriteHeader(http.StatusCreated)
	respondJSON(w, task)
}

func updateTask(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var task Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	store.mu.Lock()
	if _, exists := store.tasks[id]; !exists {
		store.mu.Unlock()
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}
	task.ID = id
	store.tasks[id] = task
	store.mu.Unlock()

	respondJSON(w, task)
}

func deleteTask(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	store.mu.Lock()
	if _, exists := store.tasks[id]; !exists {
		store.mu.Unlock()
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}
	delete(store.tasks, id)
	store.mu.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, map[string]string{"status": "healthy", "service": "task-api"})
}

func respondJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}
