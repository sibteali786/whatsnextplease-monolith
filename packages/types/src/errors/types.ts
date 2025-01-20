export interface ErrorResponse {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

export interface ErrorDetails {
  [key: string]: unknown;
}
