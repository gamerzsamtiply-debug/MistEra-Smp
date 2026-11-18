export type ErrorCode = 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED' | 'INTERNAL';

export const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

/** An error whose message is safe to show to end users. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
  get status(): number {
    return STATUS[this.code];
  }
}

export function fail(code: Exclude<ErrorCode, 'INTERNAL'>, message: string): ApiError {
  return new ApiError(code, message);
}
