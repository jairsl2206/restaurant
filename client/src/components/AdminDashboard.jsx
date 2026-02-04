import { useState } from 'react';
import MenuManager from './MenuManager';
import UserManager from './UserManager';
import SettingsManager from './SettingsManager';
import CategoryManager from './CategoryManager';
import SalesReport from './SalesReport';
import './AdminDashboard.css';

function AdminDashboard({ user, onLogout, settings, onSettingsUpdate }) {
    const [activeTab, setActiveTab] = useState('menu');

    // Check if logo is a URL (absolute or relative) or emoji
    const isLogoUrl = settings?.restaurant_logo?.startsWith('http') ||
        settings?.restaurant_logo?.startsWith('/uploads/');

    return (
        <div className="admin-dashboard fade-in">
            <header className="admin-header">
                <div className="header-content">
                    <div className="header-left">
                        <div className="logo-title-group">
                            {isLogoUrl ? (
                                <img
                                    src={settings.restaurant_logo}
                                    alt="Logo"
                                    className="admin-logo-img"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <span className="admin-logo-emoji">{settings?.restaurant_logo || '🍔'}</span>
                            )}
                            <div className="title-group">
                                <h1>{settings?.restaurant_name || 'Restaurant POS'}</h1>
                                <span className="admin-badge">Admin</span>
                            </div>
                        </div>
                        <p className="welcome-text">Bienvenido, <strong>{user.username}</strong></p>
                    </div>
                    <button className="btn btn-logout" onClick={onLogout}>
                        <span className="logout-icon">🚪</span>
                        <span className="logout-text">Salir</span>
                    </button>
                </div>
            </header>

            <nav className="admin-tabs">
                <button
                    className={`tab-btn ${activeTab === 'menu' ? 'active' : ''}`}
                    onClick={() => setActiveTab('menu')}
                >
                    <span className="tab-icon">🍔</span>
                    <span className="tab-text">Menú</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
                    onClick={() => setActiveTab('categories')}
                >
                    <span className="tab-icon">🏷️</span>
                    <span className="tab-text">Categorías</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <span className="tab-icon">👥</span>
                    <span className="tab-text">Usuarios</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    <span className="tab-icon">⚙️</span>
                    <span className="tab-text">Configuración</span>
                </button>
                <button
                    className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reports')}
                >
                    <span className="tab-icon">📈</span>
                    <span className="tab-text">Reportes</span>
                </button>
            </nav>

            <main className="admin-content">
                <div className="content-wrapper">
                    {activeTab === 'menu' && <MenuManager />}
                    {activeTab === 'categories' && <CategoryManager />}
                    {activeTab === 'users' && <UserManager />}
                    {activeTab === 'settings' && (
                        <SettingsManager
                            settings={settings}
                            onSettingsUpdate={onSettingsUpdate}
                        />
                    )}
                    {activeTab === 'reports' && <SalesReport />}
                </div>
            </main>
        </div>
    );
}

export default AdminDashboard;
