import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';

const API_URL = API_BASE_URL + '/settings';

function SettingsManager({ settings, onSettingsUpdate }) {
    const [formData, setFormData] = useState({
        restaurant_name: '',
        restaurant_logo: ''
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                restaurant_name: settings.restaurant_name || '',
                restaurant_logo: settings.restaurant_logo || ''
            });
        }
    }, [settings]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(API_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-role': 'admin'
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert('Configuración actualizada');
                onSettingsUpdate();
            } else {
                alert('Error al actualizar');
            }
        } catch (err) {
            console.error('Error updating settings:', err);
        }
    };

    return (
        <div className="settings-manager glass-card fade-in">
            <div className="manager-header">
                <h2>⚙️ Configuración del Sistema</h2>
            </div>

            <form onSubmit={handleSubmit} className="settings-form" style={{ maxWidth: '600px' }}>
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
                    <label>Logo (URL de Imagen o Emoji)</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input
                            type="text"
                            value={formData.restaurant_logo}
                            onChange={e => setFormData({ ...formData, restaurant_logo: e.target.value })}
                            placeholder="Ej: https://misitio.com/logo.png o 🍔"
                            style={{ flex: 1 }}
                            required
                        />
                        <div style={{ position: 'relative', overflow: 'hidden' }}>
                            <label className="btn btn-secondary" style={{ display: 'inline-block', margin: 0, cursor: 'pointer' }}>
                                📤 PC
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;

                                        const data = new FormData();
                                        data.append('file', file);

                                        try {
                                            const res = await fetch(API_BASE_URL + '/upload', {
                                                method: 'POST',
                                                body: data
                                            });
                                            if (res.ok) {
                                                const json = await res.json();
                                                setFormData(prev => ({ ...prev, restaurant_logo: json.url }));
                                            } else {
                                                alert('Error subiendo imagen');
                                            }
                                        } catch (err) {
                                            console.error('Upload error:', err);
                                            alert('Error de conexión al subir imagen');
                                        }
                                    }}
                                />
                            </label>
                        </div>
                        <div className="logo-preview" style={{
                            width: '200px',
                            height: '200px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px dashed rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            background: 'rgba(0,0,0,0.2)'
                        }}>
                            {formData.restaurant_logo && (formData.restaurant_logo.match(/^http/) || formData.restaurant_logo.match(/^\/uploads/)) ? (
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
                                <span style={{ fontSize: '4rem' }}>{formData.restaurant_logo}</span>
                            )}
                            <span style={{ display: 'none', fontSize: '4rem' }}>🍔</span>
                        </div>
                    </div>
                </div>

                <div className="form-actions mt-4">
                    <button type="submit" className="btn btn-primary btn-lg">
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    );
}

export default SettingsManager;
