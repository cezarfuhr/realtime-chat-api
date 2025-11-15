import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../src/services/authStore';

describe('Auth Store', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('should set auth correctly', () => {
    const user = { _id: '1', username: 'testuser', email: 'test@example.com' };
    const token = 'test-token';

    useAuthStore.getState().setAuth(user, token);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.token).toBe(token);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should update user data', () => {
    const user = { _id: '1', username: 'testuser', email: 'test@example.com' };
    useAuthStore.getState().setAuth(user, 'token');

    useAuthStore.getState().updateUser({ username: 'newusername' });

    const state = useAuthStore.getState();
    expect(state.user.username).toBe('newusername');
    expect(state.user._id).toBe('1');
  });

  it('should logout correctly', () => {
    const user = { _id: '1', username: 'testuser' };
    useAuthStore.getState().setAuth(user, 'token');

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
