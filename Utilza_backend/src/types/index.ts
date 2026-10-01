// Shared API contract types. Web + Flutter must consume the same shapes.

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuthTokenPayload {
  sub: string; // userId
  email: string;
  iat?: number;
  exp?: number;
}

export interface PaginationQuery {
  page: number;
  limit: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}
