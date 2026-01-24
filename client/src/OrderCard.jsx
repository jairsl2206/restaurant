import './OrderCard.css';

const statusFlow = {
    'Creado': 'En Cocina',
    'En Cocina': 'Listo para Servir',
    'Listo para Servir': 'Servido',
    'Servido': 'Pagado',
    'Pagado': null
};

const statusColors = {
    'Creado': 'status-creado',
    'En Cocina': 'status-cocina',
    'Listo para Servir': 'status-listo',
    'Servido': 'status-servido',
    'Pagado': 'status-pagado'
};

import { useState, useEffect } from 'react';

// Items parsing logic - INDIVIDUAL (not grouped)
const parseItemsIndividual = (itemsString) => {
    if (!itemsString) return [];
    const individualItems = [];
    const str = String(itemsString);
    const parts = str.split(/,\s*/);
    let globalIndex = 0;

    parts.forEach(part => {
        const match = part.match(/(.+) x(\d+)$/);
        let name, qty;

        if (match) {
            name = match[1].trim();
            qty = parseInt(match[2], 10);
        } else {
            name = part.trim();
            qty = 1;
        }

        // Create individual entries for each item
        for (let i = 0; i < qty; i++) {
            individualItems.push({
                id: `item_${globalIndex}`,
                text: name,
                quantity: 1, // Each item is quantity 1
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
    const parts = str.split(/,\s*/);
    const itemMap = new Map();

    parts.forEach(part => {
        const match = part.match(/(.+) x(\d+)$/);
        let name, qty;

        if (match) {
            name = match[1].trim();
            qty = parseInt(match[2], 10);
        } else {
            name = part.trim();
            qty = 1;
        }

        // Group by name
        if (itemMap.has(name)) {
            itemMap.set(name, itemMap.get(name) + qty);
        } else {
            itemMap.set(name, qty);
        }
    });

    // Convert to array
    return Array.from(itemMap.entries()).map(([name, quantity], index) => ({
        id: `grouped_${index}`,
        text: name,
        quantity: quantity
    }));
};

function OrderCard({ order, onStatusChange, user, onEdit }) {
    const nextStatus = statusFlow[order.status];
    const canAdvance = nextStatus !== null;

    // Role-based restrictions
    const isEnCocina = order.status === 'En Cocina';
    const isAllowedRole = user?.role === 'cook' || user?.role === 'admin';
    const isLocked = isEnCocina && !isAllowedRole;

    const isUpdated = order.is_updated === 1;

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

    const isPaymentStage = nextStatus === 'Pagado';
    const isCreationStage = order.status === 'Creado';

    // Determine if we should show the simple list (no checkboxes)
    const showSimpleList = isCreationStage || order.status === 'Pagado' || (order.status === 'En Cocina' && !isAllowedRole);

    // DIFF LOGIC
    const showDiff = isUpdated && isAllowedRole && order.original_items_snapshot;

    let displayItems = []; // Kept + Removed (for display top section)
    let addedItems = [];

    if (showDiff) {
        const original = parseItemsIndividual(order.original_items_snapshot);
        const current = parseItemsIndividual(order.items);

        // Create a map to track which current items have been matched
        const currentItemsUsed = new Array(current.length).fill(false);

        // Process original items
        const processedOriginal = original.map((orgItem, orgIndex) => {
            // Try to find a matching item in current that hasn't been used
            const matchIndex = current.findIndex((currItem, currIndex) =>
                currItem.text === orgItem.text && !currentItemsUsed[currIndex]
            );

            if (matchIndex !== -1) {
                // Found a match - mark it as kept
                currentItemsUsed[matchIndex] = true;
                return {
                    ...orgItem,
                    id: `original_${orgIndex}`,
                    status: 'kept',
                    checked: current[matchIndex].checked
                };
            } else {
                // Not found - mark as removed
                return {
                    ...orgItem,
                    id: `original_${orgIndex}`,
                    status: 'removed'
                };
            }
        });

        // Any remaining unmatched items in current are additions
        addedItems = current
            .map((item, index) => ({ ...item, originalIndex: index }))
            .filter((item) => !currentItemsUsed[item.originalIndex])
            .map((item, addIndex) => ({
                ...item,
                id: `added_${addIndex}`,
                status: 'added'
            }));

        displayItems = processedOriginal;

    } else {
        // Normal View
        displayItems = itemsList.map(item => ({ ...item, status: 'kept' }));
    }

    const allChecked = itemsList.length > 0 && itemsList.every(item => item.checked);
    const canSubmit = isPaymentStage ? paymentConfirmed : (isCreationStage ? true : allChecked);
    const validationRequired = canAdvance;

    const handleAdvance = () => {
        if (!canAdvance) return;
        if (isPaymentStage && !paymentConfirmed) {
            alert("Por favor confirma el pago en efectivo.");
            return;
        } else if (!isPaymentStage && !isCreationStage && !allChecked) {
            alert("Por favor verifica todos los artículos antes de avanzar.");
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

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <span className="item-text" style={isRemoved ? { textDecoration: 'line-through', color: '#e74c3c' } : {}}>
                            {item.text}
                        </span>

                        {isRemoved && <span style={{ marginLeft: 'auto', color: '#e74c3c', fontSize: '0.8rem' }}>(Eliminado)</span>}
                    </div>
                </label>
            </li>
        );
    };

    return (
        <div className={`order-card glass-card slide-in ${isUpdated && isAllowedRole ? 'order-updated' : ''}`}>
            <div className="order-header">
                <div className="order-info">
                    <h3 className="order-number">#{order.id}</h3>
                    <p className="order-table">Mesa {order.table_number}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isUpdated && isAllowedRole && (
                        <div className="status-badge status-updated">
                            ACTUALIZADA
                        </div>
                    )}
                    <div className={`status-badge ${statusColors[order.status]}`}>
                        {order.status}
                    </div>
                </div>
            </div>

            <div className="status-progress">
                {['Creado', 'En Cocina', 'Listo para Servir', 'Servido', 'Pagado'].map((step, index) => {
                    const allSteps = ['Creado', 'En Cocina', 'Listo para Servir', 'Servido', 'Pagado'];
                    const currentStepIndex = allSteps.indexOf(order.status);
                    const stepIndex = allSteps.indexOf(step);
                    const isActive = stepIndex <= currentStepIndex;
                    return (
                        <div key={step} className={`progress-step ${isActive ? 'active' : ''}`}>
                            <div className="step-dot" title={step}></div>
                            {index < 4 && <div className="step-line"></div>}
                        </div>
                    );
                })}
            </div>

            <div className="order-body">
                <div className="order-items">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4>{isPaymentStage ? 'Pago' : 'Artículos'}</h4>

                        {!isPaymentStage && !isCreationStage && validationRequired && !allChecked && !isLocked && (
                            <span style={{ fontSize: '0.8rem', color: '#ff6b6b' }}>
                                Faltan {itemsList.filter(i => !i.checked).length}
                            </span>
                        )}

                        {onEdit && (order.status === 'En Cocina' || order.status === 'Creado') && !isAllowedRole && (
                            <button
                                onClick={() => onEdit(order)}
                                style={{
                                    background: 'none', border: '1px solid var(--primary)',
                                    color: 'var(--primary)', borderRadius: '4px',
                                    padding: '2px 8px', fontSize: '0.8rem', cursor: 'pointer',
                                    marginLeft: 'auto'
                                }}
                            >
                                ✏️ Editar
                            </button>
                        )}
                    </div>

                    {isPaymentStage ? (
                        <div className="payment-check-container" style={{ padding: '10px', background: 'rgba(46, 204, 113, 0.1)', borderRadius: '8px', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', width: '100%' }}>
                                <input
                                    type="checkbox"
                                    checked={paymentConfirmed}
                                    onChange={(e) => setPaymentConfirmed(e.target.checked)}
                                    style={{ width: '20px', height: '20px', accentColor: '#2ecc71' }}
                                />
                                <span style={{ fontWeight: 'bold', color: '#e0e0e0' }}>💵 Pago en Efectivo Recibido</span>
                            </label>
                        </div>
                    ) : showSimpleList ? (
                        <ul className="items-list-simple" style={{ listStyle: 'none', padding: 0 }}>
                            {parseItemsGrouped(order.items).map((item, i) => (
                                <li key={i} className="simple-item" style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ marginRight: '8px', color: '#3498db' }}>•</span>
                                        <span className="item-text" style={{ color: '#ecf0f1' }}>{item.text}</span>
                                    </div>
                                    <span style={{ color: '#95a5a6', fontSize: '0.9rem', fontWeight: 'bold' }}>x{item.quantity}</span>
                                </li>
                            ))}
                        </ul>
                    ) : showDiff ? (
                        <div className="diff-view">
                            {displayItems.length > 0 && <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>Orden Original:</p>}
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
                        <ul className="items-list-checklist">
                            {displayItems.map((item) => renderIndividualRow(item))}
                        </ul>
                    )}
                </div>

                <div className="order-meta">
                    <div className="meta-item"><span className="meta-label">Total</span><span className="meta-value">${order.total.toFixed(2)}</span></div>
                    <div className="meta-item"><span className="meta-label">Hora</span><span className="meta-value">{formatDate(order.created_at)}</span></div>
                </div>
            </div>

            {canAdvance && (
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
                            <span>{isPaymentStage ? 'Confirmar Pago y Cerrar' : `Avanzar a ${nextStatus}`}</span>
                            <span className="arrow-icon">→</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default OrderCard;
