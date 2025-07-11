export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  errors?: string[];
}

export function successResponse<T>(data?: T, message?: string): ApiResponse<T> {
  return {
    status: 'success',
    data,
    message,
  };
}

export function errorResponse(message: string, errors?: string[]): ApiResponse {
  return {
    status: 'error',
    message,
    errors,
  };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): ApiResponse<{
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const pages = Math.ceil(total / limit);
  
  return {
    status: 'success',
    data: {
      items: data,
      pagination: {
        total,
        page,
        limit,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    },
    message,
  };
}