import { createSlice } from '@reduxjs/toolkit';

import { loginUser, logoutUser, refreshSession } from '../services/api';
import type { SessionUser } from '../services/http';
import type { RootState } from './index';
import { createAppAsyncThunk, errorMessage } from './hooks';

type AuthState = {
  user: SessionUser | null;    // null = not logged in
  sessionChecked: boolean;     // false until the page-load refresh has finished
  loginStatus: 'idle' | 'loading' | 'failed';
  error: string | null;        // last login error, shown on the Login page
};

const initialState: AuthState = {
  user: null,
  sessionChecked: false,
  loginStatus: 'idle',
  error: null,
};

// ---------- Thunks (all API calls go through services/api.ts) ----------

// On page load: if the refresh cookie is still valid, we stay logged in
export const restoreSession = createAppAsyncThunk('auth/restoreSession', async () => {
  const session = await refreshSession();
  return session?.user ?? null;
});

export const login = createAppAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const data = await loginUser(credentials.username, credentials.password);
      return data.user;
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Login failed'));
    }
  },
);

export const logout = createAppAsyncThunk('auth/logout', async () => {
  await logoutUser();
});

// ---------- Slice ----------

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Dispatched by the axios interceptor when the refresh token is no longer valid
    sessionExpired: (state) => {
      state.user = null;
    },
    clearLoginError: (state) => {
      state.error = null;
      state.loginStatus = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.sessionChecked = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.user = null;
        state.sessionChecked = true;
      })
      .addCase(login.pending, (state) => {
        state.loginStatus = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loginStatus = 'idle';
      })
      .addCase(login.rejected, (state, action) => {
        state.loginStatus = 'failed';
        state.error = action.payload ?? 'Login failed';
      })
      // Log out locally even if the server call fails
      .addCase(logout.fulfilled, () => ({ ...initialState, sessionChecked: true }))
      .addCase(logout.rejected, () => ({ ...initialState, sessionChecked: true }));
  },
});

export const { sessionExpired, clearLoginError } = authSlice.actions;
export default authSlice.reducer;

// ---------- Selectors ----------
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectIsLoggedIn = (state: RootState) => state.auth.user !== null;
export const selectRole = (state: RootState) => state.auth.user?.role ?? 'User';
