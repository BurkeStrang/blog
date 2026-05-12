// Frontend validation utilities
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export class ValidationErrors extends Error {
  public readonly errors: ValidationError[];
  
  constructor(errors: ValidationError[]) {
    const message = errors.map(e => `${e.field}: ${e.message}`).join(', ');
    super(message);
    this.name = 'ValidationErrors';
    this.errors = errors;
  }
}

// Data type guards
export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value);
};

export const isPositiveNumber = (value: unknown): value is number => {
  return isNumber(value) && value >= 0;
};

export const isValidDate = (value: unknown): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isValidSlug = (slug: string): boolean => {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
};

// String validation
export const validateStringLength = (
  value: string,
  fieldName: string,
  minLength: number,
  maxLength: number
): ValidationError | null => {
  if (value.length < minLength) {
    return {
      field: fieldName,
      message: `must be at least ${minLength} characters`,
      value: value.length,
    };
  }
  
  if (value.length > maxLength) {
    return {
      field: fieldName,
      message: `must be less than ${maxLength} characters`,
      value: value.length,
    };
  }
  
  return null;
};

// Post validation
export interface Post {
  id?: number;
  slug: string;
  previous?: string;
  next?: string;
  title: string;
  body: string;
  author: string;
  date?: string;
  pageViews?: number;
  recentViews?: number;
  lastViewed?: string;
  firstViewed?: string;
}

export const validatePost = (post: unknown): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!post || typeof post !== 'object') {
    return [{ field: 'post', message: 'must be an object' }];
  }
  
  const p = post as Record<string, unknown>;
  
  // Validate slug
  if (!isString(p.slug)) {
    errors.push({ field: 'slug', message: 'is required and must be a string', value: p.slug });
  } else {
    const slugError = validateStringLength(p.slug, 'slug', 1, 100);
    if (slugError) errors.push(slugError);
    
    if (!isValidSlug(p.slug)) {
      errors.push({
        field: 'slug',
        message: 'must contain only lowercase letters, numbers, and hyphens',
        value: p.slug,
      });
    }
  }
  
  // Validate title
  if (!isString(p.title)) {
    errors.push({ field: 'title', message: 'is required and must be a string', value: p.title });
  } else {
    const titleError = validateStringLength(p.title, 'title', 1, 200);
    if (titleError) errors.push(titleError);
  }
  
  // Validate body
  if (!isString(p.body)) {
    errors.push({ field: 'body', message: 'is required and must be a string', value: p.body });
  } else {
    const bodyError = validateStringLength(p.body, 'body', 1, 1000000);
    if (bodyError) errors.push(bodyError);
  }
  
  // Validate author
  if (!isString(p.author)) {
    errors.push({ field: 'author', message: 'is required and must be a string', value: p.author });
  } else {
    const authorError = validateStringLength(p.author, 'author', 1, 100);
    if (authorError) errors.push(authorError);
  }
  
  // Validate view counts
  if (p.pageViews !== undefined && !isPositiveNumber(p.pageViews)) {
    errors.push({
      field: 'pageViews',
      message: 'must be a non-negative number',
      value: p.pageViews,
    });
  }
  
  if (p.recentViews !== undefined && !isPositiveNumber(p.recentViews)) {
    errors.push({
      field: 'recentViews',
      message: 'must be a non-negative number',
      value: p.recentViews,
    });
  }

  if (p.previous !== undefined) {
    if (!isString(p.previous)) {
      errors.push({ field: 'previous', message: 'must be a string', value: p.previous });
    } else {
      const previousError = validateStringLength(p.previous, 'previous', 0, 100);
      if (previousError) errors.push(previousError);

      if (p.previous.length > 0 && !isValidSlug(p.previous)) {
        errors.push({
          field: 'previous',
          message: 'must contain only lowercase letters, numbers, and hyphens',
          value: p.previous,
        });
      }
    }
  }

  if (p.next !== undefined) {
    if (!isString(p.next)) {
      errors.push({ field: 'next', message: 'must be a string', value: p.next });
    } else {
      const nextError = validateStringLength(p.next, 'next', 0, 100);
      if (nextError) errors.push(nextError);

      if (p.next.length > 0 && !isValidSlug(p.next)) {
        errors.push({
          field: 'next',
          message: 'must contain only lowercase letters, numbers, and hyphens',
          value: p.next,
        });
      }
    }
  }
  
  return errors;
};

// Comment validation
export interface Comment {
  id?: number;
  post_id: number;
  content: string;
  author: string;
  created_at?: string;
}

