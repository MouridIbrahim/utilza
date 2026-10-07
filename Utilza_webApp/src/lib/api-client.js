import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export { API_BASE_URL };

export function backendHealthUrl() {
  return `${API_BASE_URL.replace(/\/+$/, '')}/health`;
}

// Backend envelope: { success:true, data } / { success:false, error:{code,message,details?} }
export function normalizeError(err) {
  if (err?.response) {
    const { status, data } = err.response;
    const code = data?.error?.code || httpCodeFallback(status);
    const message =
      data?.error?.message || err.message || 'Something went wrong on our side.';
    return {
      status,
      code,
      message,
      details: data?.error?.details,
      raw: data,
    };
  }
  if (err?.request) {
    return {
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'We could not reach Utilza.',
      details: undefined,
    };
  }
  return {
    status: 0,
    code: 'UNKNOWN_ERROR',
    message: err?.message || 'Something went wrong on our side.',
    details: undefined,
  };
}

function httpCodeFallback(status) {
  switch (status) {
    case 400:
      return 'VALIDATION_ERROR';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 410:
      return 'FILE_EXPIRED';
    case 413:
      return 'FILE_TOO_LARGE';
    case 429:
      return 'RATE_LIMITED';
    case 501:
      return 'NOT_IMPLEMENTED';
    default:
      return 'INTERNAL_ERROR';
  }
}

export function unwrap(response) {
  // Axios full response -> backend `data` payload
  return response?.data?.data;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Auth header is attached by the session store interceptor (see stores/session.js).
// Never set multipart Content-Type manually — let the browser set the boundary.
export function isBinaryDownload(url) {
  return typeof url === 'string' && url.includes('/files/');
}
