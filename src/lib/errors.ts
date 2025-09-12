// Standardized error handling utilities

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { APIResponse, AppError, ValidationErrorDetail } from '@/types/common';

/**
 * Custom error class for application-specific errors
 */
export class ApplicationError extends Error implements AppError {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: ValidationErrorDetail[];

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    details?: ValidationErrorDetail[]
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }
}

/**
 * Predefined application errors
 */
export const AppErrors = {
  VALIDATION_ERROR: (details?: ValidationErrorDetail[]) =>
    new ApplicationError('Validation failed', 'VALIDATION_ERROR', 400, details),
  
  UNAUTHORIZED: (message: string = 'Unauthorized access') =>
    new ApplicationError(message, 'UNAUTHORIZED', 401),
  
  FORBIDDEN: (message: string = 'Access forbidden') =>
    new ApplicationError(message, 'FORBIDDEN', 403),
  
  NOT_FOUND: (message: string = 'Resource not found') =>
    new ApplicationError(message, 'NOT_FOUND', 404),
  
  CONFLICT: (message: string = 'Resource conflict') =>
    new ApplicationError(message, 'CONFLICT', 409),
  
  INTERNAL_ERROR: (message: string = 'Internal server error') =>
    new ApplicationError(message, 'INTERNAL_ERROR', 500),
  
  DATABASE_ERROR: (message: string = 'Database operation failed') =>
    new ApplicationError(message, 'DATABASE_ERROR', 500),
  
  AWS_ERROR: (message: string = 'AWS service error') =>
    new ApplicationError(message, 'AWS_ERROR', 500),
};

/**
 * Convert Zod errors to validation error details
 */
export function zodErrorToDetails(error: ZodError): ValidationErrorDetail[] {
  return error.errors.map(err => ({
    path: err.path.map(String),
    message: err.message,
    code: err.code
  }));
}

/**
 * Standardized error response handler for API routes
 */
export function handleApiError(error: unknown): NextResponse<APIResponse> {
  console.error('API Error:', error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = zodErrorToDetails(error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details
      }
    }, { status: 400 });
  }

  // Handle custom application errors
  if (error instanceof ApplicationError) {
    return NextResponse.json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    }, { status: error.statusCode });
  }

  // Handle standard JavaScript errors
  if (error instanceof Error) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message
      }
    }, { status: 500 });
  }

  // Handle unknown errors
  return NextResponse.json({
    success: false,
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred'
    }
  }, { status: 500 });
}

/**
 * Standardized success response helper
 */
export function apiSuccess<T>(data: T, message?: string): NextResponse<APIResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(message && { message })
  });
}

/**
 * Async error wrapper for API route handlers
 */
export function withErrorHandling<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse<APIResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Client-side error handling utility
 */
export class ClientError extends Error {
  public readonly code: string;
  public readonly details?: ValidationErrorDetail[];

  constructor(message: string, code: string = 'CLIENT_ERROR', details?: ValidationErrorDetail[]) {
    super(message);
    this.name = 'ClientError';
    this.code = code;
    this.details = details;

    Object.setPrototypeOf(this, ClientError.prototype);
  }
}

/**
 * Parse API error responses on the client side
 */
export function parseApiError(response: APIResponse): ClientError {
  const error = response.error;
  if (!error) {
    return new ClientError('Unknown API error', 'UNKNOWN_API_ERROR');
  }

  return new ClientError(
    error.message,
    error.code || 'API_ERROR',
    error.details
  );
}

/**
 * Utility for handling fetch errors on the client side
 */
export async function handleFetchResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData: APIResponse = await response.json().catch(() => ({
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`
      }
    }));

    throw parseApiError(errorData);
  }

  const data: APIResponse<T> = await response.json();
  
  if (!data.success) {
    throw parseApiError(data);
  }

  return data.data as T;
}