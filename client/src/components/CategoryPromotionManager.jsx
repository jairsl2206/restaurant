import { useState, useEffect } from 'react';
import './CategoryPromotionManager.css';
import API_BASE_URL from '../config';

const CATEGORY_API_URL = API_BASE_URL + '/promotions';
const MENU_API_URL = API_BASE_URL + '/menu';

function CategoryPromotionManager() {
    // Helper for auth headers
    const getAuthHeaders = (extraHeaders = {}) => {
        const token = localStorage.getItem('token');
        return {
            ...extraHeaders,
            'Authorization': token ? `Bearer ${token}` : '',
            'x-role': 'admin' // Keep for legacy if needed, but Bearer is primary in v2
        };
    };
    const [activePromoTab, setActivePromoTab] = useState('category'); // 'category' or 'item'
    const [categoryPromotions, setCategoryPromotions] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);
    const [modalType, setModalType] = useState('category'); // 'category' or 'item'

    const [formData, setFormData] = useState({
        category: '',
        item_id: '',
        promotionType: 'percentage',
        promotionValue: '',
        active: true
    });

    // Filters for item selection in modal
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemCategoryFilter, setItemCategoryFilter] = useState('');

    useEffect(() => {
        fetchCategoryPromotions();
        fetchMenuItems();
    }, []);

    const fetchCategoryPromotions = async () => {
        try {
            const res = await fetch(CATEGORY_API_URL, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            setCategoryPromotions(data);
        } catch (err) {
            console.error('Error fetching category promotions:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMenuItems = async () => {
        try {
            const res = await fetch(MENU_API_URL, {
                headers: getAuthHeaders()
            });
            const data = await res.json();
            setMenuItems(data);
        } catch (err) {
            console.error('Error fetching menu items:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (modalType === 'category') {
            // Handle category promotion
            const method = editingPromo ? 'PUT' : 'POST';
            const url = editingPromo ? `${CATEGORY_API_URL}/${editingPromo.id}` : CATEGORY_API_URL;

            const payload = {
                category: formData.category,
                promotionType: formData.promotionType,
                promotionValue: formData.promotionType === '3x2' ? 0 : parseFloat(formData.promotionValue),
                active: formData.active
            };

            try {
                const res = await fetch(url, {
                    method,
                    headers: getAuthHeaders({
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    fetchCategoryPromotions();
                    closeModal();
                } else {
                    alert('Error al guardar');
                }
            } catch (err) {
                console.error('Error saving category promotion:', err);
            }
        } else {
            // Handle item promotion
            const item = menuItems.find(i => i.id === parseInt(formData.item_id));
            if (!item) return;

            const payload = {
                id: item.id,
                promotionType: formData.promotionType,
                promotionValue: formData.promotionType === '3x2' ? 0 : parseFloat(formData.promotionValue),
                promotionActive: formData.active
            };

            try {
                const res = await fetch(`${MENU_API_URL}/${item.id}`, {
                    method: 'PUT',
                    headers: getAuthHeaders({
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    fetchMenuItems();
                    closeModal();
                } else {
                    alert('Error al guardar');
                }
            } catch (err) {
                console.error('Error saving item promotion:', err);
            }
        }
    };

    const handleDeleteCategoryPromo = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar esta promoción?')) return;

        try {
            const res = await fetch(`${CATEGORY_API_URL}/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (res.ok) fetchCategoryPromotions();
        } catch (err) {
            console.error('Error deleting promotion:', err);
        }
    };

    const handleRemoveItemPromo = async (item) => {
        if (!confirm('¿Seguro que deseas eliminar esta promoción?')) return;

        const payload = {
            id: item.id,
            promotionType: null,
            promotionValue: 0,
            promotionActive: false
        };

        try {
            const res = await fetch(`${MENU_API_URL}/${item.id}`, {
                method: 'PUT',
                headers: getAuthHeaders({
                    'Content-Type': 'application/json'
                }),
                body: JSON.stringify(payload)
            });
            if (res.ok) fetchMenuItems();
        } catch (err) {
            console.error('Error removing item promotion:', err);
        }
    };

    const openModal = (type, promo = null) => {
        setModalType(type);

        if (type === 'category') {
            if (promo) {
                setEditingPromo(promo);
                setFormData({
                    category: promo.category,
                    item_id: '',
                    promotionType: promo.promotionType,
                    promotionValue: promo.promotionValue,
                    active: Boolean(promo.active)
                });
            } else {
                setEditingPromo(null);
                setFormData({
                    category: '',
                    item_id: '',
                    promotionType: 'percentage',
                    promotionValue: '',
                    active: true
                });
            }
        } else {
            // Item promotion
            if (promo) {
                setEditingPromo(promo);
                setFormData({
                    category: '',
                    item_id: promo.id.toString(),
                    promotionType: promo.promotionType || 'percentage',
                    promotionValue: promo.promotionValue || '',
                    active: Boolean(promo.promotionActive)
                });
            } else {
                setEditingPromo(null);
                setFormData({
                    category: '',
                    item_id: '',
                    promotionType: 'percentage',
                    promotionValue: '',
                    active: true
                });
            }
        }
        setItemSearchQuery('');
        setItemCategoryFilter('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPromo(null);
        setItemSearchQuery('');
        setItemCategoryFilter('');
    };

    // Get unique categories from menu items
    const categories = [...new Set(menuItems.map(item => item.category).filter(Boolean))].sort();

    // Filter items for item promotion modal
    const filteredMenuItems = menuItems.filter(item => {
        const matchesCategory = !itemCategoryFilter || item.category === itemCategoryFilter;
        const matchesSearch = !itemSearchQuery ||
            item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
            (item.category && item.category.toLowerCase().includes(itemSearchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    // Get items affected by category promotion
    const getAffectedItems = (category) => {
        return menuItems.filter(item =>
            item.category === category && !item.promotionActive
        );
    };

    // Get items with active promotions
    const itemsWithPromotions = menuItems.filter(item => item.promotionActive);

    // Get selected item for preview
    const selectedItem = formData.item_id ? menuItems.find(i => i.id === parseInt(formData.item_id)) : null;

    return (
        <div className="category-promo-manager">
            <div className="manager-content">
                <div className="manager-header">
                    <h2>🔥 Gestión de Promociones</h2>
                </div>

                {/* Tabs for Category vs Item promotions */}
                <div className="promo-tabs">
                    <button
                        className={`promo-tab-btn ${activePromoTab === 'category' ? 'active' : ''}`}
                        onClick={() => setActivePromoTab('category')}
                    >
                        <span className="tab-icon">🏷️</span>
                        <span>Por Categoría</span>
                    </button>
                    <button
                        className={`promo-tab-btn ${activePromoTab === 'item' ? 'active' : ''}`}
                        onClick={() => setActivePromoTab('item')}
                    >
                        <span className="tab-icon">🍔</span>
                        <span>Por Artículo</span>
                    </button>
                </div>

                {activePromoTab === 'category' ? (
                    <>
                        <div className="promo-section-header">
                            <div className="promo-info-banner">
                                <span className="info-icon">ℹ️</span>
                                <p>Las promociones de categoría se aplican a todos los artículos de esa categoría que no tengan una promoción individual activa.</p>
                            </div>
                            <button className="btn btn-primary" onClick={() => openModal('category')}>
                                + Agregar Promoción de Categoría
                            </button>
                        </div>

                        {loading ? <p>Cargando...</p> : (
                            <div className="promo-grid">
                                {categoryPromotions.length === 0 ? (
                                    <div className="empty-state">
                                        <span className="empty-icon">📢</span>
                                        <h3>No hay promociones de categoría</h3>
                                        <p>Crea una promoción para aplicar descuentos a toda una categoría</p>
                                    </div>
                                ) : (
                                    categoryPromotions.map(promo => {
                                        const affectedItems = getAffectedItems(promo.category);
                                        return (
                                            <div key={promo.id} className={`promo-card ${!promo.active ? 'inactive' : ''}`}>
                                                <div className="promo-card-header">
                                                    <div className="promo-category">
                                                        <span className="category-badge">{promo.category}</span>
                                                        {!promo.active && <span className="inactive-badge">Inactiva</span>}
                                                    </div>
                                                    <div className="promo-actions">
                                                        <button className="action-btn edit-btn" onClick={() => openModal('category', promo)}>✏️</button>
                                                        <button className="action-btn delete-btn" onClick={() => handleDeleteCategoryPromo(promo.id)}>🗑️</button>
                                                    </div>
                                                </div>
                                                <div className="promo-card-body">
                                                    <div className="promo-discount">
                                                        <span className="discount-value">
                                                            {promo.promotionType === 'percentage'
                                                                ? `${promo.promotionValue}% OFF`
                                                                : promo.promotionType === '3x2'
                                                                    ? '3x2'
                                                                    : `$${promo.promotionValue} OFF`
                                                            }
                                                        </span>
                                                        <span className="discount-type">
                                                            {promo.promotionType === 'percentage'
                                                                ? 'Descuento porcentual'
                                                                : promo.promotionType === '3x2'
                                                                    ? 'Compra 3, Paga 2'
                                                                    : 'Descuento fijo'}
                                                        </span>
                                                    </div>
                                                    <div className="affected-items">
                                                        <strong>{affectedItems.length}</strong> artículo{affectedItems.length !== 1 ? 's' : ''} afectado{affectedItems.length !== 1 ? 's' : ''}
                                                        {affectedItems.length > 0 && (
                                                            <div className="items-list">
                                                                {affectedItems.slice(0, 3).map(item => (
                                                                    <span key={item.id} className="item-name">{item.name}</span>
                                                                ))}
                                                                {affectedItems.length > 3 && (
                                                                    <span className="more-items">+{affectedItems.length - 3} más</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="promo-section-header">
                            <div className="promo-info-banner">
                                <span className="info-icon">ℹ️</span>
                                <p>Las promociones por artículo tienen prioridad sobre las promociones de categoría.</p>
                            </div>
                            <button className="btn btn-primary" onClick={() => openModal('item')}>
                                + Agregar Promoción de Artículo
                            </button>
                        </div>

                        {loading ? <p>Cargando...</p> : (
                            <div className="promo-grid">
                                {itemsWithPromotions.length === 0 ? (
                                    <div className="empty-state">
                                        <span className="empty-icon">🍔</span>
                                        <h3>No hay promociones por artículo</h3>
                                        <p>Crea una promoción para aplicar descuentos a artículos específicos</p>
                                    </div>
                                ) : (
                                    itemsWithPromotions.map(item => {
                                        const finalPrice = item.promotionType === 'percentage'
                                            ? item.price * (1 - item.promotionValue / 100)
                                            : Math.max(0, item.price - item.promotionValue);

                                        return (
                                            <div key={item.id} className="promo-card">
                                                <div className="promo-card-header">
                                                    <div className="promo-category">
                                                        <span className="item-badge">{item.name}</span>
                                                        <span className="category-tag">{item.category}</span>
                                                    </div>
                                                    <div className="promo-actions">
                                                        <button className="action-btn edit-btn" onClick={() => openModal('item', item)}>✏️</button>
                                                        <button className="action-btn delete-btn" onClick={() => handleRemoveItemPromo(item)}>🗑️</button>
                                                    </div>
                                                </div>
                                                <div className="promo-card-body">
                                                    <div className="promo-discount">
                                                        <span className="discount-value">
                                                            {item.promotionType === 'percentage'
                                                                ? `${item.promotionValue}% OFF`
                                                                : `$${item.promotionValue} OFF`
                                                            }
                                                        </span>
                                                        <span className="discount-type">
                                                            {item.promotionType === 'percentage' ? 'Descuento porcentual' : 'Descuento fijo'}
                                                        </span>
                                                    </div>
                                                    <div className="price-display">
                                                        <span className="original-price">${item.price.toFixed(2)}</span>
                                                        <span className="arrow">→</span>
                                                        <span className="final-price">${finalPrice.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <form
                        onSubmit={handleSubmit}
                        className="modal-content glass-card slide-in"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>
                                {modalType === 'category'
                                    ? (editingPromo ? 'Editar Promoción de Categoría' : 'Nueva Promoción de Categoría')
                                    : (editingPromo ? 'Editar Promoción de Artículo' : 'Nueva Promoción de Artículo')
                                }
                            </h3>
                            <button type="button" className="close-btn" onClick={closeModal}>×</button>
                        </div>
                        <div className="modal-body">
                            {modalType === 'category' ? (
                                <div className="form-group">
                                    <label>Categoría</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        required
                                    >
                                        <option value="">Seleccionar categoría...</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <>
                                    {/* Search and Filter for Items */}
                                    {!editingPromo && (
                                        <div className="item-filters">
                                            <div className="form-group">
                                                <label>🔍 Buscar Artículo</label>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar por nombre o categoría..."
                                                    value={itemSearchQuery}
                                                    onChange={e => setItemSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>🏷️ Filtrar por Categoría</label>
                                                <select
                                                    value={itemCategoryFilter}
                                                    onChange={e => setItemCategoryFilter(e.target.value)}
                                                >
                                                    <option value="">Todas las categorías</option>
                                                    {categories.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Artículo</label>
                                        <select
                                            value={formData.item_id}
                                            onChange={e => setFormData({ ...formData, item_id: e.target.value })}
                                            required
                                            disabled={editingPromo}
                                        >
                                            <option value="">Seleccionar artículo...</option>
                                            {filteredMenuItems.map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} - ${item.price} ({item.category})
                                                </option>
                                            ))}
                                        </select>
                                        {!editingPromo && filteredMenuItems.length === 0 && (
                                            <small className="no-results">No se encontraron artículos</small>
                                        )}
                                        {!editingPromo && filteredMenuItems.length > 0 && (
                                            <small className="results-count">{filteredMenuItems.length} artículo(s) encontrado(s)</small>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Tipo de Descuento</label>
                                    <select
                                        value={formData.promotionType}
                                        onChange={e => setFormData({ ...formData, promotionType: e.target.value })}
                                        required
                                    >
                                        <option value="percentage">Porcentaje (%)</option>
                                        <option value="fixed">Monto Fijo ($)</option>
                                        <option value="3x2">3x2 (Lleva 3, Paga 2)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>
                                        {formData.promotionType === 'percentage' ? 'Porcentaje (%)' : formData.promotionType === '3x2' ? 'Valor (No requerido)' : 'Descuento ($)'}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={formData.promotionType === 'percentage' ? '100' : undefined}
                                        value={formData.promotionType === '3x2' ? '0' : formData.promotionValue}
                                        onChange={e => setFormData({ ...formData, promotionValue: e.target.value })}
                                        placeholder={formData.promotionType === 'percentage' ? '20' : formData.promotionType === '3x2' ? 'N/A' : '10'}
                                        required={formData.promotionType !== '3x2'}
                                        disabled={formData.promotionType === '3x2'}
                                    />
                                </div>
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.active}
                                        style={{ width: 'auto' }}
                                        onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                    />
                                    Promoción activa
                                </label>
                            </div>

                            {modalType === 'category' && formData.category && (
                                <div className="preview-info">
                                    <strong>Vista Previa:</strong>
                                    <p>Esta promoción se aplicará a {getAffectedItems(formData.category).length} artículo(s) en la categoría "{formData.category}"</p>
                                    {formData.promotionType === '3x2' && (
                                        <p className="promo-desc">🎁 <strong>3x2 Activo:</strong> Al pedir 3 artículos de esta categoría, el más barato será gratuito.</p>
                                    )}
                                </div>
                            )}

                            {modalType === 'item' && selectedItem && formData.promotionValue && (
                                <div className="preview-info">
                                    <strong>Vista Previa:</strong>
                                    <div className="price-preview">
                                        <span className="original-price">${selectedItem.price.toFixed(2)}</span>
                                        <span className="promo-price">
                                            ${formData.promotionType === 'percentage'
                                                ? (selectedItem.price * (1 - parseFloat(formData.promotionValue) / 100)).toFixed(2)
                                                : Math.max(0, selectedItem.price - parseFloat(formData.promotionValue)).toFixed(2)
                                            }
                                        </span>
                                        <span className="savings">
                                            Ahorro: ${formData.promotionType === 'percentage'
                                                ? (selectedItem.price * parseFloat(formData.promotionValue) / 100).toFixed(2)
                                                : parseFloat(formData.promotionValue).toFixed(2)
                                            }
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">{editingPromo ? 'Guardar Cambios' : 'Crear Promoción'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default CategoryPromotionManager;
