import { apiClient, unwrap } from '../lib/api-client.js';

// Auth surface — mirrors backend auth.service schemas exactly.
// register: email ≤255, password 8–128, name 1–100 optional.
// login: email ≤255, password 1–128.
export async function login({ email, password }, signal) {
  const res = await apiClient.post('/auth/login', { email, password }, { signal });
  return unwrap(res); // { user, token }
}

export async function register({ email, password, name }, signal) {
  const body = { email, password };
  if (name) body.name = name;
  const res = await apiClient.post('/auth/register', body, { signal });
  return unwrap(res); // { user, token }, 201
}

export async function getMe(signal) {
  const res = await apiClient.get('/auth/me', { signal });
  const data = unwrap(res);
  return data?.user || data; // backend returns {id,email,name} directly
}

export async function logout() {
  try {
    const res = await apiClient.post('/auth/logout');
    return unwrap(res);
  } catch {
    // Best-effort acknowledgement — caller always clears local state.
    return { loggedOut: true };
  }
}
