import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import AdminDashboard from './components/AdminDashboard';
import Dashboard from './Dashboard';
import CustomerMenu from './components/CustomerMenu';
import './App.css';
import API_BASE_URL from './config';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Loading while verifying session
  const [settings, setSettings] = useState({
    restaurant_name: 'Restaurant POS',
    restaurant_logo: '🍔'
  });

  useEffect(() => {
    fetchSettings();
    verifySession();
  }, []);

  // Verify existing session token on app load
  const verifySession = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(API_BASE_URL + '/verify-session', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Token expired or invalid — clear it
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Error verifying session:', err);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

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

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refreshSettings = () => fetchSettings();

  // Loading state while verifying session
  if (loading) {
    return (
      <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p style={{ fontSize: '1.2rem', color: '#888' }}>Cargando...</p>
      </div>
    );
  }

  // Helper component for the main admin/staff app
  const MainApp = () => {
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
  };

  return (
    <Routes>
      <Route path="/menu" element={
        <CustomerMenu
          restaurantName={settings.restaurant_name}
          restaurantLogo={settings.restaurant_logo}
        />
      } />
      <Route path="/*" element={<MainApp />} />
    </Routes>
  );
}

export default App;
