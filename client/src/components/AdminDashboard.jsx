import { useState } from 'react';
import MenuManager from './MenuManager';
import UserManager from './UserManager';
import SettingsManager from './SettingsManager';
import CategoryManager from './CategoryManager';
import SalesReport from './SalesReport';
import CategoryPromotionManager from './CategoryPromotionManager';
import PastOrders from './PastOrders';
import ActiveProductionOrders from './ActiveProductionOrders';
import SalePeriodControl from './SalePeriodControl';
import './AdminDashboard.css';

const NAV_GROUPS = [
    {
        id: 'operaciones',
        label: 'Operaciones',
        items: [
            { key: 'jornada',     icon: '🗓️', label: 'Jornada' },
            { key: 'production',  icon: '⚡',  label: 'Producción' },
            { key: 'past-orders', icon: '📅',  label: 'Historial' },
        ]
    },
    {
        id: 'catalogo',
        label: 'Catálogo',
        items: [
            { key: 'menu',       icon: '🍔',  label: 'Menú' },
            { key: 'categories', icon: '🏷️',  label: 'Categorías' },
            { key: 'promotions', icon: '✨',   label: 'Promociones' },
        ]
    },
    {
        id: 'gestion',
        label: 'Gestión',
        items: [
            { key: 'users',    icon: '👥',  label: 'Usuarios' },
            { key: 'settings', icon: '⚙️',  label: 'Config.' },
            { key: 'reports',  icon: '📈',  label: 'Reportes' },
        ]
    }
];

function getGroupForKey(key) {
    return NAV_GROUPS.find(g => g.items.some(i => i.key === key))?.id || 'operaciones';
}

function AdminDashboard({ user, onLogout, settings, onSettingsUpdate }) {
    const [activeTab, setActiveTab] = useState(
        () => localStorage.getItem('adminActiveSection') || 'jornada'
    );
    const [activeMobileGroup, setActiveMobileGroup] = useState(
        () => getGroupForKey(localStorage.getItem('adminActiveSection') || 'jornada')
    );

    const isLogoUrl = settings?.restaurant_logo?.startsWith('http') ||
        settings?.restaurant_logo?.startsWith('/uploads/');

    const handleTabChange = (key) => {
        setActiveTab(key);
        localStorage.setItem('adminActiveSection', key);
        setActiveMobileGroup(getGroupForKey(key));
    };

    const handleMobileGroupChange = (groupId) => {
        setActiveMobileGroup(groupId);
        // Auto-select first item in group if current tab is not in this group
        const group = NAV_GROUPS.find(g => g.id === groupId);
        if (group && !group.items.some(i => i.key === activeTab)) {
            handleTabChange(group.items[0].key);
        }
    };

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
                    <button className="btn btn-logout" onClick={onLogout} aria-label="Cerrar sesión">
                        <span className="logout-icon" aria-hidden="true">🚪</span>
                        <span className="logout-text">Salir</span>
                    </button>
                </div>
            </header>

            <div className="admin-body">
                {/* Desktop Sidebar */}
                <nav className="admin-sidebar" aria-label="Navegación de administración">
                    {NAV_GROUPS.map(group => (
                        <div key={group.id} className="sidebar-group">
                            <div className="sidebar-group-label">{group.label}</div>
                            {group.items.map(item => (
                                <button
                                    key={item.key}
                                    className={`sidebar-item ${activeTab === item.key ? 'active' : ''}`}
                                    onClick={() => handleTabChange(item.key)}
                                    aria-current={activeTab === item.key ? 'page' : undefined}
                                >
                                    <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
                                    <span className="sidebar-label">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* Mobile Nav */}
                <nav className="admin-mobile-nav" aria-label="Navegación mobile">
                    <div className="mobile-groups">
                        {NAV_GROUPS.map(group => (
                            <button
                                key={group.id}
                                className={`mobile-group-btn ${activeMobileGroup === group.id ? 'active' : ''}`}
                                onClick={() => handleMobileGroupChange(group.id)}
                            >
                                {group.label}
                            </button>
                        ))}
                    </div>
                    <div className="mobile-sub-items">
                        {NAV_GROUPS.find(g => g.id === activeMobileGroup)?.items.map(item => (
                            <button
                                key={item.key}
                                className={`mobile-sub-btn ${activeTab === item.key ? 'active' : ''}`}
                                onClick={() => handleTabChange(item.key)}
                                aria-current={activeTab === item.key ? 'page' : undefined}
                            >
                                <span aria-hidden="true">{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </nav>

                <main className="admin-content">
                    <div className="content-wrapper">
                        {activeTab === 'menu'        && <MenuManager />}
                        {activeTab === 'categories'  && <CategoryManager />}
                        {activeTab === 'users'       && <UserManager />}
                        {activeTab === 'settings'    && (
                            <SettingsManager
                                settings={settings}
                                onSettingsUpdate={onSettingsUpdate}
                            />
                        )}
                        {activeTab === 'promotions'  && <CategoryPromotionManager />}
                        {activeTab === 'reports'     && <SalesReport />}
                        {activeTab === 'past-orders' && <PastOrders />}
                        {activeTab === 'production'  && <ActiveProductionOrders />}
                        {activeTab === 'jornada'     && <SalePeriodControl user={user} />}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default AdminDashboard;
