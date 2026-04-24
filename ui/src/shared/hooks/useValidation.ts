import { useState, useCallback } from 'react';
import {
  ValidationError,
  validatePost,
  validateComment,
  validateUser,
  validateSearchQuery,
  sanitizeHtml,
  type Post,
  type Comment,
  type User,
} from '../validation/validators';
import {
  isValidationError,
  getValidationErrorDetails,
} from '../validation/responseValidator';

export interface ValidationState {
  errors: ValidationError[];
  isValid: boolean;
  hasErrors: boolean;
}

export const useValidation = () => {
  const [validationState, setValidationState] = useState<ValidationState>({
    errors: [],
    isValid: true,
    hasErrors: false,
  });

  const updateValidationState = useCallback((errors: ValidationError[]) => {
    setValidationState({
      errors,
      isValid: errors.length === 0,
      hasErrors: errors.length > 0,
    });
  }, []);

  const validatePostData = useCallback((post: unknown): post is Post => {
    const errors = validatePost(post);
    updateValidationState(errors);
    return errors.length === 0;
  }, [updateValidationState]);

  const validateCommentData = useCallback((comment: unknown): comment is Comment => {
    const errors = validateComment(comment);
    updateValidationState(errors);
    return errors.length === 0;
  }, [updateValidationState]);

  const validateUserData = useCallback((user: unknown): user is User => {
    const errors = validateUser(user);
    updateValidationState(errors);
    return errors.length === 0;
  }, [updateValidationState]);

  const validateSearch = useCallback((query: string): boolean => {
    const errors = validateSearchQuery(query);
    updateValidationState(errors);
    return errors.length === 0;
  }, [updateValidationState]);

  const sanitizeInput = useCallback((input: string): string => {
    return sanitizeHtml(input);
  }, []);

  const clearErrors = useCallback(() => {
    updateValidationState([]);
  }, [updateValidationState]);

  const getErrorMessage = useCallback((field: string): string | undefined => {
    const error = validationState.errors.find(e => e.field === field);
    return error?.message;
  }, [validationState.errors]);

  const getFieldErrors = useCallback((field: string): ValidationError[] => {
    return validationState.errors.filter(e => e.field === field);
  }, [validationState.errors]);

  const handleApiError = useCallback((error: unknown): string => {
    if (isValidationError(error)) {
      return getValidationErrorDetails(error);
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  }, []);

  return {
    validationState,
    validatePostData,
    validateCommentData,
    validateUserData,
    validateSearch,
    sanitizeInput,
    clearErrors,
    getErrorMessage,
    getFieldErrors,
    handleApiError,
  };
};

// Hook for form validation
export const useFormValidation = <T extends Record<string, unknown>>(
  validator: (data: T) => ValidationError[]
) => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const validate = useCallback((data: T): boolean => {
    const validationErrors = validator(data);
    setErrors(validationErrors);
    return validationErrors.length === 0;
  }, [validator]);

  const touchField = useCallback((field: string) => {
    setTouched(prev => new Set(prev).add(field));
  }, []);

  const getFieldError = useCallback((field: string): string | undefined => {
    if (!touched.has(field)) return undefined;
    const error = errors.find(e => e.field === field);
    return error?.message;
  }, [errors, touched]);

  const hasFieldError = useCallback((field: string): boolean => {
    return touched.has(field) && errors.some(e => e.field === field);
  }, [errors, touched]);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => prev.filter(e => e.field !== field));
    setTouched(prev => {
      const newTouched = new Set(prev);
      newTouched.delete(field);
      return newTouched;
    });
  }, []);

  const reset = useCallback(() => {
    setErrors([]);
    setTouched(new Set());
  }, []);

  return {
    errors,
    touched: Array.from(touched),
    validate,
    touchField,
    getFieldError,
    hasFieldError,
    clearFieldError,
    reset,
    isValid: errors.length === 0,
    hasErrors: errors.length > 0,
  };
};

// Hook for API response validation
export const useApiValidation = () => {
  const [lastError, setLastError] = useState<string | null>(null);

  const validateApiResponse = useCallback(<T>(
    response: unknown,
    validator: (data: unknown) => ValidationError[],
    onSuccess?: (data: T) => void,
    onError?: (error: string) => void
  ): T | null => {
    try {
      const errors = validator(response);
      if (errors.length > 0) {
        const errorMessage = errors.map(e => `${e.field}: ${e.message}`).join(', ');
        setLastError(errorMessage);
        onError?.(errorMessage);
        return null;
      }

      setLastError(null);
      const validData = response as T;
      onSuccess?.(validData);
      return validData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      setLastError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    lastError,
    validateApiResponse,
    clearError,
    hasError: lastError !== null,
  };
};