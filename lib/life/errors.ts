export type LifeUiErrorCode =
  | 'authentication_required'
  | 'not_found'
  | 'conflict'
  | 'invalid_request'
  | 'upstream_unavailable'
  | 'invalid_upstream_response';

const PUBLIC_MESSAGES: Record<LifeUiErrorCode, string> = {
  authentication_required: 'Your Life session is no longer valid. Sign in again.',
  not_found: 'The requested Life record was not found.',
  conflict: 'Life could not apply that change because the record has changed.',
  invalid_request: 'Life could not accept that request. Check the fields and try again.',
  upstream_unavailable: 'Life is temporarily unavailable. Try again shortly.',
  invalid_upstream_response: 'Life returned an unexpected response.',
};

export class LifeApiError extends Error {
  readonly code: LifeUiErrorCode;
  readonly status: number;
  readonly requestId: string;

  constructor(code: LifeUiErrorCode, status: number, requestId: string) {
    super(PUBLIC_MESSAGES[code]);
    this.name = 'LifeApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

export function mapLifeApiStatus(status: number): LifeUiErrorCode {
  if (status === 401) return 'authentication_required';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'invalid_request';
  if (status === 502 || status === 503) return 'upstream_unavailable';
  return 'upstream_unavailable';
}
