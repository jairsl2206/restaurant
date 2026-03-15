import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import { authHeaders } from '../utils/api';
import NewOrderModal from '../NewOrderModal';
import { useToast } from './Toast';
import './PastOrders.css';

const API_URL = API_BASE_URL;

function PastOrders() {
    const showToast = useToast();
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editOrder, setEditOrder] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    function getTodayDate() {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    useEffect(() => {
        if (selectedDate) {
            fetchOrdersByDate(selectedDate);
        }
    }, [selectedDate]);

    const fetchOrdersByDate = async (date) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/orders/by-date?date=${date}`, { headers: authHeaders() });
            const data = await response.json();
            setOrders(data);
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (orderId) => {
        setConfirmDeleteId(null);
        try {
            const response = await fetch(`${API_URL}/orders/${orderId}`, {
                method: 'DELETE',
                headers: authHeaders()
            });

            if (response.ok) {
                showToast('Orden eliminada', 'success');
                fetchOrdersByDate(selectedDate);
            } else {
                showToast('Error al eliminar la orden', 'error');
            }
        } catch (err) {
            console.error('Error deleting order:', err);
            showToast('Error al eliminar la orden', 'error');
        }
    };

    const handleEdit = (order) => {
        setEditOrder(order);
        setShowEditModal(true);
    };

    const handleUpdateOrder = async (orderData) => {
        try {
            const response = await fetch(`${API_URL}/orders/${editOrder.id}`, {
                method: 'PUT',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ items: orderData.items }),
            });

            if (response.ok) {
                setShowEditModal(false);
                setEditOrder(null);
                fetchOrdersByDate(selectedDate);
            }
        } catch (err) {
            console.error('Error updating order:', err);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusColor = (status) => {
        const colors = {
            'PREPARANDO ORDEN': '#f39c12',
            'ORDEN LISTA': '#3498db',
            'ORDEN SERVIDA': '#9b59b6',
            'EN REPARTO': '#1abc9c',
            'FINALIZADA': '#27ae60',
            'CANCELADO': '#e74c3c'
        };
        return colors[status] || '#95a5a6';
    };

    return (
        <div className="past-orders-container">
            <div className="past-orders-header">
                <h2>📅 Órdenes Pasadas</h2>
                <div className="date-picker-container">
                    <label htmlFor="order-date">Seleccionar Fecha:</label>
                    <input
                        id="order-date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        max={getTodayDate()}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Cargando órdenes...</p>
                </div>
            ) : orders.length === 0 ? (
                <div className="empty-state">
                    <p>📭 No hay órdenes para esta fecha</p>
                </div>
            ) : (
                <div className="orders-table-container">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Hora</th>
                                <th>Mesa/Cliente</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(order => (
                                <tr key={order.id}>
                                    <td>#{order.id}</td>
                                    <td>{formatTime(order.created_at)}</td>
                                    <td>
                                        {order.is_delivery ? (
                                            <span>🚗 {order.customer_name}</span>
                                        ) : order.is_pickup ? (
                                            <span>🛍️ {order.customer_name}</span>
                                        ) : (
                                            <span>Mesa {order.table_number}</span>
                                        )}
                                    </td>
                                    <td className="items-cell">
                                        {order.items ? order.items.substring(0, 50) + '...' : 'N/A'}
                                    </td>
                                    <td className="total-cell">${order.total.toFixed(2)}</td>
                                    <td>
                                        <span
                                            className="status-badge"
                                            style={{ backgroundColor: getStatusColor(order.status) }}
                                        >
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        <button
                                            className="btn-edit"
                                            onClick={() => handleEdit(order)}
                                            title="Editar orden"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => setConfirmDeleteId(order.id)}
                                            aria-label={`Eliminar orden #${order.id}`}
                                            title="Eliminar orden"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showEditModal && (
                <NewOrderModal
                    onClose={() => {
                        setShowEditModal(false);
                        setEditOrder(null);
                    }}
                    onSubmit={handleUpdateOrder}
                    initialOrder={editOrder}
                />
            )}

            {confirmDeleteId && (
                <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
                    <div className="modal-content glass-card slide-in" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ fontSize: '1.1rem' }}>⚠️ Eliminar orden</h3>
                            <button type="button" className="close-btn" onClick={() => setConfirmDeleteId(null)} aria-label="Cancelar">×</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>¿Estás seguro de que deseas eliminar esta orden?</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Esta acción no se puede deshacer.</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
                            <button type="button" className="btn btn-danger"
                                style={{ background: 'rgba(239,68,68,0.2)', borderColor: '#ef4444', color: '#ef4444' }}
                                onClick={() => handleDelete(confirmDeleteId)}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PastOrders;
