import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  error: string | null;
  meta: Record<string, unknown> | null;
}

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        // If the handler already returned an ApiResponse shape, pass it through
        if (result && typeof result === 'object' && 'data' in result && 'error' in result) {
          return result as ApiResponse<T>;
        }

        // If the handler returned { data, meta }, wrap accordingly
        if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
          return {
            data: result.data,
            error: null,
            meta: result.meta,
          };
        }

        return {
          data: result,
          error: null,
          meta: null,
        };
      }),
    );
  }
}
