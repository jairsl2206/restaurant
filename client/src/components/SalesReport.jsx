import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import { apiGet } from '../utils/api';
import './SalesReport.css';
import './SalesReportPeriod.css';

function SalesReport() {
    const [mode, setMode] = useState('date'); // 'date' | 'period'

    // ── By Date state ──
    const [startDate, setStartDate] = useState(getThirtyDaysAgo());
    const [endDate, setEndDate] = useState(getToday());
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    // ── By Period state ──
    const [periods, setPeriods] = useState([]);
    const [periodsLoading, setPeriodsLoading] = useState(false);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [periodReport, setPeriodReport] = useState(null);
    const [periodReportLoading, setPeriodReportLoading] = useState(false);

    function getToday() { return new Date().toISOString().split('T')[0]; }
    function getThirtyDaysAgo() {
        const d = new Date(); d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    }

    const fetchReport = async () => {
        setLoading(true);
        try {
            const data = await apiGet(`${API_BASE_URL}/reports/sales?startDate=${startDate}&endDate=${endDate}`);
            setReport(data);
        } catch (err) { console.error('Error fetching report:', err); }
        finally { setLoading(false); }
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
        try {
            const data = await apiGet(`${API_BASE_URL}/sale-periods/${id}/report`);
            setPeriodReport(data);
        } catch (err) { console.error('Error fetching period report:', err); }
        finally { setPeriodReportLoading(false); }
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
    const maxDailyRevenue = activeReport?.dailySales?.reduce((max, day) => Math.max(max, day.daily_revenue), 0) || 1;

    return (
        <div className="sales-report fade-in">
            <div className="manager-content">
                <div className="manager-header">
                    <h2>📈 Reporte de Ventas</h2>

                    {/* Mode toggle */}
                    <div className="report-mode-toggle">
                        <button
                            className={`toggle-btn ${mode === 'date' ? 'active' : ''}`}
                            onClick={() => setMode('date')}
                        >
                            📅 Por Fecha
                        </button>
                        <button
                            className={`toggle-btn ${mode === 'period' ? 'active' : ''}`}
                            onClick={() => setMode('period')}
                        >
                            🗓️ Por Jornada
                        </button>
                    </div>

                    {/* By Date filters */}
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

                    {/* By Period selector */}
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

                {mode === 'period' && periodReport?.period && (
                    <div className="period-info">
                        <p>
                            🗓️ Jornada del <strong>{formatBusinessDate(periodReport.period.business_date)}</strong>
                            {' '}— abierta por <strong>{periodReport.period.opened_by_username}</strong>
                            {periodReport.period.closed_at ? '' : ' · Aún abierta'}
                        </p>
                    </div>
                )}

                {(mode === 'date' ? (loading && !report) : periodReportLoading) ? (
                    <div className="loading-spinner">Cargando reporte...</div>
                ) : activeReport ? (
                    <div className="report-content">
                        {/* Summary Cards */}
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

                        <div className={mode === 'date' ? 'charts-grid' : 'charts-grid charts-grid--single'}>
                            {mode === 'date' && (
                                <div className="chart-section card">
                                    <h3>Ventas por Día</h3>
                                    <div className="chart-container">
                                        {activeReport.dailySales.length === 0 ? (
                                            <p className="no-data">No hay datos en este periodo</p>
                                        ) : (
                                            <div className="bar-chart">
                                                {activeReport.dailySales.map((day) => (
                                                    <div key={day.date} className="chart-bar-group">
                                                        <div
                                                            className="chart-bar"
                                                            style={{ height: `${(day.daily_revenue / maxDailyRevenue) * 100}%` }}
                                                            title={`$${day.daily_revenue.toFixed(2)} - ${day.orders_count} órdenes`}
                                                        ></div>
                                                        <span className="bar-label">{day.date.split('-')[2]}/{day.date.split('-')[1]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Top Items by Category */}
                            <div className="top-items-section card">
                                <h3>🏆 Productos Más Vendidos por Categoría</h3>
                                <div className="table-wrapper">
                                    {activeReport.topItems.length === 0 ? (
                                        <p className="no-data">No hay ventas registradas</p>
                                    ) : (
                                        activeReport.topItems.map((category, catIdx) => (
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
                                                                <td>{item.item_name}</td>
                                                                <td className="text-right">{item.quantity_sold}</td>
                                                                <td className="text-right">${item.item_revenue.toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default SalesReport;
