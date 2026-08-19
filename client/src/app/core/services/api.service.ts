import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, type Observable } from 'rxjs';
import type { ApiSuccess } from '@ridesync/shared';

/**
 * Unwraps the `{ data }` envelope so features work with the payload directly.
 * Errors keep their shape and are handled by the error interceptor.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api';

  get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
    return this.http
      .get<ApiSuccess<T>>(`${this.base}${path}`, { params: this.toParams(params) })
      .pipe(map((response) => response.data));
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http
      .post<ApiSuccess<T>>(`${this.base}${path}`, body ?? {})
      .pipe(map((response) => response.data));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http
      .put<ApiSuccess<T>>(`${this.base}${path}`, body)
      .pipe(map((response) => response.data));
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http
      .patch<ApiSuccess<T>>(`${this.base}${path}`, body ?? {})
      .pipe(map((response) => response.data));
  }

  delete(path: string): Observable<void> {
    return this.http.delete<void>(`${this.base}${path}`).pipe(map(() => undefined));
  }

  /** Used where the API answers 204 with no envelope. */
  postNoContent(path: string, body?: unknown): Observable<void> {
    return this.http.post<void>(`${this.base}${path}`, body ?? {}).pipe(map(() => undefined));
  }

  private toParams(params?: Record<string, string | number | boolean>): HttpParams | undefined {
    if (!params) return undefined;
    let httpParams = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      httpParams = httpParams.set(key, String(value));
    }
    return httpParams;
  }
}
