import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import { authHeaders } from '../utils/api';
import NewOrderModal from '../NewOrderModal';
import { useToast } from './Toast';
import './PastOrders.css';

const API_URL = API_BASE_URL;

function parseItemsString(str) {
    if (!str) return [];
    return str.split(',').map(part => {
        part = part.trim();
        const match = part.match(/^(.+?)\s+x(\d+)\s+\[([^\]]+)\]$/);
        if (match) return { name: match[1].trim(), qty: parseInt(match[2]), price: parseFloat(match[3]) };
        return { name: part, qty: 1, price: 0 };
    }).filter(i => i.name);
}

function PastOrders() {
    const showToast = useToast();
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [selectedDate, setSelectedDate] = useState(getTodayDate());
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editOrder, setEditOrder] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [detailOrder, setDetailOrder] = useState(null);

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
                <div className="data-table-wrapper">
                    <table className="data-table orders-table">
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
                                <tr key={order.id} onClick={() => setDetailOrder(order)} style={{ cursor: 'pointer' }}>
                                    <td className="td-id" data-label="ID">#{order.id}</td>
                                    <td data-label="Hora">{formatTime(order.created_at)}</td>
                                    <td className="td-primary" data-label="Mesa">
                                        {order.is_delivery ? (
                                            <span>🚗 {order.customer_name}</span>
                                        ) : order.is_pickup ? (
                                            <span>🛍️ {order.customer_name}</span>
                                        ) : (
                                            <span>Mesa {order.table_number}</span>
                                        )}
                                    </td>
                                    <td className="items-cell" data-label="Ítems">
                                        {order.items ? order.items.substring(0, 50) + '...' : 'N/A'}
                                    </td>
                                    <td className="total-cell" data-label="Total">${order.total.toFixed(2)}</td>
                                    <td data-label="Estado">
                                        <span
                                            className="status-badge"
                                            style={{ backgroundColor: getStatusColor(order.status) }}
                                        >
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="td-actions actions-cell" onClick={e => e.stopPropagation()}>
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

            {detailOrder && (() => {
                const mainItems = parseItemsString(detailOrder.items);
                const addItems = parseItemsString(detailOrder.additions_items);
                const hasAdditions = detailOrder.additions_total > 0;
                const baseTotal = detailOrder.total - (detailOrder.additions_total || 0);
                const orderType = detailOrder.is_delivery ? 'Domicilio' : detailOrder.is_pickup ? 'Para llevar' : 'Mesa';
                const orderIcon = detailOrder.is_delivery ? '🚗' : detailOrder.is_pickup ? '🛍️' : '🍽️';
                return (
                    <div className="modal-overlay" onClick={() => setDetailOrder(null)}>
                        <div className="modal-content glass-card slide-in" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 style={{ fontSize: '1.1rem' }}>
                                    {orderIcon} Orden #{detailOrder.id}
                                </h3>
                                <button type="button" className="close-btn" onClick={() => setDetailOrder(null)} aria-label="Cerrar">×</button>
                            </div>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                {/* Meta */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                                    <span className="status-badge" style={{ backgroundColor: getStatusColor(detailOrder.status) }}>
                                        {detailOrder.status}
                                    </span>
                                    <span style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        {orderIcon} {orderType}
                                    </span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: 'auto' }}>
                                        {new Date(detailOrder.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                </div>

                                {/* Customer / Table */}
                                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                                    {detailOrder.is_delivery || detailOrder.is_pickup ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <span style={{ fontWeight: 600 }}>{detailOrder.customer_name || '—'}</span>
                                            {detailOrder.customer_phone && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📞 {detailOrder.customer_phone}</span>}
                                            {detailOrder.customer_address && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📍 {detailOrder.customer_address}</span>}
                                        </div>
                                    ) : (
                                        <span style={{ fontWeight: 600 }}>Mesa {detailOrder.table_number}</span>
                                    )}
                                </div>

                                {/* Items */}
                                <div>
                                    <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        Ítems de la orden
                                    </p>
                                    {mainItems.length > 0 ? (
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            {mainItems.map((item, i) => (
                                                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                    <span>{item.qty}× {item.name}</span>
                                                    <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>${(item.qty * item.price).toFixed(2)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{detailOrder.items || '—'}</p>
                                    )}
                                </div>

                                {/* Additions */}
                                {hasAdditions && (
                                    <div>
                                        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                            Adiciones
                                        </p>
                                        {addItems.length > 0 ? (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                {addItems.map((item, i) => (
                                                    <li key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                        <span>+{item.qty}× {item.name}</span>
                                                        <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>${(item.qty * item.price).toFixed(2)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>${(detailOrder.additions_total || 0).toFixed(2)}</p>
                                        )}
                                    </div>
                                )}

                                {/* Totals */}
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    {hasAdditions && (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                <span>Orden base</span>
                                                <span>${baseTotal.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                <span>Adiciones</span>
                                                <span>+${(detailOrder.additions_total || 0).toFixed(2)}</span>
                                            </div>
                                        </>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.15rem', color: '#2ecc71', marginTop: '0.25rem' }}>
                                        <span>TOTAL</span>
                                        <span>${detailOrder.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setDetailOrder(null)}>Cerrar</button>
                                <button type="button" className="btn btn-primary" onClick={() => { setDetailOrder(null); handleEdit(detailOrder); }}>✏️ Editar</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

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
