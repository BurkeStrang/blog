import {
  validatePost,
  validateComment,
  validateUser,
  validateArray,
  validateJSON,
  ValidationErrors,
  type Post,
  type Comment,
  type User,
} from './validators';

export class ResponseValidationError extends Error {
  constructor(
    message: string,
    public readonly endpoint: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ResponseValidationError';
  }
}

// Response validators
export const validatePostResponse = (data: unknown, endpoint: string): Post => {
  try {
    const errors = validatePost(data);
    if (errors.length > 0) {
      throw new ValidationErrors(errors);
    }
    return data as Post;
  } catch (error) {
    throw new ResponseValidationError(
      `Invalid post response from ${endpoint}`,
      endpoint,
      error instanceof Error ? error : undefined
    );
  }
};

export const validatePostsResponse = (data: unknown, endpoint: string): Post[] => {
  try {
    const arrayErrors = validateArray(data, validatePost, 'posts');
    if (arrayErrors.length > 0) {
      throw new ValidationErrors(arrayErrors);
    }
    return data as Post[];
  } catch (error) {
    throw new ResponseValidationError(
      `Invalid posts array response from ${endpoint}`,
      endpoint,
      error instanceof Error ? error : undefined
    );
  }
};

export const validateCommentResponse = (data: unknown, endpoint: string): Comment => {
  try {
    const errors = validateComment(data);
    if (errors.length > 0) {
      throw new ValidationErrors(errors);
    }
    return data as Comment;
  } catch (error) {
    throw new ResponseValidationError(
      `Invalid comment response from ${endpoint}`,
      endpoint,
      error instanceof Error ? error : undefined
    );
  }
};

export const validateCommentsResponse = (data: unknown, endpoint: string): Comment[] => {
  try {
    const arrayErrors = validateArray(data, validateComment, 'comments');
    if (arrayErrors.length > 0) {
      throw new ValidationErrors(arrayErrors);
    }
    return data as Comment[];
  } catch (error) {
    throw new ResponseValidationError(
      `Invalid comments array response from ${endpoint}`,
      endpoint,
      error instanceof Error ? error : undefined
    );
  }
};

export const validateUserResponse = (data: unknown, endpoint: string): User => {
  try {
    const errors = validateUser(data);
    if (errors.length > 0) {
      throw new ValidationErrors(errors);
    }
    return data as User;
  } catch (error) {
    throw new ResponseValidationError(
      `Invalid user response from ${endpoint}`,
      endpoint,
      error instanceof Error ? error : undefined
    );
  }
};

// Generic response validator
export const validateResponse = <T>(
  data: unknown,
  validator: (data: unknown, endpoint: string) => T,
  endpoint: string
): T => {
  try {
    return validator(data, endpoint);
  } catch (error) {
    console.error(`Response validation failed for ${endpoint}:`, error);
    throw error;
  }
};

// Raw response validator (before JSON parsing)
export const validateRawResponse = (response: Response, endpoint: string): void => {
  // Check response status
  if (!response.ok) {
    throw new ResponseValidationError(
      `HTTP ${response.status} error from ${endpoint}`,
      endpoint
    );
  }

  // Check content type
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new ResponseValidationError(
      `Expected JSON response but got ${contentType || 'unknown content type'} from ${endpoint}`,
      endpoint
    );
  }

  // Check for reasonable size (headers might indicate size)
  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (size > maxSize) {
      throw new ResponseValidationError(
        `Response too large: ${size} bytes (max: ${maxSize}) from ${endpoint}`,
        endpoint
      );
    }
  }
};

// JSON response validator
export const validateJSONResponse = async (response: Response, endpoint: string): Promise<unknown> => {
  validateRawResponse(response, endpoint);

  try {
    const text = await response.text();
    
    // Check for empty response
    if (!text.trim()) {
      throw new ResponseValidationError(
        `Empty response from ${endpoint}`,
        endpoint
      );
    }

    // Validate and parse JSON
    const data = validateJSON(text);
    
    // Additional checks for response structure
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      
      // Check for error responses
      if (obj.error && typeof obj.error === 'string') {
        throw new ResponseValidationError(
          `API error from ${endpoint}: ${obj.error}`,
          endpoint
        );
      }
    }

    return data;
  } catch (error) {
    if (error instanceof ResponseValidationError) {
      throw error;
    }
    
    throw new ResponseValidationError(
      `Failed to parse JSON response from ${endpoint}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      endpoint,
      error instanceof Error ? error : undefined
    );
  }
};

// Utility for checking if error is validation-related
export const isValidationError = (error: unknown): error is ValidationErrors | ResponseValidationError => {
  return error instanceof ValidationErrors || error instanceof ResponseValidationError;
};

// Utility for extracting validation error details
export const getValidationErrorDetails = (error: unknown): string => {
  if (error instanceof ValidationErrors) {
    return error.errors.map(e => `${e.field}: ${e.message}`).join(', ');
  }
  
  if (error instanceof ResponseValidationError) {
    return error.message + (error.originalError ? ` (${error.originalError.message})` : '');
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'Unknown validation error';
};