import { createSlice } from '@reduxjs/toolkit';

import {
  createUser as createUserApi,
  deleteUser as deleteUserApi,
  getUsers,
  updateUser as updateUserApi,
} from '../services/api';
import type { CreateUserInput, ManagedUser, UpdateUserInput } from '../types/ticket';
import type { RootState } from './index';
import { createAppAsyncThunk, errorMessage } from './hooks';
import { logout, sessionExpired } from './authSlice';

// Users & Agents managed by the Admin (Users page).
// The backend allows /users for Admin only; non-Admins get 403.
type UsersState = {
  items: ManagedUser[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed'; // of the list load
  error: string | null;                                 // of the list load
};

const initialState: UsersState = {
  items: [],
  status: 'idle',
  error: null,
};

// ---------- Thunks ----------
// Each one rejects with a readable message (rejectWithValue), so the page
// can show it: `await dispatch(createUser(x)).unwrap()` throws that string.

export const fetchUsers = createAppAsyncThunk(
  'users/fetchAll',
  async (_: void, { rejectWithValue }) => {
    try {
      return await getUsers();
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Unable to load users'));
    }
  },
);

export const createUser = createAppAsyncThunk(
  'users/create',
  async (input: CreateUserInput, { getState, rejectWithValue }) => {
    // Quick check before calling the API (the backend also returns 409)
    const exists = getState().users.items.some(
      (user) =>
        user.username.toLowerCase() === input.username.toLowerCase() ||
        user.email.toLowerCase() === input.email.toLowerCase(),
    );
    if (exists) {
      return rejectWithValue('Username or email already exists.');
    }

    try {
      return await createUserApi(input);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to create user.'));
    }
  },
);

export const updateUser = createAppAsyncThunk(
  'users/update',
  async ({ id, changes }: { id: number; changes: UpdateUserInput }, { rejectWithValue }) => {
    try {
      return await updateUserApi(id, changes);
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to update user.'));
    }
  },
);

export const deleteUser = createAppAsyncThunk(
  'users/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await deleteUserApi(id);
      return id;
    } catch (error) {
      return rejectWithValue(errorMessage(error, 'Failed to delete user.'));
    }
  },
);

// ---------- Slice ----------

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'Unable to load users';
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.items.findIndex((user) => user.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.items = state.items.filter((user) => user.id !== action.payload);
      })
      // Don't keep another account's user list after logout
      .addCase(logout.fulfilled, () => initialState)
      .addCase(logout.rejected, () => initialState)
      .addCase(sessionExpired, () => initialState);
  },
});

export default usersSlice.reducer;

// ---------- Selectors ----------
export const selectUsers = (state: RootState) => state.users.items;
export const selectUsersStatus = (state: RootState) => state.users.status;
export const selectUsersError = (state: RootState) => state.users.error;
