import { useState, useEffect } from 'react';
import './MenuManager.css';
import API_BASE_URL from '../config';

const MENU_API_URL = `${API_BASE_URL}/menu`;
const CATEGORIES_API_URL = `${API_BASE_URL}/categories`;

function MenuManager() {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [groupByCategory, setGroupByCategory] = useState(true);
    const [collapsedCategories, setCollapsedCategories] = useState({});

    const toggleCategory = (categoryId) => {
        setCollapsedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
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
            const [menuRes, catsRes] = await Promise.all([
                fetch(MENU_API_URL),
                fetch(CATEGORIES_API_URL)
            ]);
            setItems(await menuRes.json());
            setCategories(await catsRes.json());
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.category_id) {
            alert('Por favor selecciona una categoría.');
            return;
        }

        const method = editingItem ? 'PUT' : 'POST';
        const url = editingItem ? `${MENU_API_URL}/${editingItem.id}` : MENU_API_URL;

        const payload = {
            ...formData,
            category_id: parseInt(formData.category_id),
            price: parseFloat(formData.price)
        };

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
                alert('Error al guardar');
            }
        } catch (err) {
            console.error('Error saving item:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar este artículo?')) return;

        try {
            const res = await fetch(`${MENU_API_URL}/${id}`, {
                method: 'DELETE',
                headers: { 'x-role': 'admin' }
            });
            if (res.ok) fetchData();
        } catch (err) {
            console.error('Error deleting item:', err);
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

            const res = await fetch(API_BASE_URL + '/upload', {
                method: 'POST',
                body: formDataUpload
            });

            if (res.ok) {
                const data = await res.json();
                const serverUrl = API_BASE_URL.replace('/api', '');
                setFormData(prev => ({ ...prev, image_url: serverUrl + data.url }));
            } else {
                alert('Error al subir imagen');
            }
        } catch (err) {
            console.error('Error processing image:', err);
            alert('Error al procesar la imagen');
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
                                onChange={e => setGroupByCategory(e.target.checked)}
                            />
                            Agrupar por Categoría
                        </label>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            + Agregar Artículo
                        </button>
                    </div>
                </div>

                {loading ? <p>Cargando...</p> : (
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
                                                {collapsedCategories[categoryId] ? '▶' : '▼'} {catName}
                                                <span className="item-count-badge">
                                                    {catItems.length}
                                                </span>
                                            </h4>
                                            {!collapsedCategories[categoryId] && (
                                                <table className="data-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Imagen</th>
                                                            <th>Nombre</th>
                                                            <th>Precio Base</th>
                                                            <th>Precio Final</th>
                                                            <th>Estado</th>
                                                            <th>Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {catItems.map(item => (
                                                            <tr key={item.id} className={!item.available ? 'item-unavailable' : ''}>
                                                                <td>
                                                                    {item.image_url ? (
                                                                        <img src={item.image_url} alt={item.name} className="item-thumbnail" />
                                                                    ) : (
                                                                        <span className="no-img">📷</span>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    <strong>{item.name}</strong>
                                                                    <p className="text-muted text-sm">{item.description}</p>
                                                                </td>
                                                                <td className="text-secondary">
                                                                    ${(item.original_price || item.price).toFixed(2)}
                                                                </td>
                                                                <td style={{ fontWeight: 600, color: item.has_promotion ? 'var(--primary)' : 'inherit' }}>
                                                                    ${(item.final_price || item.price).toFixed(2)}
                                                                    {item.has_promotion && <span title="Promoción Activa" style={{ marginLeft: 5 }}>🏷️</span>}
                                                                </td>
                                                                <td>
                                                                    <span className={`status-dot ${item.available ? 'online' : 'offline'}`}></span>
                                                                    {item.available ? 'Disponible' : 'Agotado'}
                                                                </td>
                                                                <td>
                                                                    <button className="action-btn edit-btn" onClick={() => openModal(item)}>✏️</button>
                                                                    <button className="action-btn delete-btn" onClick={() => handleDelete(item.id)}>🗑️</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Imagen</th>
                                        <th>Nombre</th>
                                        <th>Categoría</th>
                                        <th>Precio Base</th>
                                        <th>Precio Final</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map(item => (
                                        <tr key={item.id} className={!item.available ? 'item-unavailable' : ''}>
                                            <td>
                                                {item.image_url ? (
                                                    <img src={item.image_url} alt={item.name} className="item-thumbnail" />
                                                ) : (
                                                    <span className="no-img">📷</span>
                                                )}
                                            </td>
                                            <td>
                                                <strong>{item.name}</strong>
                                                <p className="text-muted text-sm">{item.description}</p>
                                            </td>
                                            <td><span className="badge">{getCategoryName(item.category_id)}</span></td>
                                            <td className="text-secondary">
                                                ${(item.original_price || item.price).toFixed(2)}
                                            </td>
                                            <td style={{ fontWeight: 600, color: item.has_promotion ? 'var(--primary)' : 'inherit' }}>
                                                ${(item.final_price || item.price).toFixed(2)}
                                            </td>
                                            <td>
                                                <span className={`status-dot ${item.available ? 'online' : 'offline'}`}></span>
                                                {item.available ? 'Disponible' : 'Agotado'}
                                            </td>
                                            <td>
                                                <button className="action-btn edit-btn" onClick={() => openModal(item)}>✏️</button>
                                                <button className="action-btn delete-btn" onClick={() => handleDelete(item.id)}>🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <form
                        onSubmit={handleSubmit}
                        className="modal-content glass-card slide-in menu-modal-enhanced"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>{editingItem ? 'Editar Artículo' : 'Nuevo Artículo'}</h3>
                            <button type="button" className="close-btn" onClick={closeModal}>×</button>
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
                            <button type="submit" className="btn btn-primary btn-lg">{editingItem ? 'Guardar Cambios' : 'Crear Artículo'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default MenuManager;
