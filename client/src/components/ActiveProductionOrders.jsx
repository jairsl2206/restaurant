import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import { authHeaders } from '../utils/api';
import { ORDER_STATUS, ORDER_TYPE } from '../constants';
import './ActiveProductionOrders.css';

const API_URL = API_BASE_URL;

const statusIcons = {
    [ORDER_STATUS.EN_COCINA]:          '🍳',
    [ORDER_STATUS.LISTO_PARA_SERVIR]:  '🥡',
    [ORDER_STATUS.SERVIDO]:            '🍽️',
    [ORDER_STATUS.EN_REPARTO]:         '🚗',
    [ORDER_STATUS.LISTO_PARA_RECOGER]: '📦',
    [ORDER_STATUS.FINALIZADO]:         '✅'
};

const statusLabels = {
    [ORDER_STATUS.EN_COCINA]:          'En cocina',
    [ORDER_STATUS.LISTO_PARA_SERVIR]:  'Listo para servir',
    [ORDER_STATUS.SERVIDO]:            'Servido (En mesa)',
    [ORDER_STATUS.EN_REPARTO]:         'En reparto',
    [ORDER_STATUS.LISTO_PARA_RECOGER]: 'Listo para recoger',
    [ORDER_STATUS.FINALIZADO]:         'Finalizado'
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
            const response = await fetch(`${API_URL}/orders`, { headers: authHeaders() });
            const data = await response.json();
            setOrders(data);
        } catch (err) {
            console.error('Error fetching active orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const getGroupedOrders = () => {
        const sortByUpdated = (arr) => [...arr].sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
        const activeStatuses = [
            ORDER_STATUS.EN_COCINA,
            ORDER_STATUS.LISTO_PARA_SERVIR,
            ORDER_STATUS.SERVIDO,
            ORDER_STATUS.EN_REPARTO,
            ORDER_STATUS.LISTO_PARA_RECOGER
        ];
        const columns = {};
        activeStatuses.forEach(status => {
            columns[status] = sortByUpdated(orders.filter(o => o.status === status));
        });
        return columns;
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
