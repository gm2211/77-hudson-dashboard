/**
 * API utility for making HTTP requests to the backend.
 *
 * ERROR HANDLING:
 * All methods throw ApiError on non-2xx responses. Callers should
 * wrap in try/catch or use .catch() to handle errors appropriately.
 *
 * USAGE:
 * ```tsx
 * try {
 *   const data = await api.get('/api/services');
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error(`API Error ${error.status}: ${error.message}`);
 *   }
 * }
 * ```
 *
 * AI AGENT NOTE: When adding new API calls, always consider error handling.
 * For user-facing errors, show a toast or inline error message.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Custom error class for API failures.
 * Contains the HTTP status code and error message.
 */
export class ApiError extends Error {
  constructor(
    /** HTTP status code (e.g., 404, 500) */
    public status: number,
    /** Error message from server or default */
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Handle fetch response - throws ApiError on non-2xx status.
 * Returns parsed JSON on success.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // Try to get error message from response body
    let message: string;
    try {
      const body = await response.json();
      message = body.error || body.message || `HTTP ${response.status}`;
    } catch {
      message = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new ApiError(response.status, message);
  }
  return response.json();
}

/**
 * API client with typed methods for all HTTP verbs.
 * All methods throw ApiError on failure.
 */
export const api = {
  /**
   * GET request - fetch data from the server.
   * @throws ApiError on non-2xx response
   */
  get: <T = unknown>(url: string): Promise<T> =>
    fetch(url).then(r => handleResponse<T>(r)),

  /**
   * POST request - create new resource or trigger action.
   * @throws ApiError on non-2xx response
   */
  post: <T = unknown>(url: string, body?: unknown): Promise<T> =>
    fetch(url, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: body ? JSON.stringify(body) : undefined
    }).then(r => handleResponse<T>(r)),

  /**
   * PUT request - update existing resource.
   * @throws ApiError on non-2xx response
   */
  put: <T = unknown>(url: string, body: unknown): Promise<T> =>
    fetch(url, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(body)
    }).then(r => handleResponse<T>(r)),

  /**
   * DELETE request - remove resource.
   * @throws ApiError on non-2xx response
   */
  del: <T = unknown>(url: string): Promise<T> =>
    fetch(url, { method: 'DELETE' }).then(r => handleResponse<T>(r)),
};
