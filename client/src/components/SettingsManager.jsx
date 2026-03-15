import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import { apiGet, apiPost, apiFetch } from '../utils/api';
import { useToast } from './Toast';
import { POLL_INTERVAL_WHATSAPP_MS } from '../constants';

function SettingsManager({ settings, onSettingsUpdate }) {
    const showToast = useToast();
    const [formData, setFormData] = useState({
        restaurant_name: '',
        restaurant_logo: '',
        max_tables: 20
    });
    const [whatsappStatus, setWhatsappStatus] = useState({ isReady: false, qrCode: null });
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [whatsappGroups, setWhatsappGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(false);

    useEffect(() => {
        if (settings) {
            setFormData({
                restaurant_name: settings.restaurant_name || '',
                restaurant_logo: settings.restaurant_logo || '',
                max_tables: settings.max_tables || 20
            });
            setWhatsappNumber(settings.whatsapp_number || '');
        }
    }, [settings]);

    // Poll WhatsApp Status
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const data = await apiGet(`${API_BASE_URL}/whatsapp/status`);
                setWhatsappStatus(data);
            } catch (err) {
                console.error('Error checking WhatsApp status', err);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, POLL_INTERVAL_WHATSAPP_MS);
        return () => clearInterval(interval);
    }, []);

    // Fetch Groups when ready
    useEffect(() => {
        if (whatsappStatus.isReady && !loadingGroups && whatsappGroups.length === 0) {
            fetchGroups();
        }
    }, [whatsappStatus.isReady]);

    const fetchGroups = async () => {
        if (loadingGroups) return;
        setLoadingGroups(true);
        try {
            const data = await apiGet(`${API_BASE_URL}/whatsapp/groups`);
            setWhatsappGroups(data);
        } catch (err) {
            console.error('Error fetching groups', err);
        } finally {
            setLoadingGroups(false);
        }
    };

    const handleResetWhatsapp = async () => {
        if (!window.confirm('¿Estás seguro de reiniciar la sesión de WhatsApp? Esto cerrará la conexión actual.')) return;

        try {
            const res = await apiPost(`${API_BASE_URL}/whatsapp/reset`, {}, { json: false });
            if (res.ok) showToast('Reinicio iniciado. Por favor espera el nuevo código QR.', 'info');
        } catch (err) {
            console.error('Error resetting WhatsApp', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await apiPost(`${API_BASE_URL}/settings`, { ...formData, whatsapp_number: whatsappNumber }, { json: false });
            if (res.ok) {
                showToast('Configuración actualizada exitosamente', 'success');
                onSettingsUpdate();
            } else {
                showToast('Error al actualizar configuración', 'error');
            }
        } catch (err) {
            console.error('Error updating settings:', err);
            showToast('Error de conexión', 'error');
        }
    };

    // ... (Handlers for file upload remain same) ...
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        try {
            const data = await apiFetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formDataUpload });
            if (data.url) {
                setFormData(prev => ({ ...prev, restaurant_logo: data.url }));
            }
        } catch (err) {
            console.error('Upload failed:', err);
            showToast('Falló la subida de imagen', 'error');
        }
    };

    return (
        <div className="settings-manager fade-in">
            <div className="manager-content">
                <div className="manager-header">
                    <h2>⚙️ Configuración del Sistema</h2>
                </div>

                <form onSubmit={handleSubmit} className="settings-form" style={{ maxWidth: '800px' }}>
                    <div className="settings-grid">
                        {/* Columna Izquierda */}
                        <div>
                            <div className="form-group">
                                <label>Nombre del Restaurante</label>
                                <input
                                    type="text"
                                    value={formData.restaurant_name}
                                    onChange={e => setFormData({ ...formData, restaurant_name: e.target.value })}
                                    placeholder="Ej: Restaurant POS"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Número Máximo de Mesas</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={formData.max_tables}
                                    onChange={e => setFormData({ ...formData, max_tables: parseInt(e.target.value) })}
                                    required
                                />
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                                    Define cuántas mesas estarán disponibles para seleccionar al crear órdenes (1-100)
                                </small>
                            </div>

                            {/* WhatsApp Config Section */}
                            <div className="form-group" style={{ marginTop: '2rem', background: 'rgba(37, 211, 102, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(37, 211, 102, 0.3)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#25D366' }}>
                                    📱 Notificaciones WhatsApp
                                </label>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.8rem' }}>Destinatario de Notificaciones</label>

                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '6px' }}>
                                        <button
                                            type="button"
                                            className={`btn ${!whatsappNumber.includes('@g.us') ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setWhatsappNumber('')}
                                            style={{ flex: 1, padding: '4px', fontSize: '0.75rem' }}
                                        >
                                            📞 Número
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${whatsappNumber.includes('@g.us') ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => whatsappGroups.length > 0 && setWhatsappNumber(whatsappGroups[0].id)}
                                            style={{ flex: 1, padding: '4px', fontSize: '0.75rem' }}
                                            disabled={!whatsappStatus.isReady || whatsappGroups.length === 0}
                                        >
                                            👥 Grupo
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        {!whatsappNumber.includes('@g.us') ? (
                                            <input
                                                type="text"
                                                value={whatsappNumber}
                                                onChange={e => setWhatsappNumber(e.target.value)}
                                                placeholder="Número (e.g. 521...)"
                                                style={{ flex: 1 }}
                                            />
                                        ) : (
                                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flex: 1 }}>
                                                <select
                                                    style={{ flex: 1 }}
                                                    onChange={(e) => setWhatsappNumber(e.target.value)}
                                                    value={whatsappNumber}
                                                >
                                                    {whatsappGroups.map(group => (
                                                        <option key={group.id} value={group.id}>{group.name}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={fetchGroups}
                                                    className="btn btn-secondary"
                                                    disabled={loadingGroups}
                                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                    title="Actualizar lista de grupos"
                                                >
                                                    {loadingGroups ? '⏳' : '🔄'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <small style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                        {!whatsappNumber.includes('@g.us')
                                            ? "Ingresa el número con código de país sin el símbolo +."
                                            : "Selecciona el grupo de WhatsApp donde llegarán los avisos."}
                                    </small>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <p style={{ margin: 0 }}>Estado: <strong>{whatsappStatus.isReady ? '✅ Conectado' : '❌ Desconectado'}</strong></p>
                                    {whatsappStatus.isReady && (
                                        <button
                                            type="button"
                                            onClick={handleResetWhatsapp}
                                            className="btn btn-secondary"
                                            style={{ padding: '4px 8px', fontSize: '0.7rem', background: '#dc3545' }}
                                        >
                                            🔄 Reiniciar Sesión
                                        </button>
                                    )}
                                </div>

                                {!whatsappStatus.isReady && whatsappStatus.qrCode && (
                                    <div style={{ background: 'white', padding: '10px', width: 'fit-content', borderRadius: '8px', margin: '1rem auto' }}>
                                        <img src={whatsappStatus.qrCode} alt="WhatsApp QR" style={{ width: '200px', height: '200px' }} />
                                        <p style={{ color: 'black', textAlign: 'center', margin: '5px 0 0 0', fontSize: '0.8rem' }}>Escanea con WhatsApp</p>
                                    </div>
                                )}

                                {!whatsappStatus.isReady && !whatsappStatus.qrCode && (
                                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#aaa', margin: 0 }}>Cargando código QR...</p>
                                        <button
                                            type="button"
                                            onClick={handleResetWhatsapp}
                                            className="btn btn-secondary"
                                            style={{ marginTop: '0.5rem', padding: '4px 8px', fontSize: '0.7rem' }}
                                        >
                                            Intentar Reinicio
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Columna Derecha - Logo */}
                        <div>
                            <div className="form-group">
                                <label>Logo del Restaurante</label>
                                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <input
                                        type="text"
                                        value={formData.restaurant_logo}
                                        onChange={e => setFormData({ ...formData, restaurant_logo: e.target.value })}
                                        placeholder="URL de imagen o emoji (🍔)"
                                        style={{ flex: 1 }}
                                        required
                                    />
                                    <div style={{ position: 'relative', overflow: 'hidden' }}>
                                        <label className="btn btn-secondary" style={{ display: 'inline-block', margin: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                            📤 Subir
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="logo-preview" style={{
                                    width: '100%',
                                    height: '200px',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px dashed #444'
                                }}>
                                    {formData.restaurant_logo && (formData.restaurant_logo.startsWith('http') || formData.restaurant_logo.startsWith('/uploads')) ? (
                                        <img
                                            src={formData.restaurant_logo}
                                            alt="Logo"
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                            }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: '5rem' }}>{formData.restaurant_logo || '🍔'}</span>
                                    )}
                                    <span style={{ display: 'none', fontSize: '5rem' }}>🍔</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="maintenance-section" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '2rem' }}>
                        <h3 style={{ color: '#ff4d4d', marginBottom: '1rem', fontSize: '1.1rem' }}>⚠️ Zona de Peligro (Mantenimiento)</h3>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Estas acciones son irreversibles. Por favor, procede con extrema precaución.
                        </p>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                className="btn"
                                style={{ background: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', color: '#e74c3c' }}
                                onClick={async () => {
                                    if (window.confirm('¿ESTÁS SEGURO? Esta acción borrará TODOS los artículos del menú permanentemente.')) {
                                        if (window.confirm('POR FAVOR CONFIRMA OTRA VEZ: ¿Realmente quieres borrar todos los datos del menú?')) {
                                            try {
                                                const res = await fetch(API_BASE_URL + '/menu/all', {
                                                    method: 'DELETE',
                                                    headers: authHeaders()
                                                });
                                                if (res.ok) {
                                                    showToast('Menú borrado exitosamente.', 'success');
                                                    onSettingsUpdate();
                                                } else {
                                                    showToast('Error al borrar menú.', 'error');
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                showToast('Error de conexión.', 'error');
                                            }
                                        }
                                    }
                                }}
                            >
                                🗑️ Borrar Todos los Items
                            </button>

                            <button
                                type="button"
                                className="btn"
                                style={{ background: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', color: '#e74c3c' }}
                                onClick={async () => {
                                    if (window.confirm('¿ESTÁS SEGURO? Esta acción borrará TODO el historial de pedidos permanentemente.')) {
                                        if (window.confirm('POR FAVOR CONFIRMA OTRA VEZ: ¿Realmente quieres borrar todo el historial de pedidos?')) {
                                            try {
                                                const res = await fetch(API_BASE_URL + '/orders/all', {
                                                    method: 'DELETE',
                                                    headers: authHeaders()
                                                });
                                                if (res.ok) {
                                                    showToast('Historial de pedidos borrado exitosamente.', 'success');
                                                    onSettingsUpdate();
                                                } else {
                                                    showToast('Error al borrar pedidos.', 'error');
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                showToast('Error de conexión.', 'error');
                                            }
                                        }
                                    }
                                }}
                            >
                                📜 Borrar Todos los Pedidos
                            </button>
                        </div>
                    </div>

                    <div className="form-actions" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '2rem' }}>
                        <button type="submit" className="btn btn-primary btn-lg">
                            💾 Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SettingsManager;
