// Pure validation functions for API services (no hooks)
import {
  validatePost,
  validateComment,
  validateArray,
  validateJSON,
  ValidationErrors,
  type Post,
  type Comment,
} from './validators';

export class ApiValidationError extends Error {
  constructor(
    message: string,
    public readonly endpoint: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ApiValidationError';
  }
}

// Simple validation functions without React context
export const validateApiPost = (data: unknown, endpoint: string): Post => {
  const errors = validatePost(data);
  if (errors.length > 0) {
    throw new ApiValidationError(
      `Invalid post data from ${endpoint}: ${errors.map(e => e.message).join(', ')}`,
      endpoint
    );
  }
  return data as Post;
};

export const validateApiPosts = (data: unknown, endpoint: string): Post[] => {
  const arrayErrors = validateArray(data, validatePost, 'posts');
  if (arrayErrors.length > 0) {
    throw new ApiValidationError(
      `Invalid posts array from ${endpoint}: ${arrayErrors.map(e => e.message).join(', ')}`,
      endpoint
    );
  }
  return data as Post[];
};

export const validateApiComment = (data: unknown, endpoint: string): Comment => {
  const errors = validateComment(data);
  if (errors.length > 0) {
    throw new ApiValidationError(
      `Invalid comment data from ${endpoint}: ${errors.map(e => e.message).join(', ')}`,
      endpoint
    );
  }
  return data as Comment;
};

export const validateApiComments = (data: unknown, endpoint: string): Comment[] => {
  const arrayErrors = validateArray(data, validateComment, 'comments');
  if (arrayErrors.length > 0) {
    throw new ApiValidationError(
      `Invalid comments array from ${endpoint}: ${arrayErrors.map(e => e.message).join(', ')}`,
      endpoint
    );
  }
  return data as Comment[];
};

export const validateApiResponse = async (response: Response, endpoint: string): Promise<unknown> => {
  // Check response status
  if (!response.ok) {
    throw new ApiValidationError(`HTTP ${response.status} error from ${endpoint}`, endpoint);
  }

  // Check content type
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new ApiValidationError(
      `Expected JSON response but got ${contentType || 'unknown content type'} from ${endpoint}`,
      endpoint
    );
  }

  try {
    const text = await response.text();
    
    // Check for empty response
    if (!text.trim()) {
      throw new ApiValidationError(`Empty response from ${endpoint}`, endpoint);
    }

    // Validate and parse JSON
    const data = validateJSON(text);
    
    // Check for error responses
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if (obj.error && typeof obj.error === 'string') {
        throw new ApiValidationError(`API error from ${endpoint}: ${obj.error}`, endpoint);
      }
    }

    return data;
  } catch (error) {
    if (error instanceof ApiValidationError) {
      throw error;
    }
    
    throw new ApiValidationError(
      `Failed to parse JSON response from ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      endpoint,
      error instanceof Error ? error : undefined
    );
  }
};

// Utility functions
export const isApiValidationError = (error: unknown): error is ApiValidationError => {
  return error instanceof ApiValidationError;
};

export const getApiErrorMessage = (error: unknown): string => {
  if (error instanceof ApiValidationError) {
    return error.message;
  }
  
  if (error instanceof ValidationErrors) {
    return error.errors.map(e => `${e.field}: ${e.message}`).join(', ');
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Unknown validation error';
};