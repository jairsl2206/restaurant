import { useState, useEffect } from 'react';
import Login from './Login';
import AdminDashboard from './components/AdminDashboard';
import Dashboard from './Dashboard';
import './App.css';
import API_BASE_URL from './config';

function App() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    restaurant_name: 'Restaurant POS',
    restaurant_logo: '🍔'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch(API_BASE_URL + '/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const refreshSettings = () => fetchSettings();

  return (
    <div className="app">
      {user ? (
        user.role === 'admin' ? (
          <AdminDashboard
            user={user}
            onLogout={handleLogout}
            settings={settings}
            onSettingsUpdate={refreshSettings}
          />
        ) : (
          <Dashboard
            user={user}
            onLogout={handleLogout}
            settings={settings}
          />
        )
      ) : (
        <Login
          onLogin={handleLogin}
          settings={settings}
        />
      )}
    </div>
  );
}

export default App;
