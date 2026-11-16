

import { useState } from 'react';
import type { FormEvent } from 'react';


type Props = {
  onLogin: (username: string, password: string) => Promise<boolean>;
};


function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();


    setError('');
    setLoading(true);


    try {
      const success = await onLogin(username.trim(), password);


      if (!success) {
        setError('Invalid username or password.');
      }
    } catch {
      setError('Unable to connect to the backend.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Ticket Management System</h1>
        <p>Login to continue</p>


        <label>Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          required
        />


        <label>Password</label>
        <input 
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />


        {error && <p className="error-message">{error}</p>}


        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}


export default Login;