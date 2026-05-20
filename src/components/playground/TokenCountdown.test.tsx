import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TokenCountdown from './TokenCountdown';

describe('TokenCountdown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders nothing when expiresAt is null', () => {
    const { container } = render(<TokenCountdown expiresAt={null} />);
    expect(container.textContent).toBe('');
  });

  it('shows the seconds remaining and fires onExpired at 0', () => {
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    const onExpired = vi.fn();
    render(<TokenCountdown expiresAt={Date.now() + 3000} onExpired={onExpired} />);
    expect(screen.getByText(/3s/)).toBeTruthy();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(/2s/)).toBeTruthy();

    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText(/0s/)).toBeTruthy();
    expect(onExpired).toHaveBeenCalled();
  });
});
