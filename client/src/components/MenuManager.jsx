import { useState, useEffect } from 'react';
import './MenuManager.css';
import API_BASE_URL from '../config';

const API_URL = API_BASE_URL + '/menu';

function MenuManager() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        image_url: '',
        category: 'Plato Principal',
        available: true
    });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            setItems(data);
        } catch (err) {
            console.error('Error fetching menu:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const method = editingItem ? 'PUT' : 'POST';
        const url = editingItem ? `${API_URL}/${editingItem.id}` : API_URL;

        const payload = {
            ...formData,
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
                fetchItems();
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
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: { 'x-role': 'admin' }
            });
            if (res.ok) fetchItems();
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
                price: item.price,
                image_url: item.image_url || '',
                category: item.category || 'Plato Principal',
                available: item.available === 1
            });
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                description: '',
                price: '',
                image_url: '',
                category: 'Plato Principal',
                available: true
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingItem(null);
    };

    return (
        <div className="menu-manager">
            <div className="manager-header">
                <h2>🍔 Gestión de Menú</h2>
                <button className="btn btn-primary" onClick={() => openModal()}>
                    + Agregar Artículo
                </button>
            </div>

            {loading ? <p>Cargando...</p> : (
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Imagen</th>
                                <th>Nombre</th>
                                <th>Categoría</th>
                                <th>Precio</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id}>
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
                                    <td><span className="badge">{item.category}</span></td>
                                    <td>${item.price.toFixed(2)}</td>
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
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-card slide-in menu-modal-enhanced">
                        <div className="modal-header">
                            <h3>{editingItem ? 'Editar Artículo' : 'Nuevo Artículo'}</h3>
                            <button className="close-btn" onClick={closeModal}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="menu-form-grid">
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
                                        <label>Precio ($)</label>
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
                                                value={formData.category === 'new_custom_category' ? 'new_custom_category' : (items.some(i => i.category === formData.category) || ['Plato Principal', 'Entrada', 'Bebida', 'Postre'].includes(formData.category) ? formData.category : 'new_custom_category')}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === 'new_custom_category') {
                                                        setFormData({ ...formData, category: '' });
                                                    } else {
                                                        setFormData({ ...formData, category: val });
                                                    }
                                                }}
                                            >
                                                {/* Unique existing categories */}
                                                {[...new Set([...items.map(i => i.category), 'Plato Principal', 'Entrada', 'Bebida', 'Postre'])].filter(Boolean).sort().map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                                <option value="new_custom_category">+ Nueva Categoría</option>
                                            </select>

                                            {(!items.some(i => i.category === formData.category) &&
                                                !['Plato Principal', 'Entrada', 'Bebida', 'Postre'].includes(formData.category)) && (
                                                    <input
                                                        type="text"
                                                        className="mt-2"
                                                        placeholder="Escribe nueva categoría..."
                                                        value={formData.category}
                                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                        autoFocus
                                                    />
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
                                            onChange={e => setFormData({ ...formData, available: e.target.checked })}
                                        />
                                        Disponible para ordenar
                                    </label>
                                </div>
                            </div>

                            <div className="form-right">
                                <div className="form-group">
                                    <label>URL de Imagen</label>
                                    <input
                                        type="text"
                                        placeholder="https://ejemplo.com/foto.jpg"
                                        value={formData.image_url}
                                        onChange={e => setFormData({ ...formData, image_url: e.target.value })}
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

                            <div className="modal-footer full-width">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                                <button type="submit" className="btn btn-primary btn-lg">{editingItem ? 'Guardar Cambios' : 'Crear Artículo'}</button>
                            </div>
                        </form>
                    </div>
                </div >
            )
            }
        </div >
    );
}

export default MenuManager;
