import { configureStore } from '@reduxjs/toolkit';

import { setSessionExpiredHandler } from '../services/http';
import authReducer, { sessionExpired } from './authSlice';
import usersReducer from './usersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,
  },
});

// Types used by the typed hooks (store/hooks.ts)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// When the axios interceptor can't refresh the token, log the user out.
// (Wired here so services/http.ts doesn't need to import the store.)
setSessionExpiredHandler(() => store.dispatch(sessionExpired()));
