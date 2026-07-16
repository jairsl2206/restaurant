import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import { apiGet } from '../utils/api';
import './SalesReport.css';
import './SalesReportPeriod.css';

const PAYMENT_DISPLAY = {
    CASH:         { emoji: '💵', label: 'Efectivo' },
    CARD:         { emoji: '💳', label: 'Tarjeta' },
    TRANSFER:     { emoji: '📲', label: 'Transferencia' },
    OTHER:        { emoji: '💱', label: 'Otro' },
    SIN_REGISTRO: { emoji: '❓', label: 'Sin registro' },
};

function SalesReport() {
    const [mode, setMode] = useState('date');

    const [startDate, setStartDate] = useState(getThirtyDaysAgo());
    const [endDate, setEndDate] = useState(getToday());
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [periods, setPeriods] = useState([]);
    const [periodsLoading, setPeriodsLoading] = useState(false);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [periodReport, setPeriodReport] = useState(null);
    const [periodReportLoading, setPeriodReportLoading] = useState(false);
    const [periodError, setPeriodError] = useState(null);

    const [topItemsExpanded, setTopItemsExpanded] = useState(false);

    function getToday() { return new Date().toISOString().split('T')[0]; }
    function getThirtyDaysAgo() {
        const d = new Date(); d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    }

    const fetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiGet(`${API_BASE_URL}/reports/sales?startDate=${startDate}&endDate=${endDate}`);
            setReport(data);
        } catch (err) {
            setError(err.message || 'Error al cargar el reporte');
        } finally { setLoading(false); }
    };

    const fetchPeriods = async () => {
        setPeriodsLoading(true);
        try {
            const data = await apiGet(`${API_BASE_URL}/sale-periods`);
            setPeriods(data);
        } catch (err) { console.error('Error fetching periods:', err); }
        finally { setPeriodsLoading(false); }
    };

    const fetchPeriodReport = async (id) => {
        if (!id) return;
        setPeriodReportLoading(true);
        setPeriodReport(null);
        setPeriodError(null);
        try {
            const data = await apiGet(`${API_BASE_URL}/sale-periods/${id}/report`);
            setPeriodReport(data);
        } catch (err) {
            setPeriodError(err.message || 'Error al cargar el reporte');
        } finally { setPeriodReportLoading(false); }
    };

    useEffect(() => { fetchReport(); }, []);
    useEffect(() => {
        if (mode === 'period') fetchPeriods();
    }, [mode]);
    useEffect(() => {
        if (selectedPeriodId) fetchPeriodReport(selectedPeriodId);
    }, [selectedPeriodId]);

    const formatBusinessDate = (dateStr) => {
        if (!dateStr) return dateStr;
        const [y, m, d] = dateStr.split('-');
        return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const activeReport = mode === 'period' ? periodReport : report;
    const activeError = mode === 'period' ? periodError : error;
    const activeLoading = mode === 'period' ? periodReportLoading : (loading && !report);
    const maxDailyRevenue = activeReport?.dailySales?.reduce((max, day) => Math.max(max, day.daily_revenue), 0) || 1;
    const barChartMinWidth = activeReport?.dailySales?.length ? Math.max(activeReport.dailySales.length * 35, 100) : 0;
    const showEmptyState = mode === 'period' && !selectedPeriodId;

    return (
        <div className="sales-report fade-in">
            <div className="manager-content">
                <div className="manager-header">
                    <h2>📈 Reporte de Ventas</h2>

                    <div className="report-mode-toggle" role="tablist" aria-label="Modo de reporte">
                        <button
                            className={`toggle-btn ${mode === 'date' ? 'active' : ''}`}
                            onClick={() => setMode('date')}
                            role="tab"
                            aria-selected={mode === 'date'}
                        >
                            📅 Por Fecha
                        </button>
                        <button
                            className={`toggle-btn ${mode === 'period' ? 'active' : ''}`}
                            onClick={() => setMode('period')}
                            role="tab"
                            aria-selected={mode === 'period'}
                        >
                            🗓️ Por Jornada
                        </button>
                    </div>

                    {mode === 'date' && (
                        <div className="date-filters">
                            <div className="filter-group">
                                <label>Desde:</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            </div>
                            <div className="filter-group">
                                <label>Hasta:</label>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                            <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
                                {loading ? 'Cargando...' : 'Filtrar'}
                            </button>
                        </div>
                    )}

                    {mode === 'period' && (
                        <div className="date-filters">
                            <div className="filter-group">
                                <label>Jornada:</label>
                                <select
                                    value={selectedPeriodId}
                                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                                    disabled={periodsLoading}
                                >
                                    <option value="">— Selecciona una jornada —</option>
                                    {periods.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {formatBusinessDate(p.business_date)} ({p.closed_at ? 'Cerrada' : 'Abierta'}) — ${(p.total_revenue || 0).toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {activeError && (
                    <div className="report-error">
                        <p>⚠️ {activeError}</p>
                        <button className="btn-retry" onClick={() => mode === 'date' ? fetchReport() : fetchPeriodReport(selectedPeriodId)}>
                            Reintentar
                        </button>
                    </div>
                )}

                {mode === 'period' && periodReport?.period && (
                    <div className="period-info">
                        <p>
                            🗓️ Jornada del <strong>{formatBusinessDate(periodReport.period.business_date)}</strong>
                            {' '}— abierta por <strong>{periodReport.period.opened_by_username}</strong>
                            {periodReport.period.closed_at ? '' : ' · Aún abierta'}
                        </p>
                    </div>
                )}

                {showEmptyState ? (
                    <div className="report-empty-state">
                        <div className="empty-icon">📋</div>
                        <p>Selecciona una jornada para ver el reporte</p>
                    </div>
                ) : activeLoading ? (
                    <div className="loading-spinner">Cargando reporte...</div>
                ) : activeReport ? (
                    <div className="report-content">
                        <div className="summary-cards">
                            <div className="card summary-card revenue">
                                <div className="card-icon">💰</div>
                                <div className="card-info">
                                    <h3>Ventas Totales</h3>
                                    <div className="big-value">${activeReport.summary.total_revenue?.toFixed(2) || '0.00'}</div>
                                </div>
                            </div>
                            <div className="card summary-card orders">
                                <div className="card-icon">🧾</div>
                                <div className="card-info">
                                    <h3>Total Órdenes</h3>
                                    <div className="big-value">{activeReport.summary.total_orders || 0}</div>
                                </div>
                            </div>
                            <div className="card summary-card average">
                                <div className="card-icon">📊</div>
                                <div className="card-info">
                                    <h3>Ticket Promedio</h3>
                                    <div className="big-value">${activeReport.summary.average_ticket?.toFixed(2) || '0.00'}</div>
                                </div>
                            </div>
                        </div>

                        <div className={`charts-row ${mode !== 'date' ? 'charts-row--single' : ''}`}>
                            {mode === 'date' && (
                                <div className="chart-section card">
                                    <h3>Ventas por Día</h3>
                                    <div className="chart-container">
                                        {activeReport.dailySales.length === 0 ? (
                                            <p className="no-data">No hay datos en este periodo</p>
                                        ) : (
                                            <div
                                                className="bar-chart"
                                                style={{ minWidth: `${barChartMinWidth}px` }}
                                                role="img"
                                                aria-label="Gráfico de ventas por día"
                                            >
                                                {activeReport.dailySales.map((day) => (
                                                    <div key={day.date} className="chart-bar-group">
                                                        <div
                                                            className="chart-bar"
                                                            style={{ height: `${(day.daily_revenue / maxDailyRevenue) * 100}%` }}
                                                            title={`$${day.daily_revenue.toFixed(2)} - ${day.orders_count} órdenes`}
                                                            role="img"
                                                            aria-label={`${day.date}: $${day.daily_revenue.toFixed(2)}, ${day.orders_count} órdenes`}
                                                        ></div>
                                                        <span className="bar-label">{day.date.split('-')[2]}/{day.date.split('-')[1]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="charts-side">
                                {activeReport.byWaiter && activeReport.byWaiter.length > 0 && (
                                    <div className="top-items-section card">
                                        <h3>🧑‍💼 Ventas por Mesero</h3>
                                        <div className="table-wrapper">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Mesero</th>
                                                        <th className="text-right">Órdenes</th>
                                                        <th className="text-right">Ingresos</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {activeReport.byWaiter.map((row, idx) => (
                                                        <tr key={idx}>
                                                            <td className="td-name" data-label="Mesero">{row.waiter_username || '—'}</td>
                                                            <td className="text-right" data-label="Órdenes">{row.order_count}</td>
                                                            <td className="text-right" data-label="Ingresos">${Number(row.revenue).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeReport.byPaymentMethod && activeReport.byPaymentMethod.length > 0 && (() => {
                                    const totalRev = activeReport.byPaymentMethod.reduce((s, r) => s + (Number(r.revenue) || 0), 0) || 1;
                                    return (
                                        <div className="top-items-section card">
                                            <h3>💳 Ventas por Medio de Pago</h3>
                                            <div className="payment-method-bars">
                                                {activeReport.byPaymentMethod.map((row, idx) => {
                                                    const p = PAYMENT_DISPLAY[row.payment_method] || { emoji: '❓', label: row.payment_method };
                                                    const pct = Math.round((Number(row.revenue) / totalRev) * 100);
                                                    const orderLabel = `${row.order_count} orden${row.order_count !== 1 ? 'es' : ''}`;
                                                    return (
                                                        <div key={idx}>
                                                            <div className="payment-method-bar-label">
                                                                <span>{p.emoji} {p.label}</span>
                                                                <span>{orderLabel} · ${Number(row.revenue).toFixed(2)}</span>
                                                            </div>
                                                            <div className="payment-method-bar-track">
                                                                <div
                                                                    className="payment-method-bar-fill"
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Top Items — collapsed by default */}
                        {activeReport.topItems.length > 0 && (
                            <div className={`top-items-collapsed ${topItemsExpanded ? 'expanded' : ''}`}>
                                <button
                                    className="collapse-toggle"
                                    onClick={() => setTopItemsExpanded(!topItemsExpanded)}
                                    aria-expanded={topItemsExpanded}
                                >
                                    <span>🏆 Productos Más Vendidos por Categoría</span>
                                    <span className="collapse-arrow">{topItemsExpanded ? '▲' : '▼'}</span>
                                </button>
                                <div className="collapse-body">
                                    <div className="table-wrapper">
                                        {activeReport.topItems.map((category, catIdx) => (
                                            <div key={catIdx} className="category-group">
                                                <div className="category-header">
                                                    <h4>{category.category}</h4>
                                                    <span className="category-total">${category.totalRevenue.toFixed(2)}</span>
                                                </div>
                                                <table className="data-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Producto</th>
                                                            <th className="text-right">Vendidos</th>
                                                            <th className="text-right">Ingresos</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {category.items.map((item, idx) => (
                                                            <tr key={idx}>
                                                                <td className="td-name" data-label="Producto">{item.item_name}</td>
                                                                <td className="text-right" data-label="Vendidos">{item.quantity_sold}</td>
                                                                <td className="text-right" data-label="Ingresos">${item.item_revenue.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default SalesReport;
