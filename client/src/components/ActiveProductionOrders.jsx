import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import { ORDER_STATUS, ORDER_TYPE } from '../constants';
import './ActiveProductionOrders.css';

const API_URL = API_BASE_URL;

const statusIcons = {
    [ORDER_STATUS.CREADA]:     '📋',
    [ORDER_STATUS.PREPARANDO]: '🍳',
    [ORDER_STATUS.LISTA]:      '🥡',
    [ORDER_STATUS.ENTREGADA]:  '✅',
    [ORDER_STATUS.CANCELADA]:  '❌'
};

const statusLabels = {
    [ORDER_STATUS.CREADA]:     'Creada',
    [ORDER_STATUS.PREPARANDO]: 'En Cocina',
    [ORDER_STATUS.LISTA]:      'Lista',
    [ORDER_STATUS.ENTREGADA]:  'Entregada',
    [ORDER_STATUS.CANCELADA]:  'Cancelada'
};

function ActiveProductionOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActiveOrders();
        const interval = setInterval(fetchActiveOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchActiveOrders = async () => {
        try {
            const response = await fetch(`${API_URL}/orders`);
            const data = await response.json();
            setOrders(data);
        } catch (err) {
            console.error('Error fetching active orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const getGroupedOrders = () => {
        // Show 3 columns for the kitchen board: CREADA, PREPARANDO, LISTA
        const creadas    = orders.filter(o => o.status === ORDER_STATUS.CREADA);
        const preparando = orders.filter(o => o.status === ORDER_STATUS.PREPARANDO);
        const listas     = orders.filter(o => o.status === ORDER_STATUS.LISTA);

        creadas.sort((a, b)    => new Date(a.updated_at) - new Date(b.updated_at));
        preparando.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
        listas.sort((a, b)     => new Date(a.updated_at) - new Date(b.updated_at));

        return {
            [ORDER_STATUS.CREADA]:     creadas,
            [ORDER_STATUS.PREPARANDO]: preparando,
            [ORDER_STATUS.LISTA]:      listas
        };
    };

    const groupedOrders = getGroupedOrders();

    const getOrderTypeLabel = (order) => {
        if (order.type === ORDER_TYPE.DELIVERY || order.is_delivery) return `🚗 ${order.customer_name}`;
        if (order.type === ORDER_TYPE.PICKUP   || order.is_pickup)   return `🛍️ ${order.customer_name}`;
        return `Mesa ${order.table_number}`;
    };

    return (
        <div className="active-production-container">
            <div className="production-header">
                <h2>🔥 Órdenes en Producción</h2>
                <div className="auto-refresh-indicator">
                    <span className="pulse-dot"></span>
                    <span>Actualización automática</span>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Cargando órdenes...</p>
                </div>
            ) : (
                <div className="production-board">
                    {Object.entries(groupedOrders).map(([status, statusOrders]) => (
                        <div key={status} className={`production-column status-col-${status.toLowerCase()}`}>
                            <div className="column-header">
                                <h3>{statusIcons[status]} {statusLabels[status] || status}</h3>
                                <span className="count-badge">{statusOrders.length}</span>
                            </div>
                            <div className="column-content">
                                {statusOrders.length === 0 ? (
                                    <div className="empty-state">
                                        <p>No hay órdenes en este estado</p>
                                    </div>
                                ) : (
                                    statusOrders.map(order => (
                                        <div key={order.id} className="production-order-card">
                                            <div className="order-mini-header">
                                                <strong>Orden #{order.id}</strong>
                                                <span className="order-time">
                                                    {new Date(order.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="order-location">
                                                <span>{getOrderTypeLabel(order)}</span>
                                            </div>
                                            <div className="order-items-preview">
                                                {order.items ? order.items.substring(0, 60) + '...' : 'N/A'}
                                            </div>
                                            <div className="order-total">
                                                Total: <strong>${(order.total || 0).toFixed(2)}</strong>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default ActiveProductionOrders;
