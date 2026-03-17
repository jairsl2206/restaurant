import { useState, useEffect } from 'react';
import './OrderCard.css';
import { ORDER_STATUS, ORDER_TYPE, STATUS_CSS_CLASSES, ORDER_STATUS_LABELS, TIME_BADGE_WARN_MIN, TIME_BADGE_URGENT_MIN } from './constants';
import { getNextStatus, getStatusSteps, cleanItemName, parseItemsIndividual, parseItemsGrouped, buildBillingItemsList } from './utils/orderCardUtils';
import { useToast } from './components/Toast';

function getWaitingMinutes(dateStr) {
    if (!dateStr) return 0;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

function OrderCard({ order, onStatusChange, user, onEdit }) {
    const showToast = useToast();
    const nextStatus = getNextStatus(order);
    const canAdvance = nextStatus !== null;
    const isFinalizado = order.status === ORDER_STATUS.FINALIZADO;

    // Roles that can advance kitchen status (cook or admin)
    const isAllowedRole = user?.role === 'cook' || user?.role === 'admin' || user?.role === 'manager';
    // EN_COCINA stage is locked for waiters (kitchen advances it)
    const isKitchenStage = order.status === ORDER_STATUS.EN_COCINA;
    const isLocked = isKitchenStage && !isAllowedRole;

    // Delivery / pickup detection — supports both new `type` and legacy `is_delivery`/`is_pickup`
    const isDelivery = order.type === ORDER_TYPE.DELIVERY || order.is_delivery == 1;
    const isPickup   = order.type === ORDER_TYPE.PICKUP   || order.is_pickup == 1;

    const [itemsList, setItemsList] = useState([]);
    const [paymentConfirmed, setPaymentConfirmed] = useState(false);
    const [advancing, setAdvancing] = useState(false);

    useEffect(() => {
        const nextSt = getNextStatus(order);
        const items = nextSt === ORDER_STATUS.FINALIZADO
            ? buildBillingItemsList(order)
            : parseItemsIndividual(order.items);
        setItemsList(items);
        setPaymentConfirmed(false);
    }, [order.items, order.additions_items, order.status]);

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

    // Payment/confirmation stage: when next step is FINALIZADO
    const isPaymentStage = nextStatus === ORDER_STATUS.FINALIZADO;
    const showSimpleList = isFinalizado;

    // Show diff view when the order has a pending diff (set after an edit, cleared on next poll)
    const hasDiff = Array.isArray(order.diff) && order.diff.length > 0;
    const showDiff = hasDiff;
    // Quantity-aware partition of itemsList into kept vs. added.
    // Uses the diff's added-quantities so partial increases (x2→x3) correctly
    // put only the delta unit into addedInList, not all units.
    const addedQtyMap = {};
    (order.diff || []).filter(d => d.diffStatus === 'added').forEach(d => {
        addedQtyMap[d.name] = (addedQtyMap[d.name] || 0) + (d.quantity || 1);
    });
    const totalCountMap = {};
    itemsList.forEach(item => {
        totalCountMap[item.text] = (totalCountMap[item.text] || 0) + 1;
    });
    const seenCountMap = {};
    const keptInList  = [];
    const addedInList = [];
    for (const item of itemsList) {
        const name = item.text;
        seenCountMap[name] = (seenCountMap[name] || 0) + 1;
        const keptQty = (totalCountMap[name] || 0) - (addedQtyMap[name] || 0);
        if (seenCountMap[name] <= keptQty) {
            keptInList.push(item);
        } else {
            addedInList.push(item);
        }
    }
    const removedFromDiff = (order.diff || []).filter(d => d.diffStatus === 'removed');
    // For the regular (non-diff) checklist branch
    let displayItems = itemsList.map(item => ({ ...item, status: 'kept' }));

    // Waiter (non-cook) read-only view: show item + qty + price, no checkboxes
    const isWaiterView = !isAllowedRole && !isPaymentStage && !isFinalizado;
    // Grouped items with price for the waiter view
    const waiterViewItems = isWaiterView
        ? itemsList.reduce((acc, item) => {
            const key = `${item.text}|${item.note || ''}|${item.price}`;
            const existing = acc.find(a => a.key === key);
            if (existing) { existing.quantity++; }
            else { acc.push({ key, text: item.text, note: item.note || '', price: item.price, quantity: 1 }); }
            return acc;
          }, [])
        : [];

    // Block finalization when there are additions not yet served
    const hasUnservedAdditions = (order.unserved_additions_count || 0) > 0;
    const blockedByAdditions = isPaymentStage && hasUnservedAdditions;

    const allChecked = itemsList.length > 0 && itemsList.every(item => item.checked);
    // Waiters don't need to check individual items — they just advance status
    const canSubmit = isPaymentStage
        ? (paymentConfirmed && !blockedByAdditions)
        : (isAllowedRole ? allChecked : true);
    const validationRequired = canAdvance;

    const handleAdvance = async () => {
        if (!canAdvance) return;
        if (isPaymentStage && !paymentConfirmed) {
            showToast('Por favor confirma antes de finalizar.', 'warning');
            return;
        } else if (!isPaymentStage && isAllowedRole && !allChecked) {
            showToast('Por favor verifica todos los artículos antes de avanzar.', 'warning');
            return;
        }
        setAdvancing(true);
        await onStatusChange(order.id, nextStatus);
        // Component may unmount after status change; no need to reset
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('es-MX', {
            hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
        });
    };

    // Time badge: show if waiting ≥ 10 min and order is active
    const waitMins = !isFinalizado ? getWaitingMinutes(order.updated_at) : 0;
    const showTimeBadge = waitMins >= TIME_BADGE_WARN_MIN;
    const timeBadgeClass = waitMins > TIME_BADGE_URGENT_MIN ? 'time-badge-urgent' : 'time-badge-warn';

    // Render helper for Individual Row
    const renderIndividualRow = (item, isDiff = false) => {
        const isRemoved = item.status === 'removed';

        let realItem;
        let isChecked;

        if (isDiff) {
            if (item.status === 'kept' || item.status === 'removed') {
                const originalIndex = parseInt(item.id.split('_')[1]);
                realItem = itemsList[originalIndex];
            } else if (item.status === 'added') {
                const addedIndex = parseInt(item.id.split('_')[1]);
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
                const index = itemsList.findIndex(i => i.id === realItem.id);
                if (index !== -1) {
                    handleCheck(index);
                }
            } else {
                const index = itemsList.findIndex(i => i.id === item.id);
                if (index !== -1) {
                    handleCheck(index);
                }
            }
        };

        return (
            <li key={item.id} className={`checklist-item ${isChecked ? 'checked' : ''} ${isRemoved ? 'item-removed' : ''}`}>
                <label className={`checklist-label checklist-label--${isRemoved ? 'removed' : isLocked ? 'locked' : 'active'}`}>
                    {!isRemoved && (
                        <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={handleToggle}
                            disabled={!canAdvance || isLocked}
                            className="checklist-checkbox"
                        />
                    )}

                    <div className="checklist-item-body">
                        <div className="checklist-item-row">
                            <span className={`item-text ${isRemoved ? 'item-text--removed' : ''}`}>
                                {item.text}
                            </span>
                            {isRemoved && <span className="item-removed-label">(Eliminado)</span>}
                        </div>
                        {item.note && !isRemoved && (
                            <span className="item-note-badge">
                                <span className="note-icon">📋</span> {item.note}
                            </span>
                        )}
                    </div>
                </label>
            </li>
        );
    };

    // Billing totals for payment stage
    const originalTotal  = order.total;
    const additionsTotal = Number(order.additions_total) || 0;
    const grandTotal     = originalTotal + additionsTotal;

    // Total savings = discounts applied to this order + discounts on any additions
    const discountTotal   = (Number(order.discount_total) || 0)
                          + (Number(order.additions_discount_total) || 0);
    // Gross = what is actually paid + what was saved → price before any discounts
    const grossOrderTotal = grandTotal + discountTotal;

    return (
        <div className={`order-card glass-card slide-in ${STATUS_CSS_CLASSES[order.status] || ''}`}>
            <div className="order-header">
                <div className="order-info">
                    <h3 className="order-number">#{order.id}</h3>
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
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {showTimeBadge && (
                        <span className={`time-badge ${timeBadgeClass}`} title={`Esperando ${waitMins} min`}>
                            🕐 {waitMins}m
                        </span>
                    )}
                    {hasDiff && (
                        <div className="badge-updated">✏️ ACTUALIZADA</div>
                    )}
                    {order.parent_order_id && (
                        <div className="badge-info">+ Adición a #{order.parent_order_id}</div>
                    )}
                    {!order.parent_order_id && order.pending_additions_count > 0 && (
                        <div className="badge-warn">+{order.pending_additions_count} adición(es)</div>
                    )}
                    <div className={`status-badge ${STATUS_CSS_CLASSES[order.status] || ''}`}>
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                    </div>
                </div>
            </div>

            <div className="status-progress">
                {(() => {
                    const steps = getStatusSteps(order);
                    const currentStepIndex = steps.indexOf(order.status);
                    return steps.map((step, index) => {
                        const isActive = index <= currentStepIndex;
                        return (
                            <div key={step} className={`progress-step ${isActive ? 'active' : ''}`}>
                                <div className="step-dot" title={ORDER_STATUS_LABELS[step]}></div>
                                {index < steps.length - 1 && <div className="step-line"></div>}
                            </div>
                        );
                    });
                })()}
            </div>

            <div className="order-body">
                <div className="order-items">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4>{isPaymentStage ? '💳 Cobro' : 'Artículos'}</h4>

                        {!isPaymentStage && validationRequired && !allChecked && !isLocked && isAllowedRole && (
                            <span style={{ fontSize: '0.8rem', color: '#ff6b6b' }}>
                                Faltan {itemsList.filter(i => !i.checked).length}
                            </span>
                        )}

                        {/* Edit button — available in any active status (before FINALIZADO), only for waiters */}
                        {onEdit && order.status !== ORDER_STATUS.FINALIZADO && !isAllowedRole && (
                            <div className="edit-btn-wrap">
                                <button
                                    onClick={() => onEdit(order)}
                                    aria-label={`Editar orden #${order.id}`}
                                    className="btn-edit-inline"
                                >
                                    ✏️ Editar
                                </button>
                            </div>
                        )}
                    </div>

                    {isPaymentStage ? (
                        <div className="payment-receipt">
                            {/* Item list */}
                            <ul className="receipt-items-list">
                                {itemsList.map((item, i) => (
                                    <li key={i} className={`receipt-item ${item.isAddition ? 'receipt-item-addition' : ''} ${item.price === 0 && !item.isAddition ? 'receipt-item-free' : ''}`}>
                                        <div className="receipt-item-info">
                                            <span className={`receipt-item-dot ${item.isAddition ? 'receipt-item-dot--addition' : ''}`}>•</span>
                                            <span className="receipt-item-name">{item.text}</span>
                                            {item.isAddition && <span className="receipt-addition-badge">+adición</span>}
                                            {item.price === 0 && !item.isAddition && (
                                                <span className="receipt-bundle-badge">🎁 bundle</span>
                                            )}
                                            {item.note && (
                                                <span className="receipt-item-note">↳ {item.note}</span>
                                            )}
                                        </div>
                                        <span className={`receipt-item-price ${item.price === 0 && !item.isAddition ? 'receipt-item-price--free' : ''}`}>
                                            {item.price === 0 && !item.isAddition ? 'GRATIS' : `$${(item.price || 0).toFixed(2)}`}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {/* Totals */}
                            <div className="receipt-totals">
                                <div className="receipt-row">
                                    <span>{discountTotal > 0 ? 'Subtotal' : 'Orden original'}</span>
                                    <span>${(discountTotal > 0 ? grossOrderTotal : originalTotal).toFixed(2)}</span>
                                </div>
                                {discountTotal > 0 && (
                                    <div className="receipt-row receipt-bundle-savings">
                                        <span>🏷️ Descuento</span>
                                        <span className="receipt-savings-amount">-${discountTotal.toFixed(2)}</span>
                                    </div>
                                )}
                                {additionsTotal > 0 && (
                                    <div className="receipt-row receipt-additions">
                                        <span>Adiciones (+{itemsList.filter(i => i.isAddition).length} ítem{itemsList.filter(i => i.isAddition).length !== 1 ? 's' : ''})</span>
                                        <span className="receipt-additions-amount">+${additionsTotal.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="receipt-divider" />
                                <div className="receipt-grand-total">
                                    <span>TOTAL A COBRAR</span>
                                    <span className="receipt-grand-amount">${grandTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Edit history summary — shown if the order was ever modified */}
                            {Array.isArray(order.lastEditDiff) && order.lastEditDiff.length > 0 && (() => {
                                const added   = order.lastEditDiff.filter(i => i.diffStatus === 'added');
                                const removed = order.lastEditDiff.filter(i => i.diffStatus === 'removed');
                                if (!added.length && !removed.length) return null;
                                return (
                                    <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.8rem' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>✏️ Cambios en la orden</div>
                                        {added.length > 0 && (
                                            <ul style={{ margin: '0 0 4px', paddingLeft: '4px', listStyle: 'none' }}>
                                                {added.map((item, i) => (
                                                    <li key={i} style={{ color: '#2ecc71', marginBottom: '2px' }}>+ {item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}</li>
                                                ))}
                                            </ul>
                                        )}
                                        {removed.length > 0 && (
                                            <ul style={{ margin: 0, paddingLeft: '4px', listStyle: 'none' }}>
                                                {removed.map((item, i) => (
                                                    <li key={i} style={{ color: '#e74c3c', textDecoration: 'line-through', marginBottom: '2px' }}>✕ {item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Block finalization if additions are pending */}
                            {blockedByAdditions && (
                                <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', fontSize: '0.85rem', color: '#fca5a5' }}>
                                    ⚠️ Hay adiciones aún en preparación. Espera a que estén servidas antes de cobrar.
                                </div>
                            )}

                            {/* Payment confirmation */}
                            {!blockedByAdditions && (
                            <div className="payment-check-container">
                                <label className="payment-confirm-label">
                                    <input
                                        type="checkbox"
                                        checked={paymentConfirmed}
                                        onChange={(e) => setPaymentConfirmed(e.target.checked)}
                                        className="payment-confirm-checkbox"
                                    />
                                    <span>✅ Confirmar pago y finalizar orden</span>
                                </label>
                            </div>
                            )}
                        </div>
                    ) : showSimpleList ? (
                        <ul className="items-list-simple">
                            {parseItemsGrouped(order.items).map((item, i) => (
                                <li key={i} className="simple-item">
                                    <div className="simple-item-body">
                                        <div className="simple-item-row">
                                            <span className="simple-item-bullet">•</span>
                                            <span className="item-text simple-item-text">{item.text}</span>
                                        </div>
                                        {item.note && (
                                            <span className="simple-item-note">↳ {item.note}</span>
                                        )}
                                    </div>
                                    <span className="simple-item-qty">x{item.quantity}</span>
                                </li>
                            ))}
                        </ul>
                    ) : isWaiterView ? (
                        /* Waiter read-only view — item, quantity, price. No checkboxes. */
                        <ul className="items-list-simple">
                            {waiterViewItems.map((item, i) => (
                                <li key={i} className="simple-item">
                                    <div className="simple-item-body">
                                        <div className="simple-item-row">
                                            <span className="simple-item-bullet">•</span>
                                            <span className="item-text simple-item-text">{item.text}</span>
                                            {item.price === 0 && (
                                                <span style={{ fontSize: '0.7rem', color: '#2ecc71', marginLeft: '4px' }}>🎁</span>
                                            )}
                                        </div>
                                        {item.note && (
                                            <span className="simple-item-note">↳ {item.note}</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
                                        <span className="simple-item-qty">×{item.quantity}</span>
                                        <span style={{ fontSize: '0.78rem', color: item.price === 0 ? '#2ecc71' : 'var(--text-secondary)', fontWeight: 600 }}>
                                            {item.price === 0 ? 'GRATIS' : `$${(item.price).toFixed(2)}`}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : showDiff ? (
                        <div className="diff-view">
                            {/* Marcar Todo */}
                            {!isLocked && !isPaymentStage && itemsList.length > 0 && (
                                <div className="select-all-row">
                                    <label className="select-all-label">
                                        <input
                                            type="checkbox"
                                            checked={allChecked}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                            className="select-all-checkbox"
                                        />
                                        Marcar Todo
                                    </label>
                                </div>
                            )}

                            {/* Kept items — original items still in the order */}
                            <ul className="items-list-checklist">
                                {keptInList.map((item) => renderIndividualRow(item))}
                            </ul>

                            {/* Added items — visually separated */}
                            {addedInList.length > 0 && (
                                <>
                                    <div className="diff-additions-divider" style={{ margin: '8px 0' }}>
                                        <span className="diff-additions-label" style={{ color: '#2ecc71' }}>✚ Agregados</span>
                                    </div>
                                    <ul className="items-list-checklist">
                                        {addedInList.map((item) => renderIndividualRow(item))}
                                    </ul>
                                </>
                            )}

                            {/* Removed items — read-only, with strikethrough */}
                            {removedFromDiff.length > 0 && (
                                <>
                                    <div className="diff-additions-divider" style={{ margin: '8px 0' }}>
                                        <span className="diff-additions-label" style={{ color: '#e74c3c' }}>✕ Ya no se preparan</span>
                                    </div>
                                    <ul className="items-list-checklist">
                                        {removedFromDiff.map((item, i) => renderIndividualRow({
                                            id: `removed_${i}`,
                                            text: (item.quantity || 1) > 1
                                                ? `${item.name} ×${item.quantity}`
                                                : item.name,
                                            status: 'removed',
                                            note: null,
                                            checked: false
                                        }))}
                                    </ul>
                                </>
                            )}
                        </div>
                    ) : (
                        <div>
                            {!isLocked && !isPaymentStage && itemsList.length > 0 && (
                                <div className="select-all-row">
                                    <label className="select-all-label">
                                        <input
                                            type="checkbox"
                                            checked={itemsList.length > 0 && itemsList.every(i => i.checked)}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                            className="select-all-checkbox"
                                        />
                                        Marcar Todo
                                    </label>
                                </div>
                            )}
                            <ul className="items-list-checklist">
                                {displayItems.map((item) => renderIndividualRow(item))}
                            </ul>

                            {/* Merged additions: sub-orders at same status, shown inline */}
                            {order.additions_items && (
                                <>
                                    <div className="diff-additions-divider" style={{ marginTop: '10px' }}>
                                        <span className="diff-additions-label">+ Adición incluida</span>
                                    </div>
                                    <ul className="items-list-simple" style={{ marginTop: '8px' }}>
                                        {parseItemsGrouped(order.additions_items).map((item, i) => (
                                            <li key={i} className="simple-item">
                                                <div className="simple-item-body">
                                                    <div className="simple-item-row">
                                                        <span className="simple-item-bullet" style={{ color: '#fdcb6e' }}>+</span>
                                                        <span className="item-text simple-item-text">{item.text}</span>
                                                    </div>
                                                    {item.note && <span className="simple-item-note">↳ {item.note}</span>}
                                                </div>
                                                <span className="simple-item-qty">x{item.quantity}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {!isPaymentStage && (
                    <div className="order-meta">
                        <div className="meta-item"><span className="meta-label">Total</span><span className="meta-value">${order.total.toFixed(2)}</span></div>
                        <div className="meta-item"><span className="meta-label">Hora</span><span className="meta-value">{formatDate(order.created_at)}</span></div>
                        {order.waiter_username && (
                            <div className="meta-item"><span className="meta-label">🧑‍💼 Mesero</span><span className="meta-value meta-staff">{order.waiter_username}</span></div>
                        )}
                        {order.cook_username && (
                            <div className="meta-item"><span className="meta-label">👨‍🍳 Cocinero</span><span className="meta-value meta-staff">{order.cook_username}</span></div>
                        )}
                    </div>
                )}
            </div>

            {canAdvance && (
                <div className="order-footer">
                    {isLocked ? null : (
                        <button
                            className={`btn btn-primary btn-block advance-btn ${advancing ? 'btn-loading' : ''}`}
                            onClick={handleAdvance}
                            disabled={!canSubmit || advancing}
                            aria-label={isPaymentStage ? 'Finalizar orden' : `Avanzar a ${ORDER_STATUS_LABELS[nextStatus] || nextStatus}`}
                        >
                            {advancing && <span className="btn-spinner" aria-hidden="true" />}
                            <span>{advancing ? 'Procesando...' : (isPaymentStage ? 'Finalizar Orden' : `Avanzar a ${ORDER_STATUS_LABELS[nextStatus] || nextStatus}`)}</span>
                            {!advancing && <span className="arrow-icon" aria-hidden="true">→</span>}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

import PropTypes from 'prop-types';

OrderCard.propTypes = {
    order: PropTypes.shape({
        id:     PropTypes.number.isRequired,
        status: PropTypes.string.isRequired,
        items:  PropTypes.string,
        total:  PropTypes.number
    }).isRequired,
    user: PropTypes.shape({
        role: PropTypes.string.isRequired
    }).isRequired,
    onStatusChange: PropTypes.func.isRequired,
    onEdit:         PropTypes.func
};

export default OrderCard;
