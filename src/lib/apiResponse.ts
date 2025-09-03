import { NextResponse } from 'next/server'

// Standardized API response format
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Success response helper
export function successResponse<T>(
  data: T,
  pagination?: ApiResponse<T>['pagination']
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data
  }
  
  if (pagination) {
    response.pagination = pagination
  }
  
  return NextResponse.json(response)
}

// Error response helper
export function errorResponse(
  message: string,
  code = 'SERVER_ERROR',
  status = 500,
  details?: Record<string, unknown>
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details
      }
    },
    { status }
  )
}

// Validation error response
export function validationError(
  message: string,
  details?: Record<string, unknown>
): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 'VALIDATION_ERROR', 400, details)
}

// Not found error response
export function notFoundError(
  message = 'Resource not found'
): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 'NOT_FOUND', 404)
}

// Unauthorized error response
export function unauthorizedError(
  message = 'Unauthorized access'
): NextResponse<ApiResponse<never>> {
  return errorResponse(message, 'UNAUTHORIZED', 401)
}