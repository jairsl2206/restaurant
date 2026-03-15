import { useState, useEffect, useRef } from 'react';
import OrderCard from './OrderCard';
import { ORDER_STATUS, ORDER_TYPE, STATUS_ICONS, ORDER_STATUS_LABELS, POLL_INTERVAL_MS } from './constants';
import NewOrderModal from './NewOrderModal';
import NotificationCenter from './components/NotificationCenter';
import { playNotificationSound } from './utils/sound';
import { useToast } from './components/Toast';
import './Dashboard.css';
import API_BASE_URL from './config';
import { apiGet, apiPost, apiPut } from './utils/api';

function Dashboard({ user, onLogout, settings }) {
    const showToast = useToast();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewOrder, setShowNewOrder] = useState(false);
    const [editOrder, setEditOrder] = useState(null); // Order being edited
    const [filter, setFilter] = useState('active'); // 'active' or 'all'
    const [notifications, setNotifications] = useState([]);
    const [activePeriod, setActivePeriod] = useState(undefined); // undefined = loading, null = no period

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

    const fetchActivePeriod = async () => {
        try {
            const data = await apiGet(`${API_BASE_URL}/sale-periods/active`);
            setActivePeriod(data && data.id ? data : null);
        } catch {
            setActivePeriod(null);
        }
    };

    useEffect(() => {
        fetchOrders();
        fetchActivePeriod();
        // Poll for updates every 5 seconds
        const interval = setInterval(() => { fetchOrders(); fetchActivePeriod(); }, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [filter]);

    const fetchOrders = async () => {
        try {
            const endpoint = filter === 'all' ? '/orders/all' : '/orders';
            const data = await apiGet(`${API_BASE_URL}${endpoint}`);

            // Waiter: notify when orders are ready to serve/pickup
            if (user.role === 'waiter' && prevOrdersRef.current.length > 0) {
                const readyStatuses = [ORDER_STATUS.LISTO_PARA_SERVIR, ORDER_STATUS.LISTO_PARA_RECOGER];
                const justReady = data.filter(newOrder => {
                    if (!readyStatuses.includes(newOrder.status)) return false;
                    const old = prevOrdersRef.current.find(o => o.id === newOrder.id);
                    return !old || !readyStatuses.includes(old.status);
                });

                justReady.forEach(order => {
                    const isPickup = order.type === ORDER_TYPE.PICKUP || order.is_pickup;
                    const loc      = isPickup ? `Pickup - ${order.customer_name}` : `Mesa ${order.table_number}`;
                    const action   = isPickup ? 'recoger' : 'servir';
                    addNotification(`¡Orden #${order.id} (${loc}) lista para ${action}!`, 'success', order.id);
                });
            }

            // Cook: notify on new orders arriving in kitchen
            if (user.role === 'cook' && prevOrdersRef.current.length > 0) {
                const justArrived = data.find(newOrder => {
                    if (newOrder.status !== ORDER_STATUS.EN_COCINA) return false;
                    return !prevOrdersRef.current.find(o => o.id === newOrder.id);
                });

                if (justArrived) {
                    const isDelivery = justArrived.type === ORDER_TYPE.DELIVERY || justArrived.is_delivery;
                    const loc = isDelivery ? `Delivery - ${justArrived.customer_name}` : `Mesa ${justArrived.table_number}`;
                    addNotification(`🔔 ¡Nueva Orden en Cocina #${justArrived.id}! (${loc})`, 'info', justArrived.id);
                }
            }

            setNotifications(prev => prev.filter(n => {
                if (!n.orderId) return true;
                const currentOrder = data.find(o => o.id === n.orderId);
                if (!currentOrder) return true;

                if (user.role === 'cook' && n.type === 'info') {
                    return currentOrder.status === ORDER_STATUS.EN_COCINA;
                }
                if (user.role === 'waiter' && n.type === 'success') {
                    return [ORDER_STATUS.LISTO_PARA_SERVIR, ORDER_STATUS.LISTO_PARA_RECOGER].includes(currentOrder.status);
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
            const response = await apiPut(`${API_BASE_URL}/orders/${orderId}/status`, { status: newStatus }, { json: false });
            if (response.ok) fetchOrders();
        } catch (err) {
            console.error('Error updating order:', err);
        }
    };

    const handleNewOrder = async (orderData) => {
        try {
            const response = await apiPost(`${API_BASE_URL}/orders`, orderData, { json: false });
            if (response.ok) {
                setShowNewOrder(false);
                fetchOrders();
            } else {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    showToast(`Error: ${data.error || 'No se pudo crear la orden'}`, 'error');
                } catch {
                    showToast(`Error al crear orden: ${text}`, 'error');
                }
            }
        } catch (err) {
            console.error('Error creating order:', err);
            showToast('Error de conexión al crear la orden', 'error');
        }
    };

    const handleEditOrder = (order) => {
        setEditOrder(order);
        setShowNewOrder(true);
    };

    const handleAddToOrder = async (parentOrder, orderData) => {
        try {
            const response = await apiPost(`${API_BASE_URL}/orders/${parentOrder.id}/additions`, { items: orderData.items }, { json: false });
            if (response.ok) {
                setShowNewOrder(false);
                setEditOrder(null);
                fetchOrders();
            } else {
                const data = await response.json().catch(() => ({}));
                showToast(`Error: ${data.error || 'No se pudieron agregar artículos'}`, 'error');
            }
        } catch (err) {
            console.error('Error adding to order:', err);
            showToast('Error de conexión', 'error');
        }
    };

    const handleUpdateOrder = async (orderData) => {
        try {
            const response = await apiPut(`${API_BASE_URL}/orders/${editOrder.id}`, { items: orderData.items }, { json: false });
            if (response.ok) {
                const result = await response.json();
                const updatedOrder = result.order;
                // Optimistically update state with diff so OrderCard activates diff view immediately
                setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
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

    // The 3 "ready to deliver" statuses live in a single combined column
    const READY_STATUSES = [
        ORDER_STATUS.LISTO_PARA_SERVIR,
        ORDER_STATUS.EN_REPARTO,
        ORDER_STATUS.LISTO_PARA_RECOGER,
    ];

    const sortByUpdated = (arr) => [...arr].sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));

    // Sub-groups for the combined column, each sorted FIFO by updated_at.
    // The sub-group whose oldest order has been waiting longest floats to the top.
    const readyGroups = isCook ? [] : READY_STATUSES
        .map(status => ({
            status,
            orders: sortByUpdated(orders.filter(o => o.status === status))
        }))
        .filter(g => g.orders.length > 0)
        .sort((a, b) => new Date(a.orders[0].updated_at) - new Date(b.orders[0].updated_at));

    const readyCount = readyGroups.reduce((sum, g) => sum + g.orders.length, 0);

    const getColumns = () => {
        if (isCook) {
            return {
                [ORDER_STATUS.EN_COCINA]: sortByUpdated(orders.filter(o => o.status === ORDER_STATUS.EN_COCINA))
            };
        }
        const columns = {
            [ORDER_STATUS.EN_COCINA]: sortByUpdated(orders.filter(o => o.status === ORDER_STATUS.EN_COCINA)),
            [ORDER_STATUS.SERVIDO]:   sortByUpdated(orders.filter(o => o.status === ORDER_STATUS.SERVIDO)),
        };
        if (filter === 'all') {
            columns[ORDER_STATUS.FINALIZADO] = sortByUpdated(orders.filter(o => o.status === ORDER_STATUS.FINALIZADO));
        }
        return columns;
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
                                        ? API_BASE_URL.replace('/api', '') + settings.restaurant_logo
                                        : settings.restaurant_logo.replace(/http:\/\/localhost:3001/g, API_BASE_URL.replace('/api', ''))}
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
                                onClick={() => {
                                    if (!activePeriod) {
                                        showToast('No hay una jornada abierta. Pide a un administrador que abra la jornada del día.', 'warning');
                                        return;
                                    }
                                    setShowNewOrder(true);
                                }}
                                disabled={activePeriod === undefined}
                                style={!activePeriod && activePeriod !== undefined ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                                title={!activePeriod && activePeriod !== undefined ? 'Sin jornada activa' : ''}
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

            {activePeriod === null && (
                <div className="no-period-banner">
                    🔒 No hay jornada abierta — no se pueden crear órdenes.
                    {(user.role === 'admin' || user.role === 'manager') && (
                        <span> Abre la jornada desde el panel de administración.</span>
                    )}
                </div>
            )}

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
                                    ← Volver {ORDER_STATUS_LABELS[selectedOrder.status] || selectedOrder.status}
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
                                {expandedStatus === 'PARA_ENTREGAR' ? (
                                    <>
                                        <div className="column-header">
                                            <h2>🚀 Para Entregar</h2>
                                            <span className="count-badge">{readyCount}</span>
                                        </div>
                                        <div className="mobile-orders-list">
                                            {readyCount === 0 ? (
                                                <div className="empty-state"><p>No hay órdenes listas</p></div>
                                            ) : readyGroups.map(({ status, orders: grpOrders }) => (
                                                <div key={status}>
                                                    <div className="ready-subgroup-header">
                                                        <span>{STATUS_ICONS[status]} {ORDER_STATUS_LABELS[status]}</span>
                                                        <span className="count-badge-sm">{grpOrders.length}</span>
                                                    </div>
                                                    {grpOrders.map(order => (
                                                        <div key={order.id} className="mobile-order-brief glass-card" onClick={() => setSelectedOrder(order)}>
                                                            <div className="mobile-order-brief-header">
                                                                <strong>Orden #{order.id}</strong>
                                                                <span>{(order.type === ORDER_TYPE.DELIVERY || order.is_delivery) ? `🚗 ${order.customer_name}` : `Mesa ${order.table_number}`}</span>
                                                            </div>
                                                            <div className="mobile-order-brief-items">{order.items?.substring(0, 30)}...</div>
                                                            <div className="mobile-order-brief-cta">Ver Detalle →</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="column-header">
                                            <h2>{STATUS_ICONS[expandedStatus]} {ORDER_STATUS_LABELS[expandedStatus] || expandedStatus}</h2>
                                            <span className="count-badge">{groupedOrders[expandedStatus]?.length || 0}</span>
                                        </div>
                                        <div className="mobile-orders-list">
                                            {(groupedOrders[expandedStatus]?.length || 0) === 0 ? (
                                                <div className="empty-state"><p>No hay órdenes</p></div>
                                            ) : groupedOrders[expandedStatus].map(order => (
                                                <div key={order.id} className="mobile-order-brief glass-card" onClick={() => setSelectedOrder(order)}>
                                                    <div className="mobile-order-brief-header">
                                                        <strong>Orden #{order.id}</strong>
                                                        <span>{(order.type === ORDER_TYPE.DELIVERY || order.is_delivery) ? `🚗 ${order.customer_name}` : `Mesa ${order.table_number}`}</span>
                                                    </div>
                                                    <div className="mobile-order-brief-items">{order.items?.substring(0, 30)}...</div>
                                                    <div className="mobile-order-brief-cta">Ver Detalle →</div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            // Level 1: Status List
                            <div className="mobile-view-level-1">
                                {/* EN_COCINA */}
                                {Object.entries(groupedOrders).filter(([s]) => s === ORDER_STATUS.EN_COCINA).map(([status, statusOrders]) => (
                                    <div key={status}
                                        className={`mobile-status-card glass-card status-priority status-col-en-cocina`}
                                        onClick={() => setExpandedStatus(status)}
                                    >
                                        <div className="status-name">
                                            {STATUS_ICONS[status]} {ORDER_STATUS_LABELS[status]}
                                            {statusOrders.length > 0 && <span className="priority-dot">●</span>}
                                        </div>
                                        <div className="status-count">{statusOrders.length} {statusOrders.length === 1 ? 'Orden' : 'Ordenes'} →</div>
                                    </div>
                                ))}

                                {/* Para Entregar — combined */}
                                <div
                                    className={`mobile-status-card glass-card ${readyCount > 0 ? 'status-priority' : ''} status-col-para-entregar`}
                                    onClick={() => setExpandedStatus('PARA_ENTREGAR')}
                                >
                                    <div className="status-name">
                                        🚀 Para Entregar
                                        {readyCount > 0 && <span className="priority-dot">●</span>}
                                    </div>
                                    <div className="status-count">{readyCount} {readyCount === 1 ? 'Orden' : 'Ordenes'} →</div>
                                </div>

                                {/* SERVIDO / FINALIZADO */}
                                {Object.entries(groupedOrders).filter(([s]) => s !== ORDER_STATUS.EN_COCINA).map(([status, statusOrders]) => (
                                    <div key={status}
                                        className={`mobile-status-card glass-card status-col-${status.toLowerCase().replace(/[\s_]+/g, '-')}`}
                                        onClick={() => setExpandedStatus(status)}
                                    >
                                        <div className="status-name">{STATUS_ICONS[status]} {ORDER_STATUS_LABELS[status] || status}</div>
                                        <div className="status-count">{statusOrders.length} {statusOrders.length === 1 ? 'Orden' : 'Ordenes'} →</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    // Desktop Kanban View
                    <div className="orders-board">
                        {/* EN_COCINA column */}
                        <div className="status-column status-col-en-cocina">
                            <div className="column-header">
                                <h2>{STATUS_ICONS[ORDER_STATUS.EN_COCINA]} {ORDER_STATUS_LABELS[ORDER_STATUS.EN_COCINA]}</h2>
                                <span className="count-badge">{groupedOrders[ORDER_STATUS.EN_COCINA].length}</span>
                            </div>
                            <div className="column-content">
                                {groupedOrders[ORDER_STATUS.EN_COCINA].length === 0 ? (
                                    <div className="empty-state">
                                        <span className="empty-icon">🍳</span>
                                        <p>Sin órdenes en cocina</p>
                                        <p className="empty-hint">Las nuevas órdenes aparecerán aquí automáticamente</p>
                                    </div>
                                ) : groupedOrders[ORDER_STATUS.EN_COCINA].map(order => (
                                    <OrderCard key={order.id} order={order} user={user} onStatusChange={handleStatusChange} onEdit={handleEditOrder} />
                                ))}
                            </div>
                        </div>

                        {/* Para Entregar — combined column (LISTO_PARA_SERVIR + EN_REPARTO + LISTO_PARA_RECOGER) */}
                        {!isCook && (
                            <div className="status-column status-col-para-entregar">
                                <div className="column-header">
                                    <h2>🚀 Para Entregar</h2>
                                    <span className="count-badge">{readyCount}</span>
                                </div>
                                <div className="column-content">
                                    {readyCount === 0 ? (
                                        <div className="empty-state">
                                            <span className="empty-icon">🚀</span>
                                            <p>Sin órdenes listas</p>
                                            <p className="empty-hint">Aparecerán cuando cocina las marque como listas</p>
                                        </div>
                                    ) : readyGroups.map(({ status, orders: grpOrders }) => (
                                        <div key={status} className="ready-subgroup">
                                            <div className="ready-subgroup-header">
                                                <span>{STATUS_ICONS[status]} {ORDER_STATUS_LABELS[status]}</span>
                                                <span className="count-badge-sm">{grpOrders.length}</span>
                                            </div>
                                            {grpOrders.map(order => (
                                                <OrderCard key={order.id} order={order} user={user} onStatusChange={handleStatusChange} onEdit={handleEditOrder} />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* SERVIDO and FINALIZADO columns */}
                        {Object.entries(groupedOrders)
                            .filter(([status]) => status !== ORDER_STATUS.EN_COCINA)
                            .map(([status, statusOrders]) => (
                                <div key={status} className={`status-column status-col-${status.toLowerCase().replace(/[\s_]+/g, '-')}`}>
                                    <div className="column-header">
                                        <h2>{STATUS_ICONS[status]} {ORDER_STATUS_LABELS[status] || status}</h2>
                                        <span className="count-badge">{statusOrders.length}</span>
                                    </div>
                                    <div className="column-content">
                                        {statusOrders.length === 0 ? (
                                            <div className="empty-state">
                                                <span className="empty-icon">{STATUS_ICONS[status] || '📋'}</span>
                                                <p>Sin órdenes aquí</p>
                                            </div>
                                        ) : statusOrders.map(order => (
                                            <OrderCard key={order.id} order={order} user={user} onStatusChange={handleStatusChange} onEdit={handleEditOrder} />
                                        ))}
                                    </div>
                                </div>
                            ))
                        }
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
                        onSubmit={
                            !editOrder
                                ? handleNewOrder
                                : editOrder.status === 'EN_COCINA'
                                    ? handleUpdateOrder
                                    : (orderData) => handleAddToOrder(editOrder, orderData)
                        }
                        initialOrder={editOrder}
                        isAdditionMode={!!(editOrder && editOrder.status !== 'EN_COCINA')}
                    />
                )
            }
        </div >
    );
}

import PropTypes from 'prop-types';

Dashboard.propTypes = {
    user: PropTypes.shape({
        username: PropTypes.string,
        role:     PropTypes.string.isRequired
    }).isRequired,
    onLogout: PropTypes.func.isRequired,
    settings: PropTypes.object
};

export default Dashboard;
