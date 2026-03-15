import { useState, useEffect } from 'react';
import './NewOrderModal.css';
import API_BASE_URL from './config';
import { ORDER_TYPE } from './constants';
import { parseInitialItems } from './utils/parseInitialItems';
import { useToast } from './components/Toast';

// Menu items will be fetched from API
const API_MENU_URL = API_BASE_URL + '/menu';
const API_SETTINGS_URL = API_BASE_URL + '/settings';

function NewOrderModal({ onClose, onSubmit, initialOrder = null, onCancel, isAdditionMode = false }) {
    const showToast = useToast();
    const [tableNumber, setTableNumber] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmationChecks, setConfirmationChecks] = useState({});
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [maxTables, setMaxTables] = useState(20); // Default value

    // Mode state for order type
    const [orderMode, setOrderMode] = useState('table'); // 'table', 'delivery', 'pickup'
    const isDelivery = orderMode === 'delivery';
    const isPickup   = orderMode === 'pickup';

    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');

    // Fetch settings to get max_tables
    useEffect(() => {
        fetch(API_SETTINGS_URL)
            .then(res => res.json())
            .then(data => {
                if (data.max_tables) {
                    setMaxTables(parseInt(data.max_tables));
                }
            })
            .catch(err => {
                console.error('Error fetching settings:', err);
            });
    }, []);

    // Persistence check: We only reset checks when the table changes, 
    // NOT when items change, to preserve checks when adding/editing items.
    useEffect(() => {
        setConfirmationChecks({});
    }, [tableNumber, orderMode]);

    useEffect(() => {
        fetch(API_MENU_URL)
            .then(res => res.json())
            .then(data => {
                setMenuItems(data.filter(item => item.available));
                setLoading(false);

                if (initialOrder) {
                    // Always restore type/table/customer data (edit and addition modes)
                    const orderType = initialOrder.type;
                    if (initialOrder.is_pickup || orderType === ORDER_TYPE.PICKUP) {
                        setOrderMode('pickup');
                        setCustomerName(initialOrder.customer_name || '');
                        setCustomerPhone(initialOrder.customer_phone || '');
                        setCustomerAddress(initialOrder.customer_address || '');
                    } else if (initialOrder.is_delivery || orderType === ORDER_TYPE.DELIVERY) {
                        setOrderMode('delivery');
                        setCustomerName(initialOrder.customer_name || '');
                        setCustomerPhone(initialOrder.customer_phone || '');
                        setCustomerAddress(initialOrder.customer_address || '');
                    } else {
                        setOrderMode('table');
                        setTableNumber(initialOrder.table_number || '');
                    }

                    // Only pre-load items when editing (not when adding to an existing order)
                    if (!isAdditionMode && initialOrder.items) {
                        const parsed = parseInitialItems(initialOrder.items, data);
                        setSelectedItems(parsed);
                    }
                }
            })
            .catch(err => {
                console.error('Error fetching menu:', err);
                setLoading(false);
            });
    }, [initialOrder]);

    const handleAddItem = (item) => {
        setSelectedItems([...selectedItems, {
            ...item,
            uid: `item_${Date.now()}_${Math.random()}`,
            quantity: 1,
            note: ''
        }]);
    };

    const handleRemoveItem = (itemName) => {
        setSelectedItems(selectedItems.filter(i => i.name !== itemName));
    };

    const handleQuantityChange = (index, delta) => {
        const updated = [...selectedItems];
        updated[index].quantity += delta;
        if (updated[index].quantity <= 0) {
            updated.splice(index, 1);
        }
        setSelectedItems(updated);
    };

    const handleNoteChange = (index, note) => {
        setSelectedItems(selectedItems.map((item, i) =>
            i === index ? { ...item, note } : item
        ));
    };

    const handleSelectAll = (checked) => {
        const newChecks = {};
        if (checked) {
            explodedItems.forEach(item => {
                newChecks[item.id] = true;
            });
        }
        setConfirmationChecks(newChecks);
    };

    const total = selectedItems.reduce((sum, item) => sum + ((item.final_price || item.price) * item.quantity), 0);

    // For the checklist, we use selectedItems directly since we now keep them separate if they have notes
    const explodedItems = selectedItems.map((item) => ({
        id: item.uid,
        name: item.name,
        note: item.note || '',
        checked: !!confirmationChecks[item.uid]
    }));

    const isAllConfirmed = explodedItems.length > 0 && explodedItems.every(item => item.checked);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate based on mode
        if (isDelivery || isPickup) {
            const trimmedName = customerName.trim();
            if (!trimmedName) {
                showToast('Por favor completa el nombre del cliente', 'warning');
                return;
            }
        } else {
            if (!tableNumber) {
                showToast('Por favor selecciona una mesa', 'warning');
                return;
            }
        }

        if (selectedItems.length === 0) {
            showToast('Por favor selecciona al menos un platillo', 'warning');
            return;
        }

        if (!isAllConfirmed) {
            showToast('Por favor verifica todos los artículos', 'warning');
            return;
        }

        // Formatting items: "Name (Note)"
        const formattedItems = selectedItems.map(item => ({
            ...item,
            name: item.note ? `${item.name} (${item.note})` : item.name
        }));

        setSubmitting(true);
        try {
            await onSubmit({
                tableNumber: (isDelivery || isPickup) ? null : parseInt(tableNumber),
                items:       formattedItems,
                type:        isDelivery ? ORDER_TYPE.DELIVERY : isPickup ? ORDER_TYPE.PICKUP : ORDER_TYPE.DINE_IN,
                customerData: (isDelivery || isPickup) ? {
                    name:    customerName.trim(),
                    phone:   customerPhone.trim(),
                    address: isDelivery ? customerAddress.trim() : ''
                } : null
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Generate table numbers array based on maxTables
    const tableNumbers = Array.from({ length: maxTables }, (_, i) => i + 1);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>
                        {isAdditionMode
                            ? `Agregar artículos a Orden #${initialOrder.id}`
                            : initialOrder
                                ? `Editar Orden #${initialOrder.id}`
                                : 'Nueva Orden'}
                    </h2>
                    <button className="close-btn" onClick={onClose} aria-label="Cerrar modal">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="modal-body-grid">
                        {/* Left Column: Menu & Tables */}
                        <div className="modal-left">
                            <div className="section-header">
                                <h3>1. Selecciona Tipo de Orden</h3>
                            </div>

                            {/* Mode Toggles — read-only in addition mode */}
                            <div className="delivery-toggle" style={{ marginBottom: '18px', display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    className={`table-btn ${orderMode === 'table' ? 'selected' : ''}`}
                                    onClick={() => { if (!isAdditionMode) { setOrderMode('table'); setTableNumber(''); } }}
                                    style={{ flex: 1, fontSize: '0.85rem', ...(isAdditionMode ? { opacity: 0.6, cursor: 'default' } : {}) }}
                                >
                                    🪑 Mesas
                                </button>
                                <button
                                    type="button"
                                    className={`table-btn ${orderMode === 'pickup' ? 'selected' : ''}`}
                                    onClick={() => { if (!isAdditionMode) { setOrderMode('pickup'); setTableNumber(''); } }}
                                    style={{ flex: 1, fontSize: '0.85rem', ...(isAdditionMode ? { opacity: 0.6, cursor: 'default' } : {}) }}
                                >
                                    🛍️ Pickup
                                </button>
                                <button
                                    type="button"
                                    className={`table-btn ${orderMode === 'delivery' ? 'selected' : ''}`}
                                    onClick={() => { if (!isAdditionMode) { setOrderMode('delivery'); setTableNumber(''); } }}
                                    style={{ flex: 1, fontSize: '0.85rem', ...(isAdditionMode ? { opacity: 0.6, cursor: 'default' } : {}) }}
                                >
                                    🚗 Delivery
                                </button>
                            </div>

                            {/* Table Grid or Customer Form */}
                            {orderMode === 'table' ? (
                                <div className="table-grid">
                                    {tableNumbers.map(num => (
                                        <button
                                            key={num}
                                            type="button"
                                            className={`table-btn ${parseInt(tableNumber) === num ? 'selected' : ''}`}
                                            onClick={() => { if (!isAdditionMode) setTableNumber(num); }}
                                            style={isAdditionMode ? { opacity: 0.6, cursor: 'default' } : {}}
                                        >
                                            Mesa {num}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="customer-form" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                    <div className="form-group">
                                        <label style={{ display: 'block', color: 'var(--text-secondary)' }}>
                                            Nombre del Cliente *
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Ej: Juan Pérez"
                                            value={customerName}
                                            onChange={(e) => { if (!isAdditionMode) setCustomerName(e.target.value); }}
                                            readOnly={isAdditionMode}
                                            style={{
                                                width: '100%',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: isAdditionMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                                                color: 'white',
                                                fontSize: '0.9rem'
                                            }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ display: 'block', color: 'var(--text-secondary)' }}>
                                            Teléfono (Opcional)
                                        </label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            placeholder="Ej: 5512345678"
                                            value={customerPhone}
                                            onChange={(e) => { if (!isAdditionMode) setCustomerPhone(e.target.value); }}
                                            readOnly={isAdditionMode}
                                            style={{
                                                width: '100%',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: isAdditionMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                                                color: 'white',
                                                fontSize: '0.9rem'
                                            }}
                                        />
                                    </div>
                                    {isDelivery && (
                                        <div className="form-group">
                                            <label style={{ display: 'block', color: 'var(--text-secondary)' }}>
                                                Dirección (Opcional)
                                            </label>
                                            <textarea
                                                className="form-input"
                                                placeholder="Ej: Calle 123, Col. Centro"
                                                value={customerAddress}
                                                onChange={(e) => { if (!isAdditionMode) setCustomerAddress(e.target.value); }}
                                                readOnly={isAdditionMode}
                                                rows="2"
                                                style={{
                                                    width: '100%',
                                                    padding: '6px 10px',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    background: isAdditionMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                                                    color: 'white',
                                                    fontSize: '0.9rem',
                                                    resize: 'none',
                                                    fontFamily: 'inherit',
                                                    minHeight: '45px'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="section-header mt-1">
                                <h3>2. Selecciona Platillos</h3>
                            </div>
                            <div className="menu-container-scroll">
                                <div>
                                    {loading ? <p>Cargando menú...</p> : (
                                        (() => {
                                            // Group items by category
                                            const groupedItems = menuItems.reduce((acc, item) => {
                                                const category = item.category || 'Otros';
                                                if (!acc[category]) {
                                                    acc[category] = [];
                                                }
                                                acc[category].push(item);
                                                return acc;
                                            }, {});

                                            // Sort categories (standard ones first)
                                            const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
                                                const priorities = { 'Plato Principal': 1, 'Entrada': 2, 'Bebida': 3, 'Postre': 4, 'Otros': 99 };
                                                const pA = priorities[a] || 50;
                                                const pB = priorities[b] || 50;
                                                if (pA !== pB) return pA - pB;
                                                return a.localeCompare(b);
                                            });

                                            // Price is already calculated by backend in final_price
                                            const getEffectivePrice = (item) => {
                                                return item.final_price ?? item.price;
                                            };

                                            const getImageUrl = (url) => {
                                                if (!url) return null;
                                                // If it's a relative path starting with /uploads
                                                if (url.startsWith('/uploads')) {
                                                    return API_BASE_URL.replace('/api', '') + url;
                                                }
                                                // If it contains localhost:3001, replace it with the actual server URL
                                                if (url.includes('localhost:3001')) {
                                                    const serverBase = API_BASE_URL.replace('/api', '');
                                                    return url.replace(/http:\/\/localhost:3001/g, serverBase);
                                                }
                                                return url;
                                            };

                                            return (
                                                <div className="menu-accordion">
                                                    {sortedCategories.map(category => {
                                                        const isExpanded = expandedCategory === category;
                                                        const itemCount = groupedItems[category].length;

                                                        return (
                                                            <div key={category} className={`accordion-item glass-card ${isExpanded ? 'active' : ''}`}>
                                                                <div
                                                                    className="accordion-header"
                                                                    onClick={() => setExpandedCategory(isExpanded ? null : category)}
                                                                >
                                                                    <div className="header-info">
                                                                        <span className="category-icon">
                                                                            {category === 'Bebida' ? '🥤' :
                                                                                category === 'Postre' ? '🍰' :
                                                                                    category === 'Entrada' ? '🥗' :
                                                                                        category === 'Plato Principal' ? '🍽️' : '📦'}
                                                                        </span>
                                                                        <span className="category-name">{category}</span>
                                                                    </div>
                                                                    <div className="header-meta">
                                                                        <span className="item-count">{itemCount} items</span>
                                                                        <span className="chevron">{isExpanded ? '▲' : '▼'}</span>
                                                                    </div>
                                                                </div>

                                                                {isExpanded && (
                                                                    <div className="accordion-content">
                                                                        <div className="menu-grid">
                                                                            {groupedItems[category].map(item => {
                                                                                const discountedPrice = item.final_price ?? item.price;
                                                                                const hasPromo = item.has_promotion;

                                                                                return (
                                                                                    <div
                                                                                        key={item.id}
                                                                                        className={`menu-item premium-card ${!!hasPromo ? 'has-promo' : ''}`}
                                                                                    >
                                                                                        <div className="item-image-container">
                                                                                            {item.image_url ? (
                                                                                                <img src={getImageUrl(item.image_url)} alt={item.name} className="item-image-full" />
                                                                                            ) : (
                                                                                                <div className="item-placeholder-full">🍽️</div>
                                                                                            )}
                                                                                            {!!hasPromo && (
                                                                                                <div className="promo-tag">
                                                                                                    {item.promotion_type === 'PERCENTAGE' ? `-${item.promotion_value}%` : `-$${item.promotion_value}`}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="item-info-premium">
                                                                                            <span className="item-name-premium">{item.name}</span>
                                                                                            {item.description && (
                                                                                                <p className="item-desc-premium">{item.description}</p>
                                                                                            )}
                                                                                            <div className="item-footer-premium">
                                                                                                <div className="item-price-premium">
                                                                                                    {!!hasPromo && (
                                                                                                        <span className="old-price" style={{ textDecoration: 'line-through', opacity: 0.6, fontSize: '0.8rem', marginRight: '5px' }}>
                                                                                                            ${(item.original_price ?? item.price).toFixed(2)}
                                                                                                        </span>
                                                                                                    )}
                                                                                                    <span className="current-price" style={{ color: hasPromo ? 'var(--primary)' : 'inherit', fontWeight: 'bold' }}>
                                                                                                        ${discountedPrice.toFixed(2)}
                                                                                                    </span>
                                                                                                </div>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    className="add-btn-premium"
                                                                                                    onClick={() => handleAddItem({ ...item, price: discountedPrice })}
                                                                                                >
                                                                                                    +
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Order Summary with Checklist */}
                        <div className="modal-right">
                            <div className="order-summary-card">
                                <h3>Confirmar Orden</h3>
                                {selectedItems.length === 0 ? (
                                    <div className="empty-cart">
                                        <p>Selecciona items del menú</p>
                                    </div>
                                ) : (
                                    <div className="cart-items checklist-container">
                                        <div className="checklist-header">
                                            <p className="helper-text">Verifica cada artículo:</p>
                                            <label className="select-all-label">
                                                <input
                                                    type="checkbox"
                                                    checked={isAllConfirmed && explodedItems.length > 0}
                                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                                />
                                                <span>Marcar Todo</span>
                                            </label>
                                        </div>
                                        <div className="checklist-scroll">
                                            {explodedItems.map((item, index) => (
                                                <div key={item.id} className={`checklist-row ${item.checked ? 'checked' : ''}`}>
                                                    <div className="checklist-main">
                                                        <label>
                                                            <input
                                                                type="checkbox"
                                                                checked={item.checked}
                                                                onChange={() => {
                                                                    const newChecks = { ...confirmationChecks };
                                                                    newChecks[item.id] = !newChecks[item.id];
                                                                    setConfirmationChecks(newChecks);
                                                                }}
                                                            />
                                                            <span className="item-name-summary">{item.name}</span>
                                                        </label>
                                                        <div className="cart-qty-row">
                                                            <button
                                                                type="button"
                                                                className="qty-btn"
                                                                onClick={() => handleQuantityChange(index, -1)}
                                                                aria-label="Reducir cantidad"
                                                            >−</button>
                                                            <span className="qty-value">×{selectedItems[index]?.quantity || 1}</span>
                                                            <button
                                                                type="button"
                                                                className="qty-btn"
                                                                onClick={() => handleQuantityChange(index, 1)}
                                                                aria-label="Aumentar cantidad"
                                                            >+</button>
                                                        </div>
                                                        <div className="item-note-row">
                                                            <span className="note-label">Nota:</span>
                                                            <input
                                                                type="text"
                                                                className="item-note-input"
                                                                placeholder="ej. sin catsup, término medio..."
                                                                value={item.note}
                                                                onChange={(e) => handleNoteChange(index, e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="remove-mini-icon"
                                                        onClick={() => handleQuantityChange(index, -selectedItems[index]?.quantity || -1)}
                                                        aria-label={`Eliminar ${item.name}`}
                                                    >
                                                        🗑
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="cart-footer">
                                    <div className="cart-total">
                                        <span>Total</span>
                                        <span className="amount">${total.toFixed(2)}</span>
                                    </div>

                                    {initialOrder && onCancel && (
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-block mb-2"
                                            style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#ef4444' }}
                                            onClick={() => {
                                                onCancel(initialOrder.id);
                                                onClose();
                                            }}
                                        >
                                            Cancelar Orden
                                        </button>
                                    )}

                                    {isAdditionMode && initialOrder?.items && (
                                        <div style={{ marginBottom: '12px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <p style={{ margin: '0 0 6px', fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)' }}>
                                                Artículos actuales en la orden:
                                            </p>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-primary, #e2e8f0)' }}>
                                                {initialOrder.items}
                                            </p>
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        className={`btn btn-primary btn-block btn-lg ${submitting ? 'btn-loading' : ''}`}
                                        disabled={submitting || (
                                            isAdditionMode
                                                ? (selectedItems.length === 0 || !isAllConfirmed)
                                                : ((orderMode === 'table' ? !tableNumber : !customerName.trim()) ||
                                                    selectedItems.length === 0 ||
                                                    !isAllConfirmed)
                                        )}
                                        style={{
                                            opacity: (submitting || (
                                                isAdditionMode
                                                    ? (selectedItems.length === 0 || !isAllConfirmed)
                                                    : ((orderMode === 'table' ? !tableNumber : !customerName.trim()) ||
                                                        selectedItems.length === 0 ||
                                                        !isAllConfirmed)
                                            )) ? 0.6 : 1
                                        }}
                                    >
                                        {submitting && <span className="btn-spinner" aria-hidden="true" />}
                                        {submitting
                                            ? 'Enviando...'
                                            : isAdditionMode
                                                ? (isAllConfirmed ? 'Agregar a Orden' : 'Verifica Artículos')
                                                : initialOrder
                                                    ? 'Guardar Cambios'
                                                    : (isAllConfirmed ? 'Crear Orden' : 'Verifica Artículos')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default NewOrderModal;
