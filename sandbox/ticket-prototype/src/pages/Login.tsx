

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearLoginError, login } from '../store/authSlice';
import Icon from '../components/Icon';

// Dispatches the login thunk. On success, auth.user is set and the /login
// route in App.tsx redirects to /dashboard. No API calls in this component.
function Login() {
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state) => state.auth.loginStatus === 'loading');
  // e.g. "Invalid username or password" or "Unable to reach the server..."
  const error = useAppSelector((state) => state.auth.error);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Don't show an old error when the page opens again
  useEffect(() => {
    dispatch(clearLoginError());
  }, [dispatch]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch(login({ username: username.trim(), password }));
  };


  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="brand">
          <span className="brand-logo">
            <Icon name="ticket" size={18} />
          </span>
          <span className="brand-name">Ticket Portal</span>
        </div>

        <div className="login-hero-text">
          <h1>Every request, tracked from open to closed.</h1>
          <p>Users raise tickets, admins assign them, agents resolve them, all in one place.</p>
        </div>

        <ul className="login-steps">
          <li><span className="step-dot tone-info" /> User creates a ticket</li>
          <li><span className="step-dot tone-primary" /> Admin assigns an agent</li>
          <li><span className="step-dot tone-warning" /> Agent works on it</li>
          <li><span className="step-dot tone-success" /> Ticket closed</li>
        </ul>
      </div>

      <div className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <h2>Welcome back</h2>
            <p className="text-muted">Sign in to your account to continue.</p>
          </div>

          <div className="field">
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="alert alert-error">{error}</p>}

          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}


export default Login;