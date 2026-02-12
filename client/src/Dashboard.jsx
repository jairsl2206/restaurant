import { useState, useEffect, useRef } from 'react';
import OrderCard from './OrderCard';
import { ORDER_STATUS } from './constants';
import NewOrderModal from './NewOrderModal';
import NotificationCenter from './components/NotificationCenter';
import { playNotificationSound } from './utils/sound';
import './Dashboard.css';
import API_BASE_URL from './config';

const API_URL = API_BASE_URL;

const statusIcons = {
    [ORDER_STATUS.COOKING]: '🍳',
    [ORDER_STATUS.READY]: '🥡',
    [ORDER_STATUS.SERVED]: '✅',
    [ORDER_STATUS.DELIVERING]: '🚗',
    [ORDER_STATUS.COMPLETED]: '💰',
    [ORDER_STATUS.CANCELLED]: '❌'
};

const statusLabels = {
    [ORDER_STATUS.COOKING]: 'En Cocina',
    [ORDER_STATUS.READY]: 'Listo para Servir',
    [ORDER_STATUS.SERVED]: 'Servido',
    [ORDER_STATUS.DELIVERING]: 'En Reparto',
    [ORDER_STATUS.COMPLETED]: 'Finalizada',
    [ORDER_STATUS.CANCELLED]: 'Cancelado'
};

