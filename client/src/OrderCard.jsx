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

// Items parsing logic - GROUPED
const parseItemsGrouped = (itemsString) => {
    if (!itemsString) return [];
    const groupedItems = [];
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

        const safeKey = name.replace(/\s+/g, '_');
        // ID is now based on Name, not individual index, to track the group
        groupedItems.push({
            id: `${safeKey}`,
            text: name,
            quantity: qty,
            checked: false
        });
    });
    return groupedItems;
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
        setItemsList(parseItemsGrouped(order.items));
        setPaymentConfirmed(false);
    }, [order.items, order.status]);

    const handleCheck = (index) => {
        setItemsList(prev => {
            const newList = [...prev];
            newList[index] = { ...newList[index], checked: !newList[index].checked };
            return newList;
        });
    };

    // Helper to toggle check based on ID (Group Logic)
    const toggleById = (itemId) => {
        const index = itemsList.findIndex(x => x.id === itemId);
        if (index !== -1) {
            handleCheck(index);
        }
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
        const original = parseItemsGrouped(order.original_items_snapshot);
        const current = JSON.parse(JSON.stringify(itemsList)); // Deep copy to modify quantities

        // We iterate ORIGINAL items to see what happened to them
        const processedOriginal = original.map(orgItem => {
            const matchIndex = current.findIndex(curr => curr.text === orgItem.text);

            if (matchIndex !== -1) {
                // Found in current
                const currItem = current[matchIndex];

                if (currItem.quantity >= orgItem.quantity) {
                    // We have enough in current to cover original -> All Kept
                    // Reduce current quantity by original quantity (consumed)
                    currItem.quantity -= orgItem.quantity;
                    // If current drops to 0, removing from pool is handled naturally by 0 qty check later or just ignoring
                    return { ...orgItem, status: 'kept', checked: currItem.checked }; // Inherit checked status? Actually tough if split.
                    // Simplified: We assume if the GROUP is checked, all parts are checked.
                    // But we are splitting the view.
                    // Let's rely on the ID check. If I check "Tacos", it checks the main current item.
                    // But here we are creating DISPLAY items.

                    // Actually, for the Checkbox to work, it needs to point to the REAL item in itemsList.
                    // If we split "Tacos x 5" into "Kept: Tacos x 2" and "Added: Tacos x 3",
                    // they share the same ID "Tacos". Checking one checks both?
                    // User wants to confirm "Articulo y Cantidad".
                    // Maybe we should create UNIQUE IDs for the split parts? "Tacos-kept", "Tacos-added"?
                    // But `itemsList` is the source of truth.
                    // Let's keep it simple: The checkbox in Diff View toggles the SINGLE current item in `itemsList`.
                    // So checking "Kept Tacos" checks the whole group "Tacos" in database?
                    // Or does the user want to check them separately? "I have the 2 old ones, waiting for 3 new ones".
                    // " evita que se tenga que hacer de uno por uno" -> implies ONE check for the line.
                    // So one check for the whole Tacos group is probably desired.
                } else {
                    // Current < Original -> Some Removed
                    // currItem.quantity is what is Kept.
                    // (orgItem.quantity - currItem.quantity) is Removed.
                    const keptQty = currItem.quantity;
                    const removedQty = orgItem.quantity - currItem.quantity;
                    currItem.quantity = 0; // All consumed

                    // We need to return potentially TWO rows here? Map can't do that easily.
                    // Let's mark this item as mixed 'partial-removed'?
                    // Or just return the Original one marked as 'changed'?
                    // Let's keep it simple: Show 'Kept' portion.
                    return { ...orgItem, quantity: keptQty, quantityRemoved: removedQty, status: 'partial' };
                }
            } else {
                // Not found -> Fully Removed
                return { ...orgItem, status: 'removed' };
            }
        });

        // Any remaining positive quantity in `current` is Added
        addedItems = current.filter(i => i.quantity > 0).map(i => ({ ...i, status: 'added' }));

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

    // Render helper for Grouped Row
    const renderGroupedRow = (item, isDiff = false) => {
        const isRemoved = item.status === 'removed';
        const isPartial = item.status === 'partial';

        // Logic for checking: If it's a display item derived from calculation,
        // we map interaction back to the main `itemsList` via ID.
        // For 'removed', no interaction.
        const realItem = itemsList.find(i => i.text === item.text);
        const isChecked = realItem ? realItem.checked : false;

        return (
            <li key={item.id} className={`checklist-item ${isChecked ? 'checked' : ''} ${isRemoved ? 'item-removed' : ''}`}
                style={isRemoved ? { opacity: 0.6 } : {}}>
                <label style={{ cursor: isRemoved ? 'default' : (isLocked ? 'not-allowed' : 'pointer'), display: 'flex', alignItems: 'center', width: '100%' }}>
                    {!isRemoved && (
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleById(item.id)}
                            disabled={!canAdvance || isLocked}
                            style={{ marginRight: '10px' }}
                        />
                    )}

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                        <span className="item-text" style={isRemoved ? { textDecoration: 'line-through', color: '#e74c3c' } : {}}>
                            {item.quantity > 0 && <strong>{item.quantity}x </strong>}
                            {item.text}
                            {isPartial && <span style={{ color: '#e74c3c', marginLeft: '5px' }}>(-{item.quantityRemoved})</span>}
                        </span>

                        {/* Quantity Selector / Display */}
                        {!isRemoved && !isLocked && !isDiff && (
                            /* User asked for "column 1-10 list". 
                               Visual simplicity: Just showing the number is often enough if they just confirm. 
                               But I will add a small dropdown disabled just to mock the UI if they requested "list".
                               Actually, checking the box confirms the quantity.
                               Let's just show the Quantity prominently.
                            */
                            <span className="qty-badge" style={{ marginLeft: 'auto', background: '#333', padding: '2px 8px', borderRadius: '4px', fontSize: '0.9em' }}>
                                Cant: {item.quantity}
                            </span>
                        )}

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
                            {itemsList.map((item, i) => (
                                <li key={i} className="simple-item" style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ marginRight: '8px', color: '#3498db' }}>•</span>
                                    <span className="item-text" style={{ color: '#ecf0f1', fontWeight: 'bold' }}>{item.quantity}x</span>
                                    <span className="item-text" style={{ color: '#ecf0f1', marginLeft: '5px' }}>{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    ) : showDiff ? (
                        <div className="diff-view">
                            {displayItems.length > 0 && <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>Orden Original:</p>}
                            <ul className="items-list-checklist">
                                {displayItems.map((item) => renderGroupedRow(item, true))}
                            </ul>

                            {addedItems.length > 0 && (
                                <>
                                    <div style={{ borderTop: '1px solid #555', margin: '10px 0', position: 'relative' }}>
                                        <span style={{ position: 'absolute', top: '-10px', left: '0', background: '#333', paddingRight: '5px', fontSize: '0.8rem', color: '#2ecc71' }}>Nuevos / Agregados</span>
                                    </div>
                                    <ul className="items-list-checklist" style={{ marginTop: '15px' }}>
                                        {addedItems.map((item) => renderGroupedRow({ ...item, status: 'added' }, true))}
                                    </ul>
                                </>
                            )}
                        </div>
                    ) : (
                        <ul className="items-list-checklist">
                            {displayItems.map((item) => renderGroupedRow(item))}
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
