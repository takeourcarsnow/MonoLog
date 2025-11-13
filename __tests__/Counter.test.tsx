import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from '../lib/features/counterSlice';
import Counter from '../app/components/Counter';

const renderWithProvider = (component: React.ReactElement) => {
  const store = configureStore({
    reducer: {
      counter: counterReducer,
    },
  });
  return render(<Provider store={store}>{component}</Provider>);
};

describe('Counter Component', () => {
  it('renders initial count', () => {
    renderWithProvider(<Counter />);
    expect(screen.getByText('Counter: 0')).toBeInTheDocument();
  });

  it('increments count on button click', () => {
    renderWithProvider(<Counter />);
    const button = screen.getByText('Increment');
    fireEvent.click(button);
    expect(screen.getByText('Counter: 1')).toBeInTheDocument();
  });

  it('decrements count on button click', () => {
    renderWithProvider(<Counter />);
    const button = screen.getByText('Decrement');
    fireEvent.click(button);
    expect(screen.getByText('Counter: -1')).toBeInTheDocument();
  });

  it('increments by amount on button click', () => {
    renderWithProvider(<Counter />);
    const button = screen.getByText('Increment by 5');
    fireEvent.click(button);
    expect(screen.getByText('Counter: 5')).toBeInTheDocument();
  });

  it('handles multiple actions', () => {
    renderWithProvider(<Counter />);
    fireEvent.click(screen.getByText('Increment'));
    fireEvent.click(screen.getByText('Increment by 5'));
    fireEvent.click(screen.getByText('Decrement'));
    expect(screen.getByText('Counter: 5')).toBeInTheDocument(); // 0 + 1 + 5 - 1 = 5
  });
});