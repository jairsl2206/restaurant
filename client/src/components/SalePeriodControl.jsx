import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import { authHeaders } from '../utils/api';
import './SalePeriodControl.css';

function SalePeriodControl() {
    const [activePeriod, setActivePeriod] = useState(undefined); // undefined = loading
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [warning, setWarning] = useState(null); // { activeOrdersCount }

    const fetchActivePeriod = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/sale-periods/active`, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                setActivePeriod(data); // null = no active period
            }
        } catch (err) {
            console.error('Error fetching active period:', err);
        }
    };

    const fetchPeriods = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/sale-periods`, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                setPeriods(data);
            }
        } catch (err) {
            console.error('Error fetching periods:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivePeriod();
        fetchPeriods();
    }, []);

    const openPeriod = async () => {
        setActionLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/sale-periods`, {
                method: 'POST',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (res.ok) {
                setActivePeriod(data);
                fetchPeriods();
            } else {
                setError(data.error || 'Error al abrir jornada');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setActionLoading(false);
        }
    };

    const closePeriod = async (force = false) => {
        if (!activePeriod) return;
        setActionLoading(true);
        setError(null);
        setWarning(null);
        try {
            const res = await fetch(`${API_BASE_URL}/sale-periods/${activePeriod.id}/close`, {
                method: 'PUT',
                headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ force })
            });
            const data = await res.json();
            if (res.status === 409 && data.warning) {
                setWarning(data);
            } else if (res.ok) {
                setActivePeriod(null);
                fetchPeriods();
            } else {
                setError(data.error || 'Error al cerrar jornada');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleString('es-MX', {
            weekday: 'short', year: 'numeric', month: 'short',
            day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const formatBusinessDate = (dateStr) => {
        if (!dateStr) return '—';
        // business_date is YYYY-MM-DD
        const [y, m, d] = dateStr.split('-');
        return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    return (
        <div className="sale-period-control fade-in">
            <div className="manager-content">
                <div className="manager-header">
                    <h2>🗓️ Control de Jornada</h2>
                </div>

                {/* Status Banner */}
                <div className={`period-status-banner ${activePeriod ? 'open' : 'closed'}`}>
                    <div className="status-indicator">
                        <span className="status-dot"></span>
                        <span className="status-label">
                            {activePeriod === undefined
                                ? 'Cargando...'
                                : activePeriod
                                    ? 'Jornada Abierta'
                                    : 'Sin Jornada Activa'}
                        </span>
                    </div>

                    {activePeriod && (
                        <div className="period-details">
                            <div className="detail-row">
                                <span className="detail-label">Fecha de negocio:</span>
                                <span className="detail-value">{formatBusinessDate(activePeriod.business_date)}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Abierta por:</span>
                                <span className="detail-value">{activePeriod.opened_by_username || '—'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Desde:</span>
                                <span className="detail-value">{formatDate(activePeriod.opened_at)}</span>
                            </div>
                        </div>
                    )}

                    <div className="period-actions">
                        {!activePeriod ? (
                            <button
                                className={`btn btn-success ${actionLoading ? 'btn-loading' : ''}`}
                                onClick={openPeriod}
                                disabled={actionLoading || activePeriod === undefined}
                            >
                                {actionLoading && <span className="btn-spinner" aria-hidden="true" />}
                                {actionLoading ? 'Abriendo...' : '▶ Abrir Jornada'}
                            </button>
                        ) : (
                            <button
                                className={`btn btn-danger ${actionLoading ? 'btn-loading' : ''}`}
                                onClick={() => closePeriod(false)}
                                disabled={actionLoading}
                            >
                                {actionLoading && <span className="btn-spinner" aria-hidden="true" />}
                                {actionLoading ? 'Cerrando...' : '■ Cerrar Jornada'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Warning modal: active orders on close */}
                {warning && (
                    <div className="period-warning card">
                        <div className="warning-icon">⚠️</div>
                        <div className="warning-content">
                            <h4>Hay órdenes activas</h4>
                            <p>
                                Existen <strong>{warning.activeOrdersCount}</strong> orden(es) que aún no han sido cobradas.
                                ¿Deseas forzar el cierre de la jornada?
                            </p>
                            <div className="warning-actions">
                                <button
                                    className="btn btn-danger"
                                    onClick={() => { setWarning(null); closePeriod(true); }}
                                    disabled={actionLoading}
                                >
                                    Forzar Cierre
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setWarning(null)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="error-message">⚠️ {error}</div>
                )}

                {/* History */}
                <div className="period-history card">
                    <h3>📋 Historial de Jornadas</h3>
                    {loading ? (
                        <p className="loading-text">Cargando historial...</p>
                    ) : periods.length === 0 ? (
                        <p className="no-data">No hay jornadas registradas</p>
                    ) : (
                        <div className="table-wrapper">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Fecha de Negocio</th>
                                        <th>Abierta</th>
                                        <th>Cerrada</th>
                                        <th>Órdenes</th>
                                        <th className="text-right">Ventas</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {periods.map(p => (
                                        <tr key={p.id}>
                                            <td>{p.id}</td>
                                            <td>{formatBusinessDate(p.business_date)}</td>
                                            <td className="date-cell">
                                                <div>{formatDate(p.opened_at)}</div>
                                                <small className="muted">{p.opened_by_username}</small>
                                            </td>
                                            <td className="date-cell">
                                                {p.closed_at ? (
                                                    <>
                                                        <div>{formatDate(p.closed_at)}</div>
                                                        <small className="muted">{p.closed_by_username}</small>
                                                    </>
                                                ) : '—'}
                                            </td>
                                            <td>{p.order_count || 0}</td>
                                            <td className="text-right">
                                                ${(p.total_revenue || 0).toFixed(2)}
                                            </td>
                                            <td>
                                                <span className={`badge ${p.closed_at ? 'badge-secondary' : 'badge-success'}`}>
                                                    {p.closed_at ? 'Cerrada' : 'Abierta'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SalePeriodControl;
