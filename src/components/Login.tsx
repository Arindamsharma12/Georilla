import React, { useState } from 'react';

const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // Dummy login logic
    if (username && password) {
      onLogin();
    } else {
      alert('Please enter username and password');
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px', color: '#fff', backgroundColor: '#000' }}>
      <h2>Georilla 🦍</h2>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ margin: '5px' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ margin: '5px' }}
      />
      <button onClick={handleLogin} style={{ margin: '5px', backgroundColor: '#333', color: '#fff' }}>
        Login
      </button>
    </div>
  );
};

export default Login; 