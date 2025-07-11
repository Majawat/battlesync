export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}