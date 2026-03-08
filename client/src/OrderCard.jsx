import './OrderCard.css';
import { ORDER_STATUS, ORDER_TYPE } from './constants';

// Single status flow: CREADA → PREPARANDO → LISTA → ENTREGADA
const STATUS_FLOW = {
    [ORDER_STATUS.CREADA]:     ORDER_STATUS.PREPARANDO,
    [ORDER_STATUS.PREPARANDO]: ORDER_STATUS.LISTA,
    [ORDER_STATUS.LISTA]:      ORDER_STATUS.ENTREGADA,
    [ORDER_STATUS.ENTREGADA]:  null,
    [ORDER_STATUS.CANCELADA]:  null
};

const STATUS_STEPS = [ORDER_STATUS.CREADA, ORDER_STATUS.PREPARANDO, ORDER_STATUS.LISTA, ORDER_STATUS.ENTREGADA];

const statusColors = {
    [ORDER_STATUS.CREADA]:     'status-creada',
    [ORDER_STATUS.PREPARANDO]: 'status-cocina',
    [ORDER_STATUS.LISTA]:      'status-listo',
    [ORDER_STATUS.ENTREGADA]:  'status-pagado',
    [ORDER_STATUS.CANCELADA]:  'status-cancelled'
};

const statusLabels = {
    [ORDER_STATUS.CREADA]:     'Creada',
    [ORDER_STATUS.PREPARANDO]: 'Preparando',
    [ORDER_STATUS.LISTA]:      'Lista',
    [ORDER_STATUS.ENTREGADA]:  'Entregada',
    [ORDER_STATUS.CANCELADA]:  'Cancelada'
};

import { useState, useEffect } from 'react';

// Helper to recursively clean a name from suffixes like " x2 [190.0]"
const cleanItemName = (str) => {
    let current = str.trim();
    let changed = true;
    while (changed) {
        changed = false;
        // Match " xQuantity [Price]" at the end
        const fullSuffixMatch = current.match(/(.+) x\d+(\.\d+)?( \[(\d+\.?\d*)\])?$/);
        if (fullSuffixMatch) {
            current = fullSuffixMatch[1].trim();
            changed = true;
            continue;
        }
        // Match just " [Price]" at the end
        const priceSuffixMatch = current.match(/(.+) \[(\d+\.?\d*)\]$/);
        if (priceSuffixMatch) {
            current = priceSuffixMatch[1].trim();
            changed = true;
            continue;
        }
        // Match just " xQuantity" at the end
        const qtySuffixMatch = current.match(/(.+) x\d+$/);
        if (qtySuffixMatch) {
            current = qtySuffixMatch[1].trim();
            changed = true;
        }
    }
    return current;
};

// Items parsing logic - INDIVIDUAL (not grouped)
const parseItemsIndividual = (itemsString) => {
    if (!itemsString) return [];
    const individualItems = [];
    const str = String(itemsString);
    const parts = str.split(/,\s*(?![^(]*\))/);
    let globalIndex = 0;

    parts.forEach(part => {
        let content = part.trim();
        let itemPrice = 0;

        // 1. Extract Price if exists
        const priceMatch = content.match(/(.+) \[(\d+\.?\d*)\]$/);
        if (priceMatch) {
            content = priceMatch[1].trim();
            itemPrice = parseFloat(priceMatch[2]);
        }

        // 2. Extract Quantity if exists
        const qtyMatch = content.match(/(.+) x(\d+)$/);
        let nameWithNote = content;
        let qty = 1;
        if (qtyMatch) {
            nameWithNote = qtyMatch[1].trim();
            qty = parseInt(qtyMatch[2], 10);
        }

        // 3. Extract Note if exists
        const noteMatch = nameWithNote.match(/(.+?)\s*?\((.+)\)$/);
        let name = nameWithNote;
        let note = '';
        if (noteMatch) {
            name = noteMatch[1].trim();
            note = noteMatch[2].trim();
        }

        // 4. Robust cleaning
        name = cleanItemName(name);

        // Create individual entries for each item
        for (let i = 0; i < qty; i++) {
            individualItems.push({
                id: `item_${globalIndex}`,
                text: name,
                note: note,
                quantity: 1, // Each item is quantity 1
                price: itemPrice,
                checked: false
            });
            globalIndex++;
        }
    });
    return individualItems;
};

// Items parsing logic - GROUPED (for informational views)
const parseItemsGrouped = (itemsString) => {
    if (!itemsString) return [];
    const str = String(itemsString);
    const parts = str.split(/,\s*(?![^(]*\))/);
    let itemMap = new Map();

    parts.forEach(part => {
        let content = part.trim();

        // 1. Extract Price
        const priceSuffixMatch = content.match(/(.+) \[(\d+\.?\d*)\]$/);
        if (priceSuffixMatch) {
            content = priceSuffixMatch[1].trim();
        }

        // 2. Extract Quantity
        const qtySuffixMatch = content.match(/(.+) x(\d+)$/);
        let nameWithNote = content;
        let qty = 1;

        if (qtySuffixMatch) {
            nameWithNote = qtySuffixMatch[1].trim();
            qty = parseInt(qtySuffixMatch[2], 10);
        }

        // Key for grouping remains nameWithNote for now to keep notes grouped together
        const key = nameWithNote.trim();

        // Group by full string (including note)
        if (itemMap.has(key)) {
            itemMap.set(key, itemMap.get(key) + qty);
        } else {
            itemMap.set(key, qty);
        }
    });

    // Convert to array
    return Array.from(itemMap.entries()).map(([nameWithNote, quantity], index) => {
        // Extract note and clean name for display
        const noteMatch = nameWithNote.match(/(.+?)\s*?\((.+)\)$/);
        let name = nameWithNote;
        let note = '';
        if (noteMatch) {
            name = noteMatch[1].trim();
            note = noteMatch[2].trim();
        }

        // Final robust cleaning
        name = cleanItemName(name);

        return {
            id: `grouped_${index}`,
            text: name,
            note: note,
            quantity: quantity
        };
    });
};

