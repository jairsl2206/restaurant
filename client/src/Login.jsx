import { useState } from 'react';
import './Login.css';
import API_BASE_URL from './config';

const API_URL = API_BASE_URL;

function Login({ onLogin, settings }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                onLogin(data.user);
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('Unable to connect to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card glass-card fade-in">
                <div className="login-header">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                        {settings?.restaurant_logo && (settings.restaurant_logo.match(/^http/) || settings.restaurant_logo.match(/^\/uploads/)) ? (
                            <img
                                src={settings.restaurant_logo}
                                alt="Logo"
                                style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                                }}
                            />
                        ) : (
                            <span style={{ fontSize: '3rem' }}>{settings?.restaurant_logo || '🍔'}</span>
                        )}
                        <span style={{ display: 'none', fontSize: '3rem' }}>🍔</span>
                    </div>
                    <h1>{settings?.restaurant_name}</h1>
                    <p>Sistema de Gestión de Pedidos</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <label htmlFor="username">Usuario</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ingrese su usuario"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Contraseña</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Ingrese su contraseña"
                            required
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="login-footer">
                    <p className="hint">Desarrollado por <strong>Jair Saldaña</strong></p>
                </div>
            </div>
        </div>
    );
}

export default Login;
