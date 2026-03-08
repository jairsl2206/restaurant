const IReportRepository = require('../../../domain/repositories/IReportRepository');

class ReportRepository extends IReportRepository {
    constructor(db) {
        super();
        this.db = db;
    }

    async getSalesReport(startDate, endDate) {
        // Period-based reporting: 6am to 6am
        const calculatePeriodBounds = (date) => {
            const periodStart = `${date} 06:00:00`;
            const d = new Date(date);
            d.setDate(d.getDate() + 1);
            const nextDay = d.toISOString().split('T')[0];
            const periodEnd = `${nextDay} 05:59:59`;
            return { periodStart, periodEnd };
        };

        const startPeriod = calculatePeriodBounds(startDate || '1970-01-01');
        const endPeriod = calculatePeriodBounds(endDate || new Date().toISOString().split('T')[0]);
        const start = startPeriod.periodStart;
        const end = endPeriod.periodEnd;

        // 1. Summary
        const sqlSummary = `
            SELECT 
                COUNT(*) as total_orders, 
                SUM(total) as total_revenue, 
                AVG(total) as average_ticket 
            FROM orders 
            WHERE status = 'PAGO RECIBIDO' 
            AND created_at BETWEEN ? AND ?
        `;
        const summary = await this.db.get(sqlSummary, [start, end]);

        // 2. Daily Sales
        const sqlDaily = `
            SELECT created_at, total FROM orders 
            WHERE status = 'PAGO RECIBIDO' AND created_at BETWEEN ? AND ? 
            ORDER BY created_at ASC
        `;
        const orderRows = await this.db.all(sqlDaily, [start, end]);

        const periodMap = {};
        orderRows.forEach(order => {
            const orderDate = new Date(order.created_at);
            const hour = orderDate.getHours();
            let periodDate = new Date(orderDate);
            if (hour < 6) periodDate.setDate(periodDate.getDate() - 1);
            const periodKey = periodDate.toISOString().split('T')[0];

            if (!periodMap[periodKey]) {
                periodMap[periodKey] = { date: periodKey, orders_count: 0, daily_revenue: 0 };
            }
            periodMap[periodKey].orders_count++;
            periodMap[periodKey].daily_revenue += order.total;
        });

        // 3. Top Items by Category
        const sqlItems = `
            SELECT 
                COALESCE(m.category, 'Sin Categoría') as category,
                oi.item_name, 
                SUM(oi.quantity) as quantity_sold, 
                SUM(oi.price * oi.quantity) as item_revenue 
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            LEFT JOIN menu_items m ON TRIM(
                CASE 
                    WHEN oi.item_name LIKE '% (%)' THEN 
                        SUBSTR(oi.item_name, 1, INSTR(oi.item_name, ' (') - 1)
                    ELSE oi.item_name
                END
            ) = TRIM(m.name) COLLATE NOCASE
            WHERE o.status = 'PAGO RECIBIDO' 
            AND o.created_at BETWEEN ? AND ?
            GROUP BY m.category, oi.item_name
            ORDER BY m.category ASC, quantity_sold DESC
        `;
        const itemRows = await this.db.all(sqlItems, [start, end]);

        const categoryMap = {};
        itemRows.forEach(item => {
            const category = item.category;
            if (!categoryMap[category]) {
                categoryMap[category] = { category, items: [] };
            }
            categoryMap[category].items.push({
                item_name: item.item_name,
                quantity_sold: item.quantity_sold,
                item_revenue: item.item_revenue
            });
        });

        const topItems = Object.values(categoryMap).map(cat => {
            const totalRevenue = cat.items.reduce((sum, item) => sum + item.item_revenue, 0);
            return { ...cat, totalRevenue };
        }).sort((a, b) => b.totalRevenue - a.totalRevenue);

        return {
            summary: summary || { total_orders: 0, total_revenue: 0, average_ticket: 0 },
            dailySales: Object.values(periodMap).sort((a, b) => a.date.localeCompare(b.date)),
            topItems
        };
    }
}

module.exports = ReportRepository;
