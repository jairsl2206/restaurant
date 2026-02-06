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