export const validateComment = (comment: unknown): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!comment || typeof comment !== 'object') {
    return [{ field: 'comment', message: 'must be an object' }];
  }
  
  const c = comment as Record<string, unknown>;
  
  // Validate post_id
  if (!isPositiveNumber(c.post_id) || c.post_id === 0) {
    errors.push({
      field: 'post_id',
      message: 'is required and must be a positive number',
      value: c.post_id,
    });
  }
  
  // Validate content
  if (!isString(c.content)) {
    errors.push({ field: 'content', message: 'is required and must be a string', value: c.content });
  } else {
    const contentError = validateStringLength(c.content, 'content', 1, 10000);
    if (contentError) errors.push(contentError);
  }
  
  // Validate author
  if (!isString(c.author)) {
    errors.push({ field: 'author', message: 'is required and must be a string', value: c.author });
  } else {
    const authorError = validateStringLength(c.author, 'author', 1, 100);
    if (authorError) errors.push(authorError);
  }
  
  return errors;
};

// User validation
export interface User {
  id?: number;
  username: string;
  email: string;
  name: string;
  picture?: string;
  role?: string;
}

export const validateUser = (user: unknown): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!user || typeof user !== 'object') {
    return [{ field: 'user', message: 'must be an object' }];
  }
  
  const u = user as Record<string, unknown>;
  
  // Validate username
  if (!isString(u.username)) {
    errors.push({ field: 'username', message: 'is required and must be a string', value: u.username });
  } else {
    const usernameError = validateStringLength(u.username, 'username', 3, 50);
    if (usernameError) errors.push(usernameError);
  }
  
  // Validate email
  if (!isString(u.email)) {
    errors.push({ field: 'email', message: 'is required and must be a string', value: u.email });
  } else if (!isValidEmail(u.email)) {
    errors.push({ field: 'email', message: 'format is invalid', value: u.email });
  }
  
  // Validate name
  if (!isString(u.name)) {
    errors.push({ field: 'name', message: 'is required and must be a string', value: u.name });
  } else {
    const nameError = validateStringLength(u.name, 'name', 1, 100);
    if (nameError) errors.push(nameError);
  }
  
  // Validate role
  const validRoles = ['user', 'admin', 'moderator'];
  if (u.role !== undefined && (!isString(u.role) || !validRoles.includes(u.role))) {
    errors.push({
      field: 'role',
      message: 'must be one of: user, admin, moderator',
      value: u.role,
    });
  }
  
  // Validate picture URL
  if (u.picture !== undefined && isString(u.picture) && u.picture !== '' && !isValidUrl(u.picture)) {
    errors.push({ field: 'picture', message: 'must be a valid URL', value: u.picture });
  }
  
  return errors;
};

// JSON validation
export const validateJSON = (data: string): unknown => {
  try {
    const parsed = JSON.parse(data);
    
    // Check for concatenated JSON arrays
    if (data.includes('][')) {
      throw new Error('Detected concatenated JSON arrays in response');
    }
    
    return parsed;
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Sanitization
export const sanitizeHtml = (input: string): string => {
  // Remove script tags and their content
  let sanitized = input.replace(/<script[^>]*>.*?<\/script>/gi, '');
  
  // Remove potentially dangerous attributes
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^>]*/gi, '');
  
  // Remove javascript: links
  sanitized = sanitized.replace(/javascript:\s*[^"'>\s]*/gi, '');
  
  return sanitized;
};

// Search query validation
export const validateSearchQuery = (query: string): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (query.length > 200) {
    errors.push({
      field: 'query',
      message: 'search query must be less than 200 characters',
      value: query.length,
    });
  }
  
  // Check for potentially malicious patterns
  const maliciousPatterns = [
    '<script',
    'javascript:',
    'data:',
    'vbscript:',
    'onload',
    'onerror',
    'onclick',
    'onfocus',
    'onmouseover',
  ];
  
  const lowerQuery = query.toLowerCase();
  for (const pattern of maliciousPatterns) {
    if (lowerQuery.includes(pattern)) {
      errors.push({
        field: 'query',
        message: 'search query contains potentially malicious content',
        value: pattern,
      });
      break;
    }
  }
  
  return errors;
};

// API Response validation
export const validateApiResponse = <T>(
  data: unknown,
  validator: (data: unknown) => ValidationError[]
): T => {
  const errors = validator(data);
  if (errors.length > 0) {
    throw new ValidationErrors(errors);
  }
  return data as T;
};

// Array validation
export const validateArray = (
  data: unknown,
  itemValidator: (item: unknown) => ValidationError[],
  fieldName = 'array'
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!Array.isArray(data)) {
    return [{ field: fieldName, message: 'must be an array', value: typeof data }];
  }
  
  if (data.length > 10000) {
    errors.push({
      field: fieldName,
      message: 'array too large (max 10000 items)',
      value: data.length,
    });
  }
  
  data.forEach((item, index) => {
    const itemErrors = itemValidator(item);
    itemErrors.forEach(error => {
      errors.push({
        ...error,
        field: `${fieldName}[${index}].${error.field}`,
      });
    });
  });
  
  return errors;
};