function OrderCard({ order, onStatusChange, user, onEdit, onCancel }) {
    const nextStatus = STATUS_FLOW[order.status] ?? null;
    const canAdvance = nextStatus !== null;
    const isCancelled = order.status === ORDER_STATUS.CANCELADA;
    const isEntregada = order.status === ORDER_STATUS.ENTREGADA;

    // Roles that can advance kitchen status (cook or admin)
    const isAllowedRole = user?.role === 'cook' || user?.role === 'admin' || user?.role === 'manager';
    // PREPARANDO stage (kitchen) is locked for waiters
    const isKitchenStage = order.status === ORDER_STATUS.PREPARANDO;
    const isLocked = (isKitchenStage && !isAllowedRole) || isCancelled;

    // Delivery / pickup detection — supports both new `type` and legacy `is_delivery`/`is_pickup`
    const isDelivery = order.type === ORDER_TYPE.DELIVERY || order.is_delivery == 1;
    const isPickup   = order.type === ORDER_TYPE.PICKUP   || order.is_pickup == 1;

    const [itemsList, setItemsList] = useState([]);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);

    useEffect(() => {
        setItemsList(parseItemsIndividual(order.items));
        setPaymentConfirmed(false);
    }, [order.items, order.status]);

    const handleCheck = (index) => {
        setItemsList(prev => {
            const newList = [...prev];
            newList[index] = { ...newList[index], checked: !newList[index].checked };
            return newList;
        });
    };

    const handleSelectAll = (checked) => {
        setItemsList(prev => prev.map(item => ({
            ...item,
            checked: checked
        })));
    };

    // Payment stage is LISTA (ready) → ENTREGADA
    const isPaymentStage = nextStatus === ORDER_STATUS.ENTREGADA;
    const showSimpleList = isEntregada || isCancelled;

    // No more diff view in the new schema (snapshots removed)
    const showDiff = false;
    let displayItems = itemsList.map(item => ({ ...item, status: 'kept' }));
    let addedItems = [];



    const allChecked = itemsList.length > 0 && itemsList.every(item => item.checked);
    const canSubmit = isPaymentStage ? paymentConfirmed : allChecked;
    const validationRequired = canAdvance && !isCancelled;

    const handleAdvance = () => {
        if (!canAdvance) return;
        if (isPaymentStage && !paymentConfirmed) {
            alert('Por favor confirma la entrega antes de avanzar.');
            return;
        } else if (!isPaymentStage && !allChecked) {
            alert('Por favor verifica todos los artículos antes de avanzar.');
            return;
        }
        onStatusChange(order.id, nextStatus);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('es-MX', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
        });
    };

    // Render helper for Individual Row
    const renderIndividualRow = (item, isDiff = false) => {
        const isRemoved = item.status === 'removed';

        // For diff view, we need to find the item by ID in itemsList
        // For normal view, the item IS from itemsList
        let realItem;
        let isChecked;

        if (isDiff) {
            // In diff view, find the corresponding item in itemsList by matching the ID
            // For original items that are kept, find by the original index
            // For added items, find by the added index
            if (item.status === 'kept' || item.status === 'removed') {
                // This is from the original order
                const originalIndex = parseInt(item.id.split('_')[1]);
                realItem = itemsList[originalIndex];
            } else if (item.status === 'added') {
                // This is a new item
                const addedIndex = parseInt(item.id.split('_')[1]);
                // Find in itemsList - added items come after the kept ones
                const keptCount = displayItems.filter(d => d.status === 'kept').length;
                realItem = itemsList[keptCount + addedIndex];
            }
            isChecked = realItem ? realItem.checked : false;
        } else {
            realItem = item;
            isChecked = item.checked;
        }

        const handleToggle = () => {
            if (isDiff && realItem) {
                // Find the index in itemsList
                const index = itemsList.findIndex(i => i.id === realItem.id);
                if (index !== -1) {
                    handleCheck(index);
                }
            } else {
                // Normal view - find by item.id
                const index = itemsList.findIndex(i => i.id === item.id);
                if (index !== -1) {
                    handleCheck(index);
                }
            }
        };

        return (
            <li key={item.id} className={`checklist-item ${isChecked ? 'checked' : ''} ${isRemoved ? 'item-removed' : ''}`}
                style={isRemoved ? { opacity: 0.6 } : {}}>
                <label style={{ cursor: isRemoved ? 'default' : (isLocked ? 'not-allowed' : 'pointer'), display: 'flex', alignItems: 'center', width: '100%' }}>
                    {!isRemoved && (
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={handleToggle}
                            disabled={!canAdvance || isLocked}
                            style={{ marginRight: '10px' }}
                        />
                    )}

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span className="item-text" style={isRemoved ? { textDecoration: 'line-through', color: '#e74c3c' } : {}}>
                                {item.text}
                            </span>
                            {isRemoved && <span style={{ marginLeft: 'auto', color: '#e74c3c', fontSize: '0.8rem' }}>(Eliminado)</span>}
                        </div>
                        {item.note && !isRemoved && (
                            <span className="item-note-badge" style={{
                                alignSelf: 'flex-start',
                                fontSize: '0.75rem',
                                background: 'rgba(231, 76, 60, 0.2)',
                                color: '#ff6b6b',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                marginTop: '2px',
                                fontWeight: 'bold',
                                border: '1px solid rgba(231, 76, 60, 0.3)'
                            }}>
                                <span style={{ marginRight: '4px', filter: 'none' }}>📋</span> {item.note}
                            </span>
                        )}
                    </div>
                </label>
            </li>
        );
    };

    return (
        <div className={`order-card glass-card slide-in ${isCancelled ? 'card-cancelled' : ''}`}>
            <div className="order-header">
                <div className="order-info">
                    <h3 className="order-number" style={isCancelled ? { textDecoration: 'line-through', opacity: 0.7 } : {}}>#{order.id}</h3>
                    {isDelivery || isPickup ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <p className="order-table" style={{ margin: 0 }}>
                                {isPickup ? '🛍️' : '🚗'} {order.customer_name}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                                📞 {order.customer_phone || 'S/N'}
                            </p>
                            {isDelivery && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    📍 {order.customer_address || 'S/N'}
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="order-table">Mesa {order.table_number}</p>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div className={`status-badge ${statusColors[order.status] || ''}`}>
                        {statusLabels[order.status] || order.status}
                    </div>
                </div>
            </div>

            <div className="status-progress">
                {isCancelled ? (
                    <div className="progress-step active" style={{ width: '100%' }}>
                        <div className="step-dot" style={{ background: '#e74c3c' }} title="Cancelada"></div>
                    </div>
                ) : (
                    (() => {
                        const currentStepIndex = STATUS_STEPS.indexOf(order.status);
                        return STATUS_STEPS.map((step, index) => {
                            const isActive = index <= currentStepIndex;
                            return (
                                <div key={step} className={`progress-step ${isActive ? 'active' : ''}`}>
                                    <div className="step-dot" title={statusLabels[step]}></div>
                                    {index < STATUS_STEPS.length - 1 && <div className="step-line"></div>}
                                </div>
                            );
                        });
                    })()
                )}
            </div>

            <div className="order-body" style={isCancelled ? { opacity: 0.6, pointerEvents: 'none' } : {}}>
                <div className="order-items">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4>{isPaymentStage ? 'Pago' : 'Artículos'}</h4>

                        {!isPaymentStage && validationRequired && !allChecked && !isLocked && (
                            <span style={{ fontSize: '0.8rem', color: '#ff6b6b' }}>
                                Faltan {itemsList.filter(i => !i.checked).length}
                            </span>
                        )}

                        {!isCancelled && (
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                                {/* Cancel button — only for CREADA status, only for waiters */}
                                {onCancel && order.status === ORDER_STATUS.CREADA && !isAllowedRole && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onCancel(order.id); }}
                                        style={{
                                            background: 'rgba(231, 76, 60, 0.15)', border: '1px solid #e74c3c',
                                            color: '#e74c3c', borderRadius: '4px',
                                            padding: '2px 8px', fontSize: '0.8rem', cursor: 'pointer'
                                        }}
                                        title="Cancelar Orden"
                                    >
                                        ✕ Cancelar
                                    </button>
                                )}

                                {/* Edit button — only for CREADA status, only for waiters */}
                                {onEdit && order.status === ORDER_STATUS.CREADA && !isAllowedRole && (
                                    <button
                                        onClick={() => onEdit(order)}
                                        style={{
                                            background: 'none', border: '1px solid var(--primary)',
                                            color: 'var(--primary)', borderRadius: '4px',
                                            padding: '2px 8px', fontSize: '0.8rem', cursor: 'pointer'
                                        }}
                                    >
                                        ✏️ Editar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {isPaymentStage ? (
                        <div className="payment-stage-container">
                            <ul className="items-list-simple" style={{ listStyle: 'none', padding: 0, marginBottom: '15px' }}>
                                {itemsList.map((item, i) => (
                                    <li key={i} className="simple-item" style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ marginRight: '8px', color: '#3498db' }}>•</span>
                                                <span className="item-text" style={{ color: '#ecf0f1' }}>{item.text}</span>
                                            </div>
                                            {item.note && (
                                                <span style={{ marginLeft: '15px', fontSize: '0.75rem', color: '#ff6b6b', fontWeight: 'bold' }}>
                                                    ↳ {item.note}
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 'bold' }}>${(item.price || 0).toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="payment-check-container" style={{ padding: '10px', background: 'rgba(46, 204, 113, 0.1)', borderRadius: '8px', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', width: '100%' }}>
                                    <input
                                        type="checkbox"
                                        checked={paymentConfirmed}
                                        onChange={(e) => setPaymentConfirmed(e.target.checked)}
                                        style={{ width: '20px', height: '20px', accentColor: '#2ecc71' }}
                                    />
                                    <span style={{ fontWeight: 'bold', color: '#e0e0e0' }}>✅ Confirmar Entrega al Cliente</span>
                                </label>
                            </div>
                        </div>
                    ) : showSimpleList ? (
                        <ul className="items-list-simple" style={{ listStyle: 'none', padding: 0 }}>
                            {parseItemsGrouped(order.items).map((item, i) => (
                                <li key={i} className="simple-item" style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{ marginRight: '8px', color: '#3498db' }}>•</span>
                                            <span className="item-text" style={{ color: '#ecf0f1' }}>{item.text}</span>
                                        </div>
                                        {item.note && (
                                            <span style={{
                                                marginLeft: '15px',
                                                fontSize: '0.75rem',
                                                color: '#ff6b6b',
                                                fontWeight: 'bold',
                                                fontStyle: 'italic'
                                            }}>
                                                ↳ {item.note}
                                            </span>
                                        )}
                                    </div>
                                    <span style={{ color: '#95a5a6', fontSize: '0.9rem', fontWeight: 'bold' }}>x{item.quantity}</span>
                                </li>
                            ))}
                        </ul>
                    ) : showDiff ? (
                        <div className="diff-view">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                {displayItems.length > 0 && <p style={{ fontSize: '0.8rem', color: '#aaa', margin: 0 }}>Orden Original:</p>}
                                {!isLocked && !isCancelled && !isPaymentStage && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={itemsList.length > 0 && itemsList.every(i => i.checked)}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                            style={{ width: '14px', height: '14px' }}
                                        />
                                        Marcar Todo
                                    </label>
                                )}
                            </div>
                            <ul className="items-list-checklist">
                                {displayItems.map((item) => renderIndividualRow(item, true))}
                            </ul>

                            {addedItems.length > 0 && (
                                <>
                                    <div style={{ borderTop: '1px solid #555', margin: '10px 0', position: 'relative' }}>
                                        <span style={{ position: 'absolute', top: '-10px', left: '0', background: '#333', paddingRight: '5px', fontSize: '0.8rem', color: '#2ecc71' }}>Nuevos / Agregados</span>
                                    </div>
                                    <ul className="items-list-checklist" style={{ marginTop: '15px' }}>
                                        {addedItems.map((item) => renderIndividualRow({ ...item, status: 'added' }, true))}
                                    </ul>
                                </>
                            )}
                        </div>
                    ) : (
                        <div>
                            {!isLocked && !isCancelled && !isPaymentStage && itemsList.length > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={itemsList.length > 0 && itemsList.every(i => i.checked)}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                            style={{ width: '14px', height: '14px' }}
                                        />
                                        Marcar Todo
                                    </label>
                                </div>
                            )}
                            <ul className="items-list-checklist">
                                {displayItems.map((item) => renderIndividualRow(item))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="order-meta">
                    <div className="meta-item"><span className="meta-label">Total</span><span className="meta-value">${order.total.toFixed(2)}</span></div>
                    <div className="meta-item"><span className="meta-label">Hora</span><span className="meta-value">{formatDate(order.created_at)}</span></div>
                </div>
            </div>

            {canAdvance && !isCancelled && (
                <div className="order-footer">
                    {isLocked ? (
                        null
                    ) : (
                        <button
                            className="btn btn-primary btn-block advance-btn"
                            onClick={handleAdvance}
                            disabled={!canSubmit}
                            style={{ opacity: (canSubmit) ? 1 : 0.6, cursor: (canSubmit) ? 'pointer' : 'not-allowed' }}
                        >
                <span>{isPaymentStage ? 'Confirmar Entrega' : `Avanzar a ${statusLabels[nextStatus] || nextStatus}`}</span>
                            <span className="arrow-icon">→</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default OrderCard;
