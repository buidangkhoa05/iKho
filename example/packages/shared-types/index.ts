// Shared TypeScript types for Task Manager
// These can be used across packages

export interface Task {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  userId: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  userId: number;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: string;
}

export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}
