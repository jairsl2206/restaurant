import { useState, useEffect } from 'react';
import './MenuManager.css';
import API_BASE_URL from '../config';
import { apiGet, apiPost, apiPut, apiDelete, apiFetch } from '../utils/api';
import { useToast } from './Toast';

function ConfirmDialog({ message, onConfirm, onCancel }) {
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content glass-card slide-in" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 style={{ fontSize: '1.1rem' }}>⚠️ Confirmar eliminación</h3>
                    <button type="button" className="close-btn" onClick={onCancel} aria-label="Cancelar">×</button>
                </div>
                <div className="modal-body">
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{message}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Esta acción no se puede deshacer.
                    </p>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
                    <button type="button" className="btn btn-danger" onClick={onConfirm}
                        style={{ background: 'rgba(239,68,68,0.2)', borderColor: '#ef4444', color: '#ef4444' }}>
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    );
}

function MenuManager() {
    const showToast = useToast();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }
    const [groupByCategory, setGroupByCategory] = useState(() => {
        const saved = localStorage.getItem('menuGroupByCategory');
        return saved === null ? true : saved === 'true';
    });
    const [collapsedCategories, setCollapsedCategories] = useState({});

    const toggleCategory = (categoryId) => {
        setCollapsedCategories(prev => ({
            ...prev,
            [categoryId]: prev[categoryId] !== true
        }));
    };

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        image_url: '',
        category_id: '',
        available: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [menuData, catsData] = await Promise.all([
                apiGet(`${API_BASE_URL}/menu`, { auth: false }),
                apiGet(`${API_BASE_URL}/categories`, { auth: false })
            ]);
            setItems(menuData);
            setCategories(catsData);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.category_id) {
            showToast('Por favor selecciona una categoría.', 'warning');
            return;
        }

        const payload = {
            ...formData,
            category_id: parseInt(formData.category_id),
            price: parseFloat(formData.price)
        };

        setSaving(true);
        try {
            const url = `${API_BASE_URL}/menu${editingItem ? `/${editingItem.id}` : ''}`;
            const res = editingItem
                ? await apiPut(url, payload, { json: false })
                : await apiPost(url, payload, { json: false });

            if (res.ok) {
                showToast(editingItem ? 'Artículo actualizado correctamente' : 'Artículo creado correctamente', 'success');
                fetchData();
                closeModal();
            } else {
                showToast('Error al guardar el artículo', 'error');
            }
        } catch (err) {
            console.error('Error saving item:', err);
            showToast('Error de conexión al guardar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteConfirmed = async () => {
        if (!confirmDelete) return;
        const { id } = confirmDelete;
        setConfirmDelete(null);
        try {
            const res = await apiDelete(`${API_BASE_URL}/menu/${id}`, { json: false });
            if (res.ok) {
                showToast('Artículo eliminado', 'success');
                fetchData();
            } else {
                showToast('Error al eliminar el artículo', 'error');
            }
        } catch (err) {
            console.error('Error deleting item:', err);
            showToast('Error de conexión al eliminar', 'error');
        }
    };

    const openModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name: item.name,
                description: item.description || '',
                price: item.original_price || item.price,
                image_url: item.image_url || '',
                category_id: item.category_id || '',
                available: Boolean(item.available)
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                description: '',
                price: '',
                image_url: '',
                category_id: categories.length > 0 ? categories[0].id : '',
                available: true
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingItem(null);
    };

    const processImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const size = Math.min(img.width, img.height);
                    canvas.width = 600;
                    canvas.height = 600;
                    const ctx = canvas.getContext('2d');

                    const offsetX = (img.width - size) / 2;
                    const offsetY = (img.height - size) / 2;

                    ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 600, 600);

                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, 'image/jpeg', 0.8);
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setLoading(true);
            const processedBlob = await processImage(file);

            const formDataUpload = new FormData();
            formDataUpload.append('file', processedBlob, 'image.jpg');

            const data = await apiFetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formDataUpload, auth: false });
            if (data.url) {
                const serverUrl = API_BASE_URL.replace('/api', '');
                setFormData(prev => ({ ...prev, image_url: serverUrl + data.url }));
            } else {
                showToast('Error al subir imagen', 'error');
            }
        } catch (err) {
            console.error('Error processing image:', err);
            showToast('Error al procesar la imagen', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getCategoryName = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat ? cat.name : 'Sin Categoría';
    };

    // Get unique category IDs from menu items so we iterate over them
    const usedCategoryIds = [...new Set(items.map(i => i.category_id))];

    const renderTable = (tableItems, showCategory = false) => (
        <table className="data-table">
            <thead>
                <tr>
                    <th>Imagen</th>
                    <th>Nombre</th>
                    {showCategory && <th>Categoría</th>}
                    <th>Precio Base</th>
                    <th>Precio Final</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                {tableItems.map(item => (
                    <tr key={item.id} className={!item.available ? 'item-unavailable' : ''}>
                        <td data-label="Imagen">
                            {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="item-thumbnail" />
                            ) : (
                                <span className="no-img">📷</span>
                            )}
                        </td>
                        <td className="td-primary" data-label="Nombre">
                            <strong>{item.name}</strong>
                            <p className="text-muted text-sm">{item.description}</p>
                        </td>
                        {showCategory && (
                            <td data-label="Categoría"><span className="badge">{getCategoryName(item.category_id)}</span></td>
                        )}
                        <td className="text-secondary" data-label="Precio">
                            ${(item.original_price || item.price).toFixed(2)}
                        </td>
                        <td data-label="Promo" style={{ fontWeight: 600, color: item.has_promotion ? 'var(--primary)' : 'inherit' }}>
                            ${(item.final_price || item.price).toFixed(2)}
                            {item.has_promotion && <span title="Promoción Activa" style={{ marginLeft: 5 }}>🏷️</span>}
                        </td>
                        <td data-label="Disponible">
                            <span className={`status-dot ${item.available ? 'online' : 'offline'}`}></span>
                            {item.available ? 'Disponible' : 'Agotado'}
                        </td>
                        <td className="td-actions">
                            <button className="action-btn edit-btn" onClick={() => openModal(item)} aria-label={`Editar ${item.name}`}>✏️</button>
                            <button className="action-btn delete-btn" onClick={() => setConfirmDelete({ id: item.id, name: item.name })} aria-label={`Eliminar ${item.name}`}>🗑️</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <div className="menu-manager">
            <div className="manager-content">
                <div className="manager-header">
                    <h2>🍔 Gestión de Menú</h2>
                    <div className="header-actions">
                        <label className="toggle-group">
                            <input
                                type="checkbox"
                                checked={groupByCategory}
                                onChange={e => {
                                    setGroupByCategory(e.target.checked);
                                    localStorage.setItem('menuGroupByCategory', e.target.checked);
                                }}
                            />
                            Agrupar por Categoría
                        </label>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            + Agregar Artículo
                        </button>
                    </div>
                </div>

                {loading ? <p>Cargando...</p> : items.length === 0 ? (
                    <div className="menu-empty-state">
                        <span>🍔</span>
                        <h3>El menú está vacío</h3>
                        <p>Agrega tu primer platillo para que aparezca en el sistema.</p>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            + Agregar Platillo
                        </button>
                    </div>
                ) : (
                    <div className="data-table-wrapper">
                        {groupByCategory ? (
                            <div className="grouped-list">
                                {usedCategoryIds.map(categoryId => {
                                    const catName = getCategoryName(categoryId);
                                    const catItems = items.filter(i => i.category_id === categoryId);

                                    return (
                                        <div key={categoryId || 'uncategorized'} className="category-group">
                                            <h4
                                                className="category-group-title clickable"
                                                onClick={() => toggleCategory(categoryId)}
                                            >
                                                {collapsedCategories[categoryId] === true ? '▼' : '▶'} {catName}
                                                <span className="item-count-badge">
                                                    {catItems.length} ítem{catItems.length !== 1 ? 's' : ''}
                                                </span>
                                            </h4>
                                            {collapsedCategories[categoryId] === true && renderTable(catItems)}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : renderTable(items, true)}
                    </div>
                )}
            </div>

            {confirmDelete && (
                <ConfirmDialog
                    message={`¿Eliminar "${confirmDelete.name}"?`}
                    onConfirm={handleDeleteConfirmed}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}

            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <form
                        onSubmit={handleSubmit}
                        className="modal-content glass-card slide-in menu-modal-enhanced"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>{editingItem ? 'Editar Artículo' : 'Nuevo Artículo'}</h3>
                            <button type="button" className="close-btn" onClick={closeModal} aria-label="Cerrar modal">×</button>
                        </div>
                        <div className="modal-body">
                            <div className="menu-form-grid">
                                <div className="form-left">
                                    <div className="form-group">
                                        <label>Nombre</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ej: Hamburguesa Suprema"
                                            required
                                        />
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Precio Original ($)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.price}
                                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Categoría</label>
                                            <div className="category-selector">
                                                <select
                                                    value={formData.category_id}
                                                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                                    required
                                                >
                                                    <option value="">-- Seleccionar --</option>
                                                    {categories.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                    ))}
                                                </select>
                                                {categories.length === 0 && (
                                                    <small className="text-muted d-block mt-1">
                                                        ⚠ No hay categorías creadas. Guárdalo y ve a "Categorías" para crearlas.
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>Descripción</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            rows="3"
                                            placeholder="Descripción corta del platillo..."
                                        />
                                    </div>

                                    <div className="form-group checkbox-group">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={formData.available}
                                                style={{ width: 'auto' }}
                                                onChange={e => setFormData({ ...formData, available: e.target.checked })}
                                            />
                                            Disponible para ordenar
                                        </label>
                                    </div>
                                </div>

                                <div className="form-right">
                                    <div className="form-group">
                                        <label>Imagen del Artículo</label>
                                        <div className="file-upload-wrapper">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageSelect}
                                                className="file-input"
                                            />
                                            <small className="text-muted d-block mt-1">
                                                Selecciona una foto. Se recortará automáticamente a cuadrado.
                                            </small>
                                        </div>
                                        <div className="or-divider">o usa una URL externa</div>
                                        <input
                                            type="text"
                                            placeholder="https://ejemplo.com/foto.jpg"
                                            value={formData.image_url}
                                            onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                                            className="mt-2"
                                        />
                                    </div>
                                    <div className="image-preview-container">
                                        {formData.image_url ? (
                                            <img
                                                src={formData.image_url}
                                                alt="Preview"
                                                className="image-preview"
                                                onError={(e) => e.target.src = 'https://via.placeholder.com/150?text=No+Image'}
                                            />
                                        ) : (
                                            <div className="image-placeholder">
                                                <span>📷 Vista Previa</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer full-width">
                            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                            <button
                                type="submit"
                                className={`btn btn-primary btn-lg ${saving ? 'btn-loading' : ''}`}
                                disabled={saving}
                            >
                                {saving && <span className="btn-spinner" aria-hidden="true" />}
                                {saving ? 'Guardando...' : (editingItem ? 'Guardar Cambios' : 'Crear Artículo')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default MenuManager;