function Dashboard({ user, onLogout, settings }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewOrder, setShowNewOrder] = useState(false);
    const [editOrder, setEditOrder] = useState(null); // Order being edited
    const [filter, setFilter] = useState('active'); // 'active' or 'all'
    const [notifications, setNotifications] = useState([]);

    const prevOrdersRef = useRef([]);

    // Mobile State
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [expandedStatus, setExpandedStatus] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const addNotification = (message, type, orderId = null) => {
        const newNotif = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date(),
            orderId
        };
        setNotifications(prev => [newNotif, ...prev]);
        playNotificationSound();
    };

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
            if (user.role === 'waiter' && prevOrdersRef.current.length > 0) {
                const readyStatuses = [ORDER_STATUS.READY, ORDER_STATUS.PICKUP_READY];
                const newReadyOrders = data.filter(o => readyStatuses.includes(o.status));

                // Check against prevOrders
                const justReadyOrders = newReadyOrders.filter(newOrder => {
                    const oldOrder = prevOrdersRef.current.find(o => o.id === newOrder.id);
                    return !oldOrder || !readyStatuses.includes(oldOrder.status);
                });

                justReadyOrders.forEach(order => {
                    let action = 'servir';
                    if (order.is_delivery) action = 'entregar';
                    else if (order.is_pickup) action = 'recoger';

                    const locationInfo = order.is_delivery ? `Delivery - ${order.customer_name}` :
                        order.is_pickup ? `Pickup - ${order.customer_name}` :
                            `Mesa ${order.table_number}`;

                    addNotification(
                        `¡Orden #${order.id} (${locationInfo}) lista para ${action}!`,
                        'success',
                        order.id
                    );
                });
            }

            // Notification for Cooks: Sent to Kitchen (COOKING)
            if (user.role === 'cook') {
                const kitchenOrders = data.filter(o => o.status === ORDER_STATUS.COOKING);

                // Find order that is NOW 'En Cocina' but wasn't before
                const justArrived = kitchenOrders.find(newOrder => {
                    const oldOrder = prevOrdersRef.current.find(o => o.id === newOrder.id);

                    // If not found in previous (unlikely if created first, but possible), notify
                    if (!oldOrder) return true;

                    // IF it existed before but was NOT 'COOKING' (e.g. was 'Creado'), notify
                    return oldOrder.status !== ORDER_STATUS.COOKING;
                });

                if (justArrived) {
                    const locationInfo = justArrived.is_delivery ? `Delivery - ${justArrived.customer_name}` : `Mesa ${justArrived.table_number}`;
                    addNotification(
                        `🔔 ¡Nueva Orden en Cocina #${justArrived.id}! (${locationInfo})`,
                        'info',
                        justArrived.id
                    );
                }
            }

            // Notification for Cooks: Order Cancelled
            if (user.role === 'cook' && prevOrdersRef.current.length > 0) {
                const newCancelledOrders = data.filter(o => o.status === ORDER_STATUS.CANCELLED);
                const justCancelled = newCancelledOrders.find(newOrder => {
                    const oldOrder = prevOrdersRef.current.find(o => o.id === newOrder.id);
                    return !oldOrder || oldOrder.status !== ORDER_STATUS.CANCELLED;
                });

                if (justCancelled) {
                    const locationInfo = justCancelled.is_delivery ? `Delivery - ${justCancelled.customer_name}` : `Mesa ${justCancelled.table_number}`;
                    addNotification(
                        `⚠️ ATENCIÓN: La Orden #${justCancelled.id} (${locationInfo}) ha sido CANCELADA.`,
                        'error',
                        justCancelled.id
                    );
                }
            }

            // Cleanup obsolete notifications
            setNotifications(prev => prev.filter(n => {
                if (!n.orderId) return true;
                const currentOrder = data.find(o => o.id === n.orderId);
                if (!currentOrder) return true; // Keep if order not found (safety)

                if (user.role === 'cook') {
                    // For cooks, 'info' is "New Order in Kitchen". Remove if not 'En Cocina'.
                    if (n.type === 'info' && currentOrder.status !== ORDER_STATUS.COOKING) return false;
                }

                if (user.role === 'waiter') {
                    // For waiters, 'success' is "Order Ready". Remove if not 'Listo para Servir'.
                    if (n.type === 'success' && currentOrder.status !== ORDER_STATUS.READY) return false;
                }

                return true;
            }));

            setOrders(data);
            prevOrdersRef.current = data;
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
            } else {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    alert(`Error: ${data.error || 'Failed to create order'}`);
                } catch (e) {
                    alert(`Error creating order: ${text}`);
                }
            }
        } catch (err) {
            console.error('Error creating order:', err);
            alert('Error network/server creating order');
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
    const isWaiter = user.role === 'waiter';

    // Old useEffect for notification logic removed, moved to fetchOrders

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm('¿Estás seguro de que deseas CANCELAR esta orden? Esta acción no se puede deshacer.')) {
            return;
        }
        await handleStatusChange(orderId, ORDER_STATUS.CANCELLED);
    };

    const getColumns = () => {
        if (isCook) {
            // Cook views FIFO queue - only orders in "En Cocina" status, plus recently cancelled for visibility
            // We want to show "Cancelado" orders to the cook so they know to stop, but maybe they want to clear them?
            // For now, listing them is good.
            const cooking = orders.filter(o => o.status === ORDER_STATUS.COOKING);
            // Sort by updated_at (oldest first - FIFO)
            cooking.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));

            return {
                'Cola de Cocina': cooking
            };
        }

        // Waiter views everything grouped - all columns use FIFO
        const enCocina = orders.filter(o => o.status === ORDER_STATUS.COOKING);
        const listoParaServir = orders.filter(o => o.status === ORDER_STATUS.READY);
        const servido = orders.filter(o => o.status === ORDER_STATUS.SERVED || o.status === ORDER_STATUS.DELIVERING);
        const pagado = orders.filter(o => o.status === ORDER_STATUS.COMPLETED);

        // Sort all by updated_at (oldest first - FIFO)
        enCocina.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
        listoParaServir.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
        servido.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
        pagado.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));

        return {
            [ORDER_STATUS.COOKING]: enCocina,
            [ORDER_STATUS.READY]: listoParaServir,
            [ORDER_STATUS.SERVED]: servido,
            [ORDER_STATUS.COMPLETED]: pagado,
        };
    };

    const groupedOrders = getColumns();

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-content">
                    <div className="header-left">
                        <div className="header-logo-container">
                            {settings?.restaurant_logo && (settings.restaurant_logo.match(/^http/) || settings.restaurant_logo.match(/^\/uploads/)) ? (
                                <img
                                    src={settings.restaurant_logo.startsWith('/uploads')
                                        ? API_URL.replace('/api', '') + settings.restaurant_logo
                                        : settings.restaurant_logo.replace(/http:\/\/localhost:3001/g, API_URL.replace('/api', ''))}
                                    alt="Logo"
                                    className="header-logo-img"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                            ) : (
                                <span className="header-logo-emoji">{settings?.restaurant_logo || '🍔'}</span>
                            )}
                        </div>
                        <div className="header-info-container">
                            <div className="user-info-text">
                                <h1>{settings?.restaurant_name}</h1>
                                <p>Bienvenido, <strong>{user.username}</strong></p>
                            </div>
                            {isMobile && (
                                <button className="btn-logout-mobile" onClick={onLogout}>
                                    Salir
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="header-actions-row">
                        <NotificationCenter
                            notifications={notifications}
                            onDismiss={(id) => setNotifications(notifications.filter(n => n.id !== id))}
                            onDismissAll={() => setNotifications([])}
                        />
                        <div className="segmented-control">
                            <button
                                className={`segment-btn ${filter === 'active' ? 'active' : ''}`}
                                onClick={() => setFilter('active')}
                            >
                                {isMobile ? '⚡' : '⚡ Activas'}
                            </button>
                            <button
                                className={`segment-btn ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter('all')}
                            >
                                {isMobile ? '📋' : '📋 Todas'}
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
                    </div>
                    {!isMobile && (
                        <button className="btn btn-outline-danger" onClick={onLogout}>
                            Salir
                        </button>
                    )}
                </div>
            </header>

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
                                    ← Volver {statusLabels[selectedOrder.status] || selectedOrder.status}
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
                                    <h2>{statusIcons[expandedStatus]} {statusLabels[expandedStatus] || expandedStatus}</h2>
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
                                                    <span>{order.is_delivery ? `🚗 ${order.customer_name}` : `Mesa ${order.table_number}`}</span>
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
                                    const isPriority = status === ORDER_STATUS.COOKING || status === ORDER_STATUS.READY;
                                    const count = statusOrders.length;

                                    return (
                                        <div
                                            key={status}
                                            className={`mobile-status-card glass-card ${isPriority ? 'status-priority' : ''} status-col-${status.toLowerCase().replace(/[\s_]+/g, '-')}`}
                                            onClick={() => setExpandedStatus(status)}
                                        >
                                            <div className="status-name">
                                                {statusIcons[status]} {statusLabels[status] || status}
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
                            <div key={status} className={`status-column status-col-${status.toLowerCase().replace(/[\s_]+/g, '-')}`}>
                                <div className="column-header">
                                    <h2>{statusIcons[status]} {statusLabels[status] || status}</h2>
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



            {
                showNewOrder && (
                    <NewOrderModal
                        onClose={() => {
                            setShowNewOrder(false);
                            setEditOrder(null);
                        }}
                        onSubmit={editOrder ? handleUpdateOrder : handleNewOrder}
                        initialOrder={editOrder}
                        onCancel={handleCancelOrder}
                    />
                )
            }
        </div >
    );
}

export default Dashboard;
