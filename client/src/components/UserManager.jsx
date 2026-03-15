import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import { authHeaders } from '../utils/api';
import { USER_ROLE, USER_ROLE_LABELS } from '../constants';
import { useToast } from './Toast';

const API_URL = API_BASE_URL + '/users';

function UserManager() {
    const showToast = useToast();
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'waiter'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch(API_URL, {
                headers: authHeaders()
            });
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    ...authHeaders({ 'Content-Type': 'application/json' })
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                showToast('Usuario creado correctamente', 'success');
                fetchUsers();
                closeModal();
            } else {
                showToast('Error al crear usuario', 'error');
            }
        } catch (err) {
            console.error('Error creating user:', err);
        }
    };

    const handleDelete = async (id) => {
        setConfirmDeleteId(null);
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: authHeaders()
            });
            if (res.ok) {
                showToast('Usuario eliminado', 'success');
                fetchUsers();
            }
        } catch (err) {
            console.error('Error deleting user:', err);
        }
    };

    const handleRoleChange = async (id, newRole) => {
        try {
            const res = await fetch(`${API_URL}/${id}/role`, {
                method: 'PUT',
                headers: {
                    ...authHeaders({ 'Content-Type': 'application/json' })
                },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) fetchUsers();
        } catch (err) {
            console.error('Error updating role:', err);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setFormData({ username: '', password: '', role: 'waiter' });
    };

    return (
        <div className="user-manager">
            <div className="manager-content">
                <div className="manager-header">
                    <h2>👥 Gestión de Usuarios</h2>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + Agregar Usuario
                    </button>
                </div>

                {loading ? <p>Cargando...</p> : (
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Usuario</th>
                                    <th>Rol</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>#{user.id}</td>
                                        <td><strong>{user.username}</strong></td>
                                        <td>
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                className="role-select"
                                            >
                                                {Object.values(USER_ROLE).map(role => (
                                                    <option key={role} value={role}>{USER_ROLE_LABELS[role]}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <button className="action-btn delete-btn" onClick={() => setConfirmDeleteId(user.id)} aria-label={`Eliminar usuario ${user.username}`}>🗑️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
                            <h3>Nuevo Usuario</h3>
                            <button type="button" className="close-btn" onClick={closeModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Usuario</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Contraseña</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Rol</label>
                                <select
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    {Object.values(USER_ROLE).map(role => (
                                        <option key={role} value={role}>{USER_ROLE_LABELS[role]}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Crear Usuario</button>
                        </div>
                    </form>
                </div>
            )}

            {confirmDeleteId && (
                <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
                    <div className="modal-content glass-card slide-in" style={{ maxWidth: '360px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ fontSize: '1.1rem' }}>⚠️ Eliminar usuario</h3>
                            <button type="button" className="close-btn" onClick={() => setConfirmDeleteId(null)} aria-label="Cancelar">×</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>¿Seguro que deseas eliminar este usuario?</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Esta acción no se puede deshacer.</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
                            <button type="button" className="btn btn-danger"
                                style={{ background: 'rgba(239,68,68,0.2)', borderColor: '#ef4444', color: '#ef4444' }}
                                onClick={() => handleDelete(confirmDeleteId)}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserManager;
