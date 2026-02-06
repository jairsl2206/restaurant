import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';

const API_URL = API_BASE_URL + '/menu';

function CategoryManager() {
    const [categories, setCategories] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => {
        fetchMenuItems();
    }, []);

    const fetchMenuItems = async () => {
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            setMenuItems(data);

            // Extract unique categories
            const uniqueCategories = [...new Set(data.map(item => item.category).filter(Boolean))];
            setCategories(uniqueCategories.sort());
        } catch (err) {
            console.error('Error fetching menu:', err);
        } finally {
            setLoading(false);
        }
    };

    const getItemCountByCategory = (category) => {
        return menuItems.filter(item => item.category === category).length;
    };

    const handleEditCategory = (oldCategory) => {
        setEditingCategory(oldCategory);
        setNewCategoryName(oldCategory);
    };

    const handleSaveCategory = async () => {
        if (!newCategoryName.trim()) {
            alert('El nombre de la categoría no puede estar vacío');
            return;
        }

        if (newCategoryName === editingCategory) {
            setEditingCategory(null);
            return;
        }

        // Check if new name already exists
        if (categories.includes(newCategoryName) && newCategoryName !== editingCategory) {
            alert('Ya existe una categoría con ese nombre');
            return;
        }

        const itemsToUpdate = menuItems.filter(item => item.category === editingCategory);

        if (itemsToUpdate.length === 0) {
            setEditingCategory(null);
            return;
        }

        const confirmMsg = `¿Renombrar la categoría "${editingCategory}" a "${newCategoryName}"?\nSe actualizarán ${itemsToUpdate.length} artículo(s).`;
        if (!confirm(confirmMsg)) {
            return;
        }

        try {
            // Update all items with this category
            const updatePromises = itemsToUpdate.map(item =>
                fetch(`${API_URL}/${item.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-role': 'admin'
                    },
                    body: JSON.stringify({
                        ...item,
                        category: newCategoryName
                    })
                })
            );

            await Promise.all(updatePromises);
            alert('Categoría actualizada exitosamente');
            setEditingCategory(null);
            fetchMenuItems();
        } catch (err) {
            console.error('Error updating category:', err);
            alert('Error al actualizar la categoría');
        }
    };

    const handleDeleteCategory = async (category) => {
        const itemCount = getItemCountByCategory(category);

        if (itemCount > 0) {
            alert(`No se puede eliminar la categoría "${category}" porque tiene ${itemCount} artículo(s) asignado(s).\n\nPrimero debes reasignar o eliminar esos artículos.`);
            return;
        }

        const confirmMsg = `¿Estás seguro de eliminar la categoría "${category}"?\nEsta acción no se puede deshacer.`;
        if (!confirm(confirmMsg)) {
            return;
        }

        // Since there are no items, just refresh to remove from list
        alert('Categoría eliminada (no tenía artículos asignados)');
        fetchMenuItems();
    };

    const handleCancelEdit = () => {
        setEditingCategory(null);
        setNewCategoryName('');
    };

    return (
        <div className="category-manager fade-in">
            <div className="manager-content">
                <div className="manager-header">
                    <h2>🏷️ Gestión de Categorías</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
                        Edita o elimina categorías del menú
                    </p>
                </div>

                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <p>Cargando categorías...</p>
                    </div>
                ) : (
                    <div className="categories-list" style={{ marginTop: '2rem' }}>
                        {categories.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                                No hay categorías. Crea artículos en el menú para generar categorías.
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
                                            <tr key={category}>
                                                <td>
                                                    {editingCategory === category ? (
                                                        <input
                                                            type="text"
                                                            value={newCategoryName}
                                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveCategory();
                                                                if (e.key === 'Escape') handleCancelEdit();
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
                                                            {category}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{ color: 'var(--text-secondary)' }}>
                                                        {getItemCountByCategory(category)} artículo(s)
                                                    </span>
                                                </td>
                                                <td>
                                                    {editingCategory === category ? (
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
                                                                onClick={handleCancelEdit}
                                                                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                                                            >
                                                                ✕ Cancelar
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button
                                                                className="action-btn edit-btn"
                                                                onClick={() => handleEditCategory(category)}
                                                                title="Editar categoría"
                                                            >
                                                                ✏️
                                                            </button>
                                                            <button
                                                                className="action-btn delete-btn"
                                                                onClick={() => handleDeleteCategory(category)}
                                                                title="Eliminar categoría"
                                                                disabled={getItemCountByCategory(category) > 0}
                                                                style={{
                                                                    opacity: getItemCountByCategory(category) > 0 ? 0.5 : 1,
                                                                    cursor: getItemCountByCategory(category) > 0 ? 'not-allowed' : 'pointer'
                                                                }}
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

                <div style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)'
                }}>
                    <strong>💡 Notas:</strong>
                    <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                        <li>Solo puedes eliminar categorías sin artículos asignados</li>
                        <li>Al renombrar una categoría, todos sus artículos se actualizarán automáticamente</li>
                        <li>Las categorías se crean automáticamente al agregar artículos en el menú</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default CategoryManager;
