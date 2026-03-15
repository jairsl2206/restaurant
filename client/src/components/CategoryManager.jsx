import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import { authHeaders } from '../utils/api';

const CATEGORIES_URL = API_BASE_URL + '/categories';
const MENU_URL = API_BASE_URL + '/menu';

function CategoryManager() {
    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryInput, setNewCategoryInput] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [catsRes, menuRes] = await Promise.all([
                fetch(CATEGORIES_URL),
                fetch(MENU_URL)
            ]);
            setCategories(await catsRes.json());
            setMenuItems(await menuRes.json());
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const getItemCount = (categoryId) => {
        return menuItems.filter(item => item.category_id === categoryId).length;
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryInput.trim()) return;

        try {
            const res = await fetch(CATEGORIES_URL, {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ name: newCategoryInput.trim() })
            });

            if (res.ok) {
                setNewCategoryInput('');
                fetchData();
            } else {
                alert('Error al crear categoría');
            }
        } catch (err) {
            console.error('Error creating category:', err);
        }
    };

    const handleSaveCategory = async () => {
        if (!newCategoryName.trim() || !editingCategory) return;

        try {
            const res = await fetch(`${CATEGORIES_URL}/${editingCategory.id}`, {
                method: 'PUT',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ name: newCategoryName.trim() })
            });

            if (res.ok) {
                setEditingCategory(null);
                fetchData();
            } else {
                alert('Error al actualizar categoría');
            }
        } catch (err) {
            console.error('Error updating category:', err);
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (!confirm('¿Seguro que deseas eliminar esta categoría? (Los artículos ahora quedarán sin categoría)')) return;

        try {
            const res = await fetch(`${CATEGORIES_URL}/${categoryId}`, {
                method: 'DELETE',
                headers: authHeaders()
            });

            if (res.ok) {
                fetchData();
            } else {
                alert('Error al eliminar categoría');
            }
        } catch (err) {
            console.error('Error deleting category:', err);
        }
    };

    const startEditing = (category) => {
        setEditingCategory(category);
        setNewCategoryName(category.name);
    };

    return (
        <div className="category-manager fade-in">
            <div className="manager-content">
                <div className="manager-header">
                    <h2>🏷️ Gestión de Categorías</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
                        Crea, edita o elimina las categorías del menú de tu sucursal.
                    </p>
                </div>

                <div className="create-category-card glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
                    <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Nombre de nueva categoría..."
                            value={newCategoryInput}
                            onChange={e => setNewCategoryInput(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '0.8rem',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                color: 'white'
                            }}
                        />
                        <button type="submit" className="btn btn-primary" disabled={!newCategoryInput.trim()}>
                            + Agregar Categoría
                        </button>
                    </form>
                </div>

                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>Cargando categorías...</p>
                    </div>
                ) : (
                    <div className="categories-list">
                        {categories.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                                No hay categorías. Por favor crea una nueva arriba.
                            </p>
                        ) : (
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Categoría</th>
                                            <th>Artículos</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categories.map(category => (
                                            <tr key={category.id}>
                                                <td>
                                                    {editingCategory?.id === category.id ? (
                                                        <input
                                                            type="text"
                                                            value={newCategoryName}
                                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveCategory();
                                                                if (e.key === 'Escape') setEditingCategory(null);
                                                            }}
                                                            autoFocus
                                                            style={{
                                                                background: 'rgba(0,0,0,0.3)',
                                                                border: '1px solid var(--primary)',
                                                                borderRadius: '6px',
                                                                padding: '0.5rem',
                                                                color: 'var(--text-primary)',
                                                                width: '100%',
                                                                maxWidth: '300px'
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className="badge" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                                                            {category.name}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{ color: 'var(--text-secondary)' }}>
                                                        {getItemCount(category.id)} artículo(s)
                                                    </span>
                                                </td>
                                                <td>
                                                    {editingCategory?.id === category.id ? (
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button
                                                                className="btn btn-primary"
                                                                onClick={handleSaveCategory}
                                                                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                                            >
                                                                ✓ Guardar
                                                            </button>
                                                            <button
                                                                className="btn btn-secondary"
                                                                onClick={() => setEditingCategory(null)}
                                                                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                                            >
                                                                ✕ Cancelar
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button
                                                                className="action-btn edit-btn"
                                                                onClick={() => startEditing(category)}
                                                                title="Editar categoría"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                className="action-btn delete-btn"
                                                                onClick={() => handleDeleteCategory(category.id)}
                                                                title="Eliminar categoría"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default CategoryManager;
