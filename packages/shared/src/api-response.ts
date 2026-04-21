export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export function successResponse<T>(
  data: T,
  meta?: ApiResponse<T>['meta'],
): ApiResponse<T> {
  return { data, error: null, meta };
}

export function errorResponse(error: string): ApiResponse<null> {
  return { data: null, error };
}
