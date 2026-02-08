import { useState, useEffect } from 'react';
import './NewOrderModal.css';
import API_BASE_URL from './config';

// Menu items will be fetched from API
const API_MENU_URL = API_BASE_URL + '/menu';
const API_SETTINGS_URL = API_BASE_URL + '/settings';

function NewOrderModal({ onClose, onSubmit, initialOrder = null, onCancel }) {
    const [tableNumber, setTableNumber] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmationChecks, setConfirmationChecks] = useState({});
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [maxTables, setMaxTables] = useState(20); // Default value

    // Delivery mode states
    const [isDelivery, setIsDelivery] = useState(false);
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
    }, [tableNumber, isDelivery]);

    const parseInitialItems = (itemsString, menu) => {
        if (!itemsString) return [];
        const parts = itemsString.split(/,\s*(?![^(]*\))/);
        const parsed = [];

        parts.forEach(part => {
            // Remove [Price] suffix if exists
            const priceMatch = part.match(/(.+) \[(\d+\.?\d*)\]$/);
            let content = part;
            let itemPrice = 0;
            if (priceMatch) {
                content = priceMatch[1].trim();
                itemPrice = parseFloat(priceMatch[2]);
            }

            const match = content.match(/(.+) x(\d+)$/);
            if (match) {
                let nameWithNote = match[1].trim();
                const quantity = parseInt(match[2], 10);

                // Extract note if exists: "Name (Note)" or "Name(Note)"
                const noteMatch = nameWithNote.match(/(.+?)\s*?\((.+)\)$/);
                let name = nameWithNote;
                let note = '';
                if (noteMatch) {
                    name = noteMatch[1].trim();
                    note = noteMatch[2].trim();
                }

                const menuItem = menu.find(m => m.name === name);
                parsed.push({
                    uid: `item_${Date.now()}_${Math.random()}`,
                    id: menuItem ? menuItem.id : `legacy_${Date.now()}_${Math.random()}`,
                    name: name,
                    note: note,
                    quantity: quantity,
                    price: menuItem ? menuItem.price : itemPrice,
                    image_url: menuItem ? menuItem.image_url : null
                });
            } else {
                let nameWithNote = content.trim();
                const noteMatch = nameWithNote.match(/(.+?)\s*?\((.+)\)$/);
                let name = nameWithNote;
                let note = '';
                if (noteMatch) {
                    name = noteMatch[1].trim();
                    note = noteMatch[2].trim();
                }

                const menuItem = menu.find(m => m.name === name);
                parsed.push({
                    uid: `item_${Date.now()}_${Math.random()}`,
                    id: menuItem ? menuItem.id : `legacy_${Date.now()}_${Math.random()}`,
                    name: name,
                    note: note,
                    quantity: 1,
                    price: menuItem ? menuItem.price : itemPrice,
                    image_url: menuItem ? menuItem.image_url : null
                });
            }
        });
        return parsed;
    };

    useEffect(() => {
        fetch(API_MENU_URL)
            .then(res => res.json())
            .then(data => {
                const available = data.filter(item => item.available);
                setMenuItems(available);
                setLoading(false);

                if (initialOrder && initialOrder.items) {
                    setTableNumber(initialOrder.table_number);
                    const parsed = parseInitialItems(initialOrder.items, available);
                    setSelectedItems(parsed);

                    // Set delivery state and customer info
                    if (initialOrder.is_delivery) {
                        setIsDelivery(true);
                        setCustomerName(initialOrder.customer_name || '');
                        setCustomerPhone(initialOrder.customer_phone || '');
                        setCustomerAddress(initialOrder.customer_address || '');
                    } else {
                        setIsDelivery(false);
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

    const total = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // For the checklist, we use selectedItems directly since we now keep them separate if they have notes
    const explodedItems = selectedItems.map((item) => ({
        id: item.uid,
        name: item.name,
        note: item.note || '',
        checked: !!confirmationChecks[item.uid]
    }));

    const isAllConfirmed = explodedItems.length > 0 && explodedItems.every(item => item.checked);

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate based on mode
        if (isDelivery) {
            const trimmedName = customerName.trim();
            const trimmedPhone = customerPhone.trim();
            const trimmedAddress = customerAddress.trim();

            if (!trimmedName || !trimmedPhone || !trimmedAddress) {
                alert('Por favor completa todos los campos del cliente para delivery');
                return;
            }
        } else {
            if (!tableNumber) {
                alert('Por favor selecciona una mesa');
                return;
            }
        }

        if (selectedItems.length === 0) {
            alert('Por favor selecciona al menos un platillo');
            return;
        }

        if (!isAllConfirmed) {
            alert('Por favor verifica todos los artículos');
            return;
        }

        // Formatting items: "Name (Note)"
        const formattedItems = selectedItems.map(item => ({
            ...item,
            name: item.note ? `${item.name} (${item.note})` : item.name
        }));

        onSubmit({
            tableNumber: isDelivery ? null : parseInt(tableNumber),
            items: formattedItems,
            isDelivery: isDelivery,
            customerData: isDelivery ? {
                name: customerName.trim(),
                phone: customerPhone.trim(),
                address: customerAddress.trim()
            } : null
        });
    };

    // Generate table numbers array based on maxTables
    const tableNumbers = Array.from({ length: maxTables }, (_, i) => i + 1);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{initialOrder ? `Editar Orden #${initialOrder.id}` : 'Nueva Orden'}</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="modal-body-grid">
                        {/* Left Column: Menu & Tables */}
                        <div className="modal-left">
                            <div className="section-header">
                                <h3>1. Selecciona {isDelivery ? 'Delivery' : 'Mesa'}</h3>
                            </div>

                            {/* Delivery Toggle */}
                            <div className="delivery-toggle" style={{ marginBottom: '18px', display: 'flex', gap: '10px' }}>
                                <button
                                    type="button"
                                    className={`table-btn ${!isDelivery ? 'selected' : ''}`}
                                    onClick={() => {
                                        setIsDelivery(false);
                                        setTableNumber('');
                                    }}
                                    style={{ flex: 1 }}
                                >
                                    🪑 Mesas
                                </button>
                                <button
                                    type="button"
                                    className={`table-btn ${isDelivery ? 'selected' : ''}`}
                                    onClick={() => {
                                        setIsDelivery(true);
                                        setTableNumber('');
                                    }}
                                    style={{ flex: 1 }}
                                >
                                    🚗 Delivery
                                </button>
                            </div>

                            {/* Table Grid or Customer Form */}
                            {!isDelivery ? (
                                <div className="table-grid">
                                    {tableNumbers.map(num => (
                                        <button
                                            key={num}
                                            type="button"
                                            className={`table-btn ${parseInt(tableNumber) === num ? 'selected' : ''}`}
                                            onClick={() => setTableNumber(num)}
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
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'rgba(255,255,255,0.05)',
                                                color: 'white',
                                                fontSize: '0.9rem'
                                            }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ display: 'block', color: 'var(--text-secondary)' }}>
                                            Teléfono *
                                        </label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            placeholder="Ej: 5512345678"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'rgba(255,255,255,0.05)',
                                                color: 'white',
                                                fontSize: '0.9rem'
                                            }}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ display: 'block', color: 'var(--text-secondary)' }}>
                                            Dirección *
                                        </label>
                                        <textarea
                                            className="form-input"
                                            placeholder="Ej: Calle 123, Col. Centro"
                                            value={customerAddress}
                                            onChange={(e) => setCustomerAddress(e.target.value)}
                                            rows="2"
                                            style={{
                                                width: '100%',
                                                padding: '6px 10px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'rgba(255,255,255,0.05)',
                                                color: 'white',
                                                fontSize: '0.9rem',
                                                resize: 'none',
                                                fontFamily: 'inherit',
                                                minHeight: '45px'
                                            }}
                                        />
                                    </div>
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

                                            // Helper to calculate discounted price
                                            const getDiscountedPrice = (item) => {
                                                if (!item.promotion_active) return item.price;
                                                if (item.promotion_type === 'percentage') {
                                                    return item.price * (1 - (item.promotion_value / 100));
                                                } else if (item.promotion_type === 'fixed') {
                                                    return Math.max(0, item.price - item.promotion_value);
                                                }
                                                return item.price;
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
                                                                                const discountedPrice = getDiscountedPrice(item);
                                                                                const hasPromo = item.promotion_active;

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
                                                                                                    {item.promotion_type === 'percentage' ? `-${item.promotion_value}%` : `-$${item.promotion_value}`}
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
                                                                                                    {!!hasPromo && <span className="old-price">${item.price.toFixed(2)}</span>}
                                                                                                    <span className="current-price">${discountedPrice.toFixed(2)}</span>
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
                                                        onClick={() => {
                                                            handleQuantityChange(index, -1);
                                                        }}
                                                    >
                                                        ×
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
                                            style={{ backgroundColor: '#e74c3c', color: 'white' }}
                                            onClick={() => {
                                                if (window.confirm('¿Seguro que deseas cancelar esta orden?')) {
                                                    onCancel(initialOrder.id);
                                                    onClose();
                                                }
                                            }}
                                        >
                                            Cancelar Orden
                                        </button>
                                    )}

                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-block btn-lg"
                                        disabled={
                                            (isDelivery ? (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) : !tableNumber) ||
                                            selectedItems.length === 0 ||
                                            !isAllConfirmed
                                        }
                                        style={{
                                            opacity: (
                                                (isDelivery ? (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) : !tableNumber) ||
                                                selectedItems.length === 0 ||
                                                !isAllConfirmed
                                            ) ? 0.6 : 1
                                        }}
                                    >
                                        {initialOrder ? 'Guardar Cambios' : (isAllConfirmed ? 'Crear Orden' : 'Verifica Artículos')}
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
