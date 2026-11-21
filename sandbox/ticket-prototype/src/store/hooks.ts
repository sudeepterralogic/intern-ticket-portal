import { createAsyncThunk } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

import { toApiError } from '../services/http';
import type { AppDispatch, RootState } from './index';

// Use these everywhere instead of plain useDispatch / useSelector:
// they already know the store's types, so no casting in components.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

// createAsyncThunk that knows RootState, and that a failed thunk
// rejects with a plain string message (rejectWithValue(message)).
export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
  rejectValue: string;
}>();

// Turns any thrown error into the message we show to the user
export const errorMessage = (error: unknown, fallback: string) =>
  toApiError(error, fallback).message;
