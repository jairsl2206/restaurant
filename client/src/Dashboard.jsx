import { useState, useEffect } from 'react';
import OrderCard from './OrderCard';
import NewOrderModal from './NewOrderModal';
import './Dashboard.css';
import API_BASE_URL from './config';

const API_URL = API_BASE_URL;

function Dashboard({ user, onLogout, settings }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewOrder, setShowNewOrder] = useState(false);
    const [editOrder, setEditOrder] = useState(null); // Order being edited
    const [filter, setFilter] = useState('active'); // 'active' or 'all'
    const [notification, setNotification] = useState(null);
    const [prevOrders, setPrevOrders] = useState([]);

    // Mobile State
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedStatus, setExpandedStatus] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        fetchOrders();
        // Poll for updates every 5 seconds
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
    }, [filter]);

    const fetchOrders = async () => {
        try {
            const endpoint = filter === 'all' ? '/orders/all' : '/orders';
            const response = await fetch(`${API_URL}${endpoint}`);
            const data = await response.json();

            // Notification Logic for Waiters
            if (user.role === 'waiter' && prevOrders.length > 0) {
                const newReadyOrders = data.filter(o => o.status === 'Listo para Servir');
                const oldReadyOrders = prevOrders.filter(o => o.status === 'Listo para Servir');

                // If we have more ready orders than before, or a specific ID changed status
                // Simplify: Find any order that is NOW 'Listo para Servir' but wasn't before
                const justReady = newReadyOrders.find(newOrder => {
                    const oldOrder = prevOrders.find(o => o.id === newOrder.id);
                    return !oldOrder || oldOrder.status !== 'Listo para Servir';
                });

                if (justReady) {
                    setNotification({
                        message: `¡Orden #${justReady.id} (Mesa ${justReady.table_number}) lista para servir! 🔔`,
                        type: 'success'
                    });
                    // Auto dismiss
                    setTimeout(() => setNotification(null), 5000);
                }
            }

            setOrders(data);
            setPrevOrders(data);
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                fetchOrders();
            }
        } catch (err) {
            console.error('Error updating order:', err);
        }
    };

    const handleNewOrder = async (orderData) => {
        try {
            const response = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData),
            });

            if (response.ok) {
                setShowNewOrder(false);
                fetchOrders();
            }
        } catch (err) {
            console.error('Error creating order:', err);
        }
    };

    const handleEditOrder = (order) => {
        setEditOrder(order);
        setShowNewOrder(true);
    };

    const handleUpdateOrder = async (orderData) => {
        try {
            const response = await fetch(`${API_URL}/orders/${editOrder.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ items: orderData.items }), // Only items update supported currently
            });

            if (response.ok) {
                setShowNewOrder(false);
                setEditOrder(null);
                fetchOrders();
            }
        } catch (err) {
            console.error('Error updating order:', err);
        }
    };

    // Role-based filtering
    const isCook = user.role === 'cook';

    // Notification Logic
    useEffect(() => {
        if (!isCook && orders.length > 0) {
            // Check for orders that just became 'Listo para Servir'
            const readyOrders = orders.filter(o => o.status === 'Listo para Servir');
            // This is a simple implementation. In a real real-time app we'd compare with previous state.
            // For now, let's just highlight them in the UI.
        }
    }, [orders, isCook]);

    const getColumns = () => {
        if (isCook) {
            // Cook views FIFO queue - only orders in "En Cocina" status
            const cooking = orders.filter(o => o.status === 'En Cocina');
            // Sort by updated_at (oldest first - FIFO)
            cooking.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));

            return {
                'Cola de Cocina': cooking
            };
        }

        // Waiter views everything grouped - all columns use FIFO
        const creado = orders.filter(o => o.status === 'Creado');
        const enCocina = orders.filter(o => o.status === 'En Cocina');
        const listoParaServir = orders.filter(o => o.status === 'Listo para Servir');
        const servido = orders.filter(o => o.status === 'Servido');
        const pagado = orders.filter(o => o.status === 'Pagado');

        // Sort all by updated_at (oldest first - FIFO)
        creado.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
        enCocina.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
        listoParaServir.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
        servido.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
        pagado.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));

        return {
            'Creado': creado,
            'En Cocina': enCocina,
            'Listo para Servir': listoParaServir,
            'Servido': servido,
            'Pagado': pagado,
        };
    };

    const groupedOrders = getColumns();

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-content">
                    <div className="header-left">
                        <div style={{ marginRight: '15px' }}>
                            {settings?.restaurant_logo && (settings.restaurant_logo.match(/^http/) || settings.restaurant_logo.match(/^\/uploads/)) ? (
                                <img
                                    src={settings.restaurant_logo}
                                    alt="Logo"
                                    style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                            ) : (
                                <span style={{ fontSize: '2.5rem' }}>{settings?.restaurant_logo || '🍔'}</span>
                            )}
                            <span style={{ display: 'none', fontSize: '2.5rem' }}>🍔</span>
                        </div>
                        <div>
                            <h1>{settings?.restaurant_name}</h1>
                            <p>Bienvenido, <strong>{user.username}</strong></p>
                        </div>
                    </div>
                    <div className="header-actions">
                        <div className="segmented-control">
                            <button
                                className={`segment-btn ${filter === 'active' ? 'active' : ''}`}
                                onClick={() => setFilter('active')}
                            >
                                ⚡ Activas
                            </button>
                            <button
                                className={`segment-btn ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter('all')}
                            >
                                📋 Todas
                            </button>
                        </div>

                        {!isCook && (
                            <button
                                className="btn btn-primary btn-glow"
                                onClick={() => setShowNewOrder(true)}
                            >
                                + Nueva Orden
                            </button>
                        )}
                        <button className="btn btn-outline-danger" onClick={onLogout}>
                            Salir
                        </button>
                    </div>
                </div>
            </header >

            <main className="dashboard-main container">
                {loading ? (
                    <div className="loading">
                        <div className="spinner"></div>
                        <p>Cargando órdenes...</p>
                    </div>
                ) : isMobile ? (
                    // Mobile Drill-down View
                    <div className="mobile-drilldown">
                        {selectedOrder ? (
                            // Level 3: Order Detail
                            <div className="mobile-view-level-3 slide-in">
                                <button className="btn-back" onClick={() => setSelectedOrder(null)}>
                                    ← Volver a {selectedOrder.status}
                                </button>
                                <OrderCard
                                    order={selectedOrder}
                                    user={user}
                                    onStatusChange={(id, status) => {
                                        handleStatusChange(id, status);
                                        setSelectedOrder(null); // Go back after action
                                    }}
                                    onEdit={handleEditOrder}
                                />
                            </div>
                        ) : expandedStatus ? (
                            // Level 2: Order List for Status
                            <div className="mobile-view-level-2 slide-in">
                                <button className="btn-back" onClick={() => setExpandedStatus(null)}>
                                    ← Volver a Estados
                                </button>
                                <div className="column-header">
                                    <h2>{expandedStatus}</h2>
                                    <span className="count-badge">{groupedOrders[expandedStatus]?.length || 0}</span>
                                </div>
                                <div className="mobile-orders-list">
                                    {groupedOrders[expandedStatus]?.length === 0 ? (
                                        <div className="empty-state"><p>No hay órdenes</p></div>
                                    ) : (
                                        groupedOrders[expandedStatus]?.map(order => (
                                            <div
                                                key={order.id}
                                                className="mobile-order-brief glass-card"
                                                onClick={() => setSelectedOrder(order)}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                    <strong>Orden #{order.id}</strong>
                                                    <span>Mesa {order.table_number}</span>
                                                </div>
                                                <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                                                    {order.items.substring(0, 30)}...
                                                </div>
                                                <div style={{ textAlign: 'right', marginTop: '5px', color: 'var(--primary)' }}>
                                                    Ver Detalle →
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Level 1: Status List
                            <div className="mobile-view-level-1">
                                {Object.entries(groupedOrders).map(([status, statusOrders]) => {
                                    // Highlight priorities
                                    const isPriority = status === 'Creado' || status === 'Listo para Servir';
                                    const count = statusOrders.length;

                                    return (
                                        <div
                                            key={status}
                                            className={`mobile-status-card glass-card ${isPriority ? 'status-priority' : ''}`}
                                            onClick={() => setExpandedStatus(status)}
                                        >
                                            <div className="status-name">
                                                {status}
                                                {isPriority && count > 0 && <span className="priority-dot">●</span>}
                                            </div>
                                            <div className="status-count">
                                                {count} {count === 1 ? 'Orden' : 'Ordenes'} →
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    // Desktop Kanban View (Existing)
                    <div className="orders-board">
                        {Object.entries(groupedOrders).map(([status, statusOrders]) => (
                            <div key={status} className="status-column">
                                <div className="column-header">
                                    <h2>{status}</h2>
                                    <span className="count-badge">{statusOrders.length}</span>
                                </div>
                                <div className="column-content">
                                    {statusOrders.length === 0 ? (
                                        <div className="empty-state">
                                            <p>No hay órdenes en este estado</p>
                                        </div>
                                    ) : (
                                        statusOrders.map(order => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                user={user}
                                                onStatusChange={handleStatusChange}
                                                onEdit={handleEditOrder}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Toast Notification */}
            {
                notification && (
                    <div className={`toast-notification slide-in ${notification.type}`}>
                        <div className="toast-icon">🛎️</div>
                        <div className="toast-message">{notification.message}</div>
                        <button className="toast-close" onClick={() => setNotification(null)}>×</button>
                    </div>
                )
            }

            {
                showNewOrder && (
                    <NewOrderModal
                        onClose={() => {
                            setShowNewOrder(false);
                            setEditOrder(null);
                        }}
                        onSubmit={editOrder ? handleUpdateOrder : handleNewOrder}
                        initialOrder={editOrder}
                    />
                )
            }
        </div >
    );
}

export default Dashboard;
