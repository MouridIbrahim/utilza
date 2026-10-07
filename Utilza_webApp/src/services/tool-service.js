import { apiClient, unwrap, normalizeError, API_BASE_URL } from '../lib/api-client.js';

// Unified executor for POST /tools/<family>/<tool>.
// - file tools: multipart FormData, field name `files` (backend multer expects `files`).
// - JSON tools (URL/DNS/TLS): application/json body.
// Returns the raw backend `data` payload: either a download envelope
// ({jobId,fileId,downloadUrl,mimeType,size,expiresAt}) or a JSON result.
export async function executeTool({ endpoint, files = [], params = {}, signal }) {
  try {
    if (files.length > 0) {
      const form = new FormData();
      for (const f of files) form.append('files', f, f.name);
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue;
        form.append(key, String(value));
      }
      // Never set Content-Type manually — the browser adds the boundary.
      const res = await apiClient.post(endpoint, form, { signal });
      return unwrap(res);
    }
    const res = await apiClient.post(endpoint, params, { signal });
    return unwrap(res);
  } catch (err) {
    throw normalizeError(err);
  }
}

export function isDownloadResult(data) {
  return !!data && typeof data.downloadUrl === 'string';
}

// Backend download URLs already contain the API prefix (e.g.
// `/api/v1/files/<id>`), so they must NOT go through the axios baseURL join
// (that produced `/api/v1/api/v1/files/<id>` → 404 → "Download failed").
// Resolve against the API origin instead: dev proxy origin in development,
// API host origin when VITE_API_BASE_URL is absolute.
export function absoluteDownloadUrl(downloadUrl) {
  if (/^https?:\/\//i.test(downloadUrl)) return downloadUrl;
  const origin = new URL(API_BASE_URL, window.location.origin).origin;
  return `${origin}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;
}

// Fetch a short-lived result attachment as a Blob. Never persist the URL.
export async function downloadBlob(downloadUrl, signal) {
  try {
    // Absolute URL → axios leaves baseURL out of the request.
    const res = await apiClient.get(absoluteDownloadUrl(downloadUrl), {
      responseType: 'blob',
      signal,
    });
    const disposition = res.headers?.['content-disposition'] || '';
    const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
    let filename = match?.[1]?.replace(/['"]/g, '') || downloadUrl.split('/').pop() || 'result';
    return { blob: res.data, filename, mimeType: res.headers?.['content-type'] };
  } catch (err) {
    throw normalizeError(err);
  }
}

export function formatBytes(size) {
  if (size === null || size === undefined) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
