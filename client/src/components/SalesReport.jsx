import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import './SalesReport.css';
import './SalesReportPeriod.css';

function SalesReport() {
    const [startDate, setStartDate] = useState(getThirtyDaysAgo());
    const [endDate, setEndDate] = useState(getToday());
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    // Helpers for default dates
    function getToday() {
        return new Date().toISOString().split('T')[0];
    }
    function getThirtyDaysAgo() {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    }

    const fetchReport = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/reports/sales?startDate=${startDate}&endDate=${endDate}`);
            if (response.ok) {
                const data = await response.json();
                setReport(data);
            } else {
                console.error('Failed to fetch report');
            }
        } catch (err) {
            console.error('Error fetching report:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []); // Initial load

    // Calculate max value for chart scaling
    const maxDailyRevenue = report?.dailySales?.reduce((max, day) => Math.max(max, day.daily_revenue), 0) || 1;

    return (
        <div className="sales-report fade-in">
            <div className="manager-content">
                <div className="manager-header">
                    <h2>📈 Reporte de Ventas</h2>
                    <div className="date-filters">
                        <div className="filter-group">
                            <label>Desde:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label>Hasta:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
                            {loading ? 'Cargando...' : 'Filtrar'}
                        </button>
                    </div>
                </div>

                <div className="period-info">
                    <p>ℹ️ Los reportes usan períodos de <strong>6am a 6am</strong> (las ventas después de medianoche se cuentan en el día de negocio)</p>
                </div>

                {loading && !report ? (
                    <div className="loading-spinner">Cargando reporte...</div>
                ) : report ? (
                    <div className="report-content">
                        {/* Summary Cards */}
                        <div className="summary-cards">
                            <div className="card summary-card revenue">
                                <div className="card-icon">💰</div>
                                <div className="card-info">
                                    <h3>Ventas Totales</h3>
                                    <div className="big-value">${report.summary.total_revenue?.toFixed(2) || '0.00'}</div>
                                </div>
                            </div>
                            <div className="card summary-card orders">
                                <div className="card-icon">🧾</div>
                                <div className="card-info">
                                    <h3>Total Órdenes</h3>
                                    <div className="big-value">{report.summary.total_orders || 0}</div>
                                </div>
                            </div>
                            <div className="card summary-card average">
                                <div className="card-icon">📊</div>
                                <div className="card-info">
                                    <h3>Ticket Promedio</h3>
                                    <div className="big-value">${report.summary.average_ticket?.toFixed(2) || '0.00'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="charts-grid">
                            {/* Daily Sales Chart */}
                            <div className="chart-section card">
                                <h3>Ventas por Período (6am-6am)</h3>
                                <div className="chart-container">
                                    {report.dailySales.length === 0 ? (
                                        <p className="no-data">No hay datos en este periodo</p>
                                    ) : (
                                        <div className="bar-chart">
                                            {report.dailySales.map((day) => (
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

                            {/* Top Items by Category */}
                            <div className="top-items-section card">
                                <h3>🏆 Productos Más Vendidos por Categoría</h3>
                                <div className="table-wrapper">
                                    {report.topItems.length === 0 ? (
                                        <p className="no-data">No hay ventas registradas</p>
                                    ) : (
                                        report.topItems.map((category, catIdx) => (
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
