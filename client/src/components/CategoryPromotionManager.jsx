import { useState, useEffect } from 'react';
import './CategoryPromotionManager.css';
import API_BASE_URL from '../config';

const CATEGORY_PROMOS_URL = API_BASE_URL + '/category-promotions';
const ITEM_PROMOS_URL = API_BASE_URL + '/item-promotions';
const MENU_API_URL = API_BASE_URL + '/menu';
const CATEGORIES_API_URL = API_BASE_URL + '/categories';

function CategoryPromotionManager() {
    const [activePromoTab, setActivePromoTab] = useState('category'); // 'category' or 'item'
    const [categoryPromotions, setCategoryPromotions] = useState([]);
    const [itemPromotions, setItemPromotions] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);
    const [modalType, setModalType] = useState('category'); // 'category' or 'item'

    const [formData, setFormData] = useState({
        category_id: '',
        menu_item_id: '',
        type: 'PERCENTAGE',
        value: '',
        active: true
    });

    // Filters for item selection in modal
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [itemCategoryFilter, setItemCategoryFilter] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [catPromosRes, itemPromosRes, menuRes, catsRes] = await Promise.all([
                fetch(CATEGORY_PROMOS_URL, { headers: { 'x-role': 'admin' } }),
                fetch(ITEM_PROMOS_URL, { headers: { 'x-role': 'admin' } }),
                fetch(MENU_API_URL),
                fetch(CATEGORIES_API_URL)
            ]);
            
            setCategoryPromotions(await catPromosRes.json());
            setItemPromotions(await itemPromosRes.json());
            setMenuItems(await menuRes.json());
            setCategories(await catsRes.json());
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const isCategory = modalType === 'category';
        const method = editingPromo ? 'PUT' : 'POST';
        const baseUrl = isCategory ? CATEGORY_PROMOS_URL : ITEM_PROMOS_URL;
        const url = editingPromo ? `${baseUrl}/${editingPromo.id}` : baseUrl;

        const payload = {
            type: formData.type,
            value: parseFloat(formData.value),
            active: formData.active
        };

        if (isCategory) {
            payload.category_id = parseInt(formData.category_id);
        } else {
            payload.menu_item_id = parseInt(formData.menu_item_id);
        }

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-role': 'admin'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                fetchData();
                closeModal();
            } else {
                alert('Error al guardar promoción');
            }
        } catch (err) {
            console.error('Error saving promotion:', err);
        }
    };

    const handleDeletePromo = async (id, isCategory) => {
        if (!confirm('¿Seguro que deseas eliminar esta promoción?')) return;

        const url = isCategory ? `${CATEGORY_PROMOS_URL}/${id}` : `${ITEM_PROMOS_URL}/${id}`;

        try {
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 'x-role': 'admin' }
            });
            if (res.ok) fetchData();
        } catch (err) {
            console.error('Error deleting promotion:', err);
        }
    };

    const openModal = (type, promo = null) => {
        setModalType(type);
        setEditingPromo(promo);

        if (promo) {
            setFormData({
                category_id: type === 'category' ? promo.category_id : '',
                menu_item_id: type === 'item' ? promo.menu_item_id : '',
                type: promo.type,
                value: promo.value,
                active: Boolean(promo.active)
            });
        } else {
            setFormData({
                category_id: '',
                menu_item_id: '',
                type: 'PERCENTAGE',
                value: '',
                active: true
            });
        }
        
        setItemSearchQuery('');
        setItemCategoryFilter('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPromo(null);
    };

    const filteredMenuItems = menuItems.filter(item => {
        const matchesCategory = !itemCategoryFilter || item.category_id === parseInt(itemCategoryFilter);
        const matchesSearch = !itemSearchQuery ||
            item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
            (item.category && item.category.toLowerCase().includes(itemSearchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const getAffectedItemsForCategoryPromo = (categoryId) => {
        // Items in category that do not have their own active item promotion.
        return menuItems.filter(item => 
            item.category_id === categoryId && 
            !itemPromotions.some(ip => ip.menu_item_id === item.id && ip.active)
        );
    };

    const selectedItem = formData.menu_item_id ? menuItems.find(i => i.id === parseInt(formData.menu_item_id)) : null;

    return (
        <div className="category-promo-manager">
            <div className="manager-content">
                <div className="manager-header">
                    <h2>🔥 Gestión de Promociones</h2>
                </div>

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
                                        const affectedItems = getAffectedItemsForCategoryPromo(promo.category_id);
                                        const category = categories.find(c => c.id === promo.category_id);
                                        
                                        return (
                                            <div key={promo.id} className={`promo-card ${!promo.active ? 'inactive' : ''}`}>
                                                <div className="promo-card-header">
                                                    <div className="promo-category">
                                                        <span className="category-badge">{category ? category.name : `ID: ${promo.category_id}`}</span>
                                                        {!promo.active && <span className="inactive-badge">Inactiva</span>}
                                                    </div>
                                                    <div className="promo-actions">
                                                        <button className="action-btn edit-btn" onClick={() => openModal('category', promo)}>✏️</button>
                                                        <button className="action-btn delete-btn" onClick={() => handleDeletePromo(promo.id, true)}>🗑️</button>
                                                    </div>
                                                </div>
                                                <div className="promo-card-body">
                                                    <div className="promo-discount">
                                                        <span className="discount-value">
                                                            {promo.type === 'PERCENTAGE'
                                                                ? `${promo.value}% OFF`
                                                                : `$${promo.value} OFF`
                                                            }
                                                        </span>
                                                        <span className="discount-type">
                                                            {promo.type === 'PERCENTAGE' ? 'Descuento porcentual' : 'Descuento fijo'}
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
                                {itemPromotions.length === 0 ? (
                                    <div className="empty-state">
                                        <span className="empty-icon">🍔</span>
                                        <h3>No hay promociones por artículo</h3>
                                        <p>Crea una promoción para aplicar descuentos a artículos específicos</p>
                                    </div>
                                ) : (
                                    itemPromotions.map(promo => {
                                        const item = menuItems.find(i => i.id === promo.menu_item_id);
                                        const originalPrice = item ? item.original_price : 0;
                                        const finalPrice = promo.type === 'PERCENTAGE'
                                            ? originalPrice * (1 - promo.value / 100)
                                            : Math.max(0, originalPrice - promo.value);

                                        return (
                                            <div key={promo.id} className={`promo-card ${!promo.active ? 'inactive' : ''}`}>
                                                <div className="promo-card-header">
                                                    <div className="promo-category">
                                                        <span className="item-badge">{item ? item.name : `ID: ${promo.menu_item_id}`}</span>
                                                        <span className="category-tag">{item?.category || 'Desconocida'}</span>
                                                        {!promo.active && <span className="inactive-badge">Inactiva</span>}
                                                    </div>
                                                    <div className="promo-actions">
                                                        <button className="action-btn edit-btn" onClick={() => openModal('item', promo)}>✏️</button>
                                                        <button className="action-btn delete-btn" onClick={() => handleDeletePromo(promo.id, false)}>🗑️</button>
                                                    </div>
                                                </div>
                                                <div className="promo-card-body">
                                                    <div className="promo-discount">
                                                        <span className="discount-value">
                                                            {promo.type === 'PERCENTAGE'
                                                                ? `${promo.value}% OFF`
                                                                : `$${promo.value} OFF`
                                                            }
                                                        </span>
                                                        <span className="discount-type">
                                                            {promo.type === 'PERCENTAGE' ? 'Descuento porcentual' : 'Descuento fijo'}
                                                        </span>
                                                    </div>
                                                    <div className="price-display">
                                                        <span className="original-price">${originalPrice.toFixed(2)}</span>
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
                    <form onSubmit={handleSubmit} className="modal-content glass-card slide-in" onClick={e => e.stopPropagation()}>
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
                                        value={formData.category_id}
                                        onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                        required
                                        disabled={editingPromo}
                                    >
                                        <option value="">Seleccionar categoría...</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <>
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
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Artículo</label>
                                        <select
                                            value={formData.menu_item_id}
                                            onChange={e => setFormData({ ...formData, menu_item_id: e.target.value })}
                                            required
                                            disabled={editingPromo}
                                        >
                                            <option value="">Seleccionar artículo...</option>
                                            {filteredMenuItems.map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name} - ${item.original_price} ({item.category})
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
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        required
                                    >
                                        <option value="PERCENTAGE">Porcentaje (%)</option>
                                        <option value="FIXED_AMOUNT">Monto Fijo ($)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>
                                        {formData.type === 'PERCENTAGE' ? 'Porcentaje (%)' : 'Descuento ($)'}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={formData.type === 'PERCENTAGE' ? '100' : undefined}
                                        value={formData.value}
                                        onChange={e => setFormData({ ...formData, value: e.target.value })}
                                        placeholder={formData.type === 'PERCENTAGE' ? '20' : '10'}
                                        required
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

                            {modalType === 'category' && formData.category_id && (
                                <div className="preview-info">
                                    <strong>Vista Previa:</strong>
                                    <p>Esta promoción se aplicaría (si es activa) a {getAffectedItemsForCategoryPromo(parseInt(formData.category_id)).length} artículo(s) en la categoría seleccionada.</p>
                                </div>
                            )}

                            {modalType === 'item' && selectedItem && formData.value && (
                                <div className="preview-info">
                                    <strong>Vista Previa:</strong>
                                    <div className="price-preview">
                                        <span className="original-price">${selectedItem.original_price.toFixed(2)}</span>
                                        <span className="promo-price">
                                            ${formData.type === 'PERCENTAGE'
                                                ? (selectedItem.original_price * (1 - parseFloat(formData.value) / 100)).toFixed(2)
                                                : Math.max(0, selectedItem.original_price - parseFloat(formData.value)).toFixed(2)
                                            }
                                        </span>
                                        <span className="savings">
                                            Ahorro: ${formData.type === 'PERCENTAGE'
                                                ? (selectedItem.original_price * parseFloat(formData.value) / 100).toFixed(2)
                                                : parseFloat(formData.value).toFixed(2)
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
