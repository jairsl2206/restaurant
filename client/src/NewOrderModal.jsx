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

    // Reset checks when items change
    useEffect(() => {
        setConfirmationChecks({});
    }, [selectedItems, tableNumber]);

    const parseInitialItems = (itemsString, menu) => {
        if (!itemsString) return [];
        const parts = itemsString.split(/,\s*/);
        const parsed = [];

        parts.forEach(part => {
            const match = part.match(/(.+) x(\d+)$/);
            if (match) {
                const name = match[1].trim();
                const quantity = parseInt(match[2], 10);
                const menuItem = menu.find(m => m.name === name);
                parsed.push({
                    id: menuItem ? menuItem.id : Date.now(),
                    name: name,
                    quantity: quantity,
                    price: menuItem ? menuItem.price : 0,
                    image_url: menuItem ? menuItem.image_url : null
                });
            } else {
                // Try to match exact name if no quantity format (fallback)
                const name = part.trim();
                const menuItem = menu.find(m => m.name === name);
                if (menuItem) {
                    parsed.push({
                        id: menuItem.id,
                        name: name,
                        quantity: 1,
                        price: menuItem.price,
                        image_url: menuItem.image_url
                    });
                }
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
                }
            })
            .catch(err => {
                console.error('Error fetching menu:', err);
                setLoading(false);
            });
    }, [initialOrder]);

    const handleAddItem = (item) => {
        const existing = selectedItems.find(i => i.name === item.name);
        if (existing) {
            setSelectedItems(selectedItems.map(i =>
                i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i
            ));
        } else {
            setSelectedItems([...selectedItems, { ...item, quantity: 1 }]);
        }
    };

    const handleRemoveItem = (itemName) => {
        setSelectedItems(selectedItems.filter(i => i.name !== itemName));
    };

    const handleQuantityChange = (itemName, delta) => {
        setSelectedItems(selectedItems.map(i => {
            if (i.name === itemName) {
                return { ...i, quantity: i.quantity + delta };
            }
            return i;
        }).filter(i => i.quantity > 0));
    };

    const total = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Explode items for checklist and validation
    const explodedItems = [];
    let idx = 0;
    selectedItems.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
            const currentId = idx;
            explodedItems.push({
                id: currentId,
                name: item.name,
                parentName: item.name,
                checked: !!confirmationChecks[currentId]
            });
            idx++;
        }
    });

    const isAllConfirmed = explodedItems.length > 0 && explodedItems.every(item => item.checked);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (tableNumber && selectedItems.length > 0 && isAllConfirmed) {
            onSubmit({
                tableNumber: parseInt(tableNumber),
                items: selectedItems
            });
        }
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
                                <h3>1. Selecciona Mesa</h3>
                            </div>
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

                            <div className="section-header mt-3">
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
                                                                                    category === 'Entrada' ? '🥗' : '🍽️'}
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
                                                                            {groupedItems[category].map(item => (
                                                                                <button
                                                                                    key={item.id}
                                                                                    type="button"
                                                                                    className="menu-item glass-card"
                                                                                    onClick={() => handleAddItem(item)}
                                                                                >
                                                                                    <div className="item-icon">
                                                                                        {item.image_url ? (
                                                                                            <img src={item.image_url} alt={item.name} className="menu-thumb-mini" />
                                                                                        ) : '🍽️'}
                                                                                    </div>
                                                                                    <div className="item-details">
                                                                                        <span className="item-name">{item.name}</span>
                                                                                        <span className="item-price">${item.price.toFixed(2)}</span>
                                                                                    </div>
                                                                                    <div className="add-icon">+</div>
                                                                                </button>
                                                                            ))}
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
                                        <p className="helper-text">Verifica cada artículo:</p>
                                        <div className="checklist-scroll">
                                            {explodedItems.map((item) => (
                                                <div key={item.id} className={`checklist-row ${item.checked ? 'checked' : ''}`}>
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
                                                        <span>{item.name}</span>
                                                    </label>
                                                    <button
                                                        type="button"
                                                        className="remove-mini-icon"
                                                        onClick={() => {
                                                            handleQuantityChange(item.parentName, -1);
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
                                        disabled={!tableNumber || selectedItems.length === 0 || !isAllConfirmed}
                                        style={{ opacity: (!tableNumber || selectedItems.length === 0 || !isAllConfirmed) ? 0.6 : 1 }}
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
