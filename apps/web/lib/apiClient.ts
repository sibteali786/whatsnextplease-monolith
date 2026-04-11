/* eslint-disable @typescript-eslint/no-explicit-any */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestConfig {
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private onAuthError?: () => void;

  // Request interceptors
  private requestInterceptors: Array<
    (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  > = [];

  // Response interceptors
  private responseInterceptors: Array<(response: Response) => Response | Promise<Response>> = [];

  constructor(
    config: {
      baseUrl?: string;
      timeout?: number;
      onAuthError?: () => void;
    } = {}
  ) {
    this.baseUrl = config.baseUrl || '/api/proxy';
    this.defaultTimeout = config.timeout || 30000; // 30 seconds
    this.onAuthError = config.onAuthError;
  }

  /**
   * Add request interceptor (like Axios)
   */
  addRequestInterceptor(
    interceptor: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
  ): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor (like Axios)
   */
  addResponseInterceptor(interceptor: (response: Response) => Response | Promise<Response>): void {
    this.responseInterceptors.push(interceptor);
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    config: RequestConfig = {}
  ): Promise<T> {
    // Apply request interceptors
    let finalConfig = { ...config };
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }

    // Build URL
    const url = new URL(path, window.location.origin);
    url.pathname = `${this.baseUrl}${path}`;

    // Add query parameters
    if (finalConfig.params) {
      Object.entries(finalConfig.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Setup AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      finalConfig.timeout || this.defaultTimeout
    );

    // Build fetch options
    // eslint-disable-next-line no-undef
    const fetchOptions: RequestInit = {
      method,
      headers: {
        ...(!(finalConfig.body instanceof FormData) && { 'Content-Type': 'application/json' }),
        ...finalConfig.headers,
      },
      credentials: 'include', // Important for cookies
      signal: finalConfig.signal || controller.signal,
    };

    // Add body for non-GET requests
    if (finalConfig.body && !['GET'].includes(method)) {
      fetchOptions.body =
        finalConfig.body instanceof FormData ? finalConfig.body : JSON.stringify(finalConfig.body);
    }
    try {
      let response = await fetch(url.toString(), fetchOptions);

      // Apply response interceptors
      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response);
      }

      // Handle 401 - Authentication Error
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));

        if (errorData.code === 'AUTH_REQUIRED' && this.onAuthError) {
          this.onAuthError();
        }

        const error = new Error(errorData.message || 'Authentication required') as ApiError;
        error.status = 401;
        error.code = errorData.code;
        throw error;
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: response.statusText,
        }));

        const error = new Error(
          errorData.message || `Request failed: ${response.statusText}`
        ) as ApiError;
        error.status = response.status;
        error.code = errorData.code;
        error.details = errorData.details;
        throw error;
      }

      // Parse successful response
      const data = await response.json();
      return data as T;
    } catch (error) {
      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout') as ApiError;
        timeoutError.code = 'TIMEOUT';
        throw timeoutError;
      }

      // Handle network errors
      if (error instanceof TypeError) {
        const networkError = new Error('Network error') as ApiError;
        networkError.code = 'NETWORK_ERROR';
        throw networkError;
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  get<T>(path: string, config?: Omit<RequestConfig, 'body'>): Promise<T> {
    return this.request<T>('GET', path, config);
  }

  post<T>(path: string, body?: any, config?: Omit<RequestConfig, 'body'>): Promise<T> {
    return this.request<T>('POST', path, { ...config, body });
  }

  put<T>(path: string, body?: any, config?: Omit<RequestConfig, 'body'>): Promise<T> {
    return this.request<T>('PUT', path, { ...config, body });
  }

  patch<T>(path: string, body?: any, config?: Omit<RequestConfig, 'body'>): Promise<T> {
    return this.request<T>('PATCH', path, { ...config, body });
  }

  delete<T>(path: string, body?: any, config?: Omit<RequestConfig, 'body'>): Promise<T> {
    return this.request<T>('DELETE', path, { ...config, body });
  }
}

// Create singleton with global error handler
export const apiClient = new ApiClient({
  baseUrl: '/api/proxy',
  timeout: 30000,
  onAuthError: () => {
    // Clear any client-side state
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();

      // Redirect to signin with reason
      window.location.href = '/signin?reason=session_expired';
    }
  },
});

// Add logging interceptor (development only)
if (process.env.NODE_ENV === 'development') {
  apiClient.addRequestInterceptor(config => {
    console.log('🚀 API Request:', config);
    return config;
  });

  apiClient.addResponseInterceptor(response => {
    console.log('✅ API Response:', response.status, response.url);
    return response;
  });
}

export type { ApiError, RequestConfig };
