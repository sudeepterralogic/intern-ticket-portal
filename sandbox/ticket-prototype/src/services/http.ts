import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

// The ONE axios instance for the whole app. Only files in services/ import it;
// components never do (they dispatch Redux thunks or call services/api.ts).

export const API_URL = 'http://localhost:3000/api';

export const http = axios.create({
  baseURL: API_URL,
  // Lets the browser send/receive the HttpOnly refresh_token cookie (/api/auth/*)
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ---------- Access token ----------
//
// ACCESS token  -> kept here in memory only (not localStorage, so XSS can't
//                  read it from storage), lives 15 min.
// REFRESH token -> HttpOnly cookie handled by the browser; JS never sees it.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// ---------- Normalised errors ----------
//
// Every failed request rejects with an ApiError, so callers only ever deal
// with { status, message } — never with axios internals.
export class ApiError extends Error {
  // 0 = no response at all (backend down, CORS, no internet)
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// NestJS error body: { statusCode, message: string | string[], error, ... }
type NestErrorBody = { message?: string | string[] };

export function toApiError(error: unknown, fallback = 'Something went wrong'): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError<NestErrorBody>(error)) {
    if (!error.response) {
      return new ApiError(0, 'Unable to reach the server. Is the backend running?');
    }

    const raw = error.response.data?.message;
    // Validation errors come as a list: ["title should not be empty", ...]
    const message = Array.isArray(raw) ? raw.join(', ') : raw;
    return new ApiError(error.response.status, message || fallback);
  }

  return new ApiError(0, error instanceof Error ? error.message : fallback);
}

// ---------- Session refresh ----------
//
// The store registers what to do when the session can't be renewed
// (log the user out). Done as a callback so this file doesn't import the store.
let onSessionExpired: () => void = () => {};

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

export type SessionUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'Admin' | 'Agent' | 'User';
};

export type LoginResponse = {
  access_token: string;
  user: SessionUser;
};

// POST /auth/refresh: the cookie gives a new access token.
// If several requests get 401 at the same time, they share ONE refresh call.
let refreshPromise: Promise<LoginResponse | null> | null = null;

export function refreshAccessToken(): Promise<LoginResponse | null> {
  refreshPromise ??= http
    .post<LoginResponse>('/auth/refresh')
    .then((res) => {
      setAccessToken(res.data.access_token);
      return res.data;
    })
    .catch(() => {
      setAccessToken(null);
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

// ---------- Interceptors ----------

// 1. Before every request: attach the access token
http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 2. After every response: on 401, refresh once and retry; normalise errors
type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean };

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const isAuthRoute = config?.url?.startsWith('/auth/');

    // Expired access token on a normal route -> refresh once, then retry.
    // (Not for /auth/* itself: a 401 from login/refresh is a real answer.)
    if (error.response?.status === 401 && config && !config._retried && !isAuthRoute) {
      config._retried = true;
      const session = await refreshAccessToken();

      if (session) {
        return http(config); // the request interceptor adds the NEW token
      }

      onSessionExpired(); // refresh failed -> the user must log in again
    }

    return Promise.reject(toApiError(error));
  },
);
