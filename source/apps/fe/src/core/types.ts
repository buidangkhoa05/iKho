/**
 * Core domain types shared across features
 * These types represent the fundamental business entities
 */

// Common status type used across entities
export type EntityStatus = "active" | "inactive" | "draft"

// Base interface for all entities with common fields
export interface BaseEntity {
  id: string
  createdAt?: string
  updatedAt?: string
}

// Pagination types for list responses
export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Common filter types
export interface DateRange {
  startDate: string
  endDate: string
}

export interface PriceRange {
  min: number
  max: number
}
