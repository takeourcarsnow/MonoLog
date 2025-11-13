import { configureStore } from '@reduxjs/toolkit';
// Import your slices here
import counterReducer from './features/counterSlice';

export const store = configureStore({
  reducer: {
    // Add your reducers here
    counter: counterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;