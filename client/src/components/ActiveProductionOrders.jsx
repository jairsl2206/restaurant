import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import OrderCard from '../OrderCard';
import { ORDER_STATUS } from '../constants';
import './ActiveProductionOrders.css';

const API_URL = API_BASE_URL;

const statusIcons = {
    [ORDER_STATUS.COOKING]: '🍳',
    [ORDER_STATUS.READY]: '🥡',
    [ORDER_STATUS.SERVED]: '✅',
    [ORDER_STATUS.DELIVERING]: '🚗',
    [ORDER_STATUS.PICKUP_READY]: '🛍️',
    [ORDER_STATUS.PICKUP_COMPLETED]: '✅'
};

const statusLabels = {
    [ORDER_STATUS.COOKING]: 'En Cocina',
    [ORDER_STATUS.READY]: 'Listo para Servir',
    [ORDER_STATUS.SERVED]: 'Servido',
    [ORDER_STATUS.DELIVERING]: 'En Reparto',
    [ORDER_STATUS.PICKUP_READY]: 'Listo para Pickup',
    [ORDER_STATUS.PICKUP_COMPLETED]: 'Recogido'
};

function ActiveProductionOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActiveOrders();
        // Auto-refresh every 5 seconds
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
        const enCocina = orders.filter(o => o.status === ORDER_STATUS.COOKING);
        const listoParaServir = orders.filter(o => o.status === ORDER_STATUS.READY || o.status === ORDER_STATUS.PICKUP_READY);
        const servido = orders.filter(o => o.status === ORDER_STATUS.SERVED || o.status === ORDER_STATUS.DELIVERING || o.status === ORDER_STATUS.PICKUP_COMPLETED);

        // Sort all by updated_at (oldest first - FIFO)
        enCocina.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
        listoParaServir.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
        servido.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));

        return {
            [ORDER_STATUS.COOKING]: enCocina,
            [ORDER_STATUS.READY]: listoParaServir,
            [ORDER_STATUS.SERVED]: servido
        };
    };

    const groupedOrders = getGroupedOrders();

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
                        <div key={status} className={`production-column status-col-${status.toLowerCase().replace(/[\s_]+/g, '-')}`}>
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
                                                {order.is_delivery ? (
                                                    <span>🚗 {order.customer_name}</span>
                                                ) : order.is_pickup ? (
                                                    <span>🛍️ {order.customer_name}</span>
                                                ) : (
                                                    <span>Mesa {order.table_number}</span>
                                                )}
                                            </div>
                                            <div className="order-items-preview">
                                                {order.items ? order.items.substring(0, 60) + '...' : 'N/A'}
                                            </div>
                                            <div className="order-total">
                                                Total: <strong>${order.total.toFixed(2)}</strong>
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
