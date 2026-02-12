const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'restaurant.db');
const db = new sqlite3.Database(DB_PATH);

console.log('=== DIAGNÓSTICO DE CATEGORÍAS ===\n');

// 1. Ver items sin categoría
console.log('1. Items en order_items que NO tienen match en menu_items:\n');
db.all(`
    SELECT DISTINCT oi.item_name, COUNT(*) as count
    FROM order_items oi
    LEFT JOIN menu_items m ON oi.item_name = m.name
    WHERE m.name IS NULL
    GROUP BY oi.item_name
    ORDER BY count DESC
`, [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        return;
    }

    if (rows.length === 0) {
        console.log('✅ Todos los items tienen match perfecto!\n');
    } else {
        console.log(`⚠️  ${rows.length} items sin match:\n`);
        rows.forEach(row => {
            console.log(`   - "${row.item_name}" (usado ${row.count} veces)`);
        });
        console.log('');
    }

    // 2. Ver items del menú actual
    console.log('2. Items actuales en menu_items:\n');
    db.all(`
        SELECT name, category 
        FROM menu_items 
        ORDER BY category, name
    `, [], (err, menuRows) => {
        if (err) {
            console.error('Error:', err);
            db.close();
            return;
        }

        const byCategory = {};
        menuRows.forEach(item => {
            const cat = item.category || 'Sin Categoría';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(item.name);
        });

        Object.keys(byCategory).forEach(cat => {
            console.log(`   ${cat}:`);
            byCategory[cat].forEach(name => {
                console.log(`      - ${name}`);
            });
        });

        console.log('\n3. Sugerencias de corrección:\n');

        // Intentar encontrar matches similares
        if (rows.length > 0) {
            rows.forEach(orderItem => {
                const cleanName = orderItem.item_name.replace(/\s*\(.+\)$/, '').trim();
                const possibleMatch = menuRows.find(m =>
                    m.name.toLowerCase() === cleanName.toLowerCase() ||
                    cleanName.toLowerCase().includes(m.name.toLowerCase()) ||
                    m.name.toLowerCase().includes(cleanName.toLowerCase())
                );

                if (possibleMatch) {
                    console.log(`   "${orderItem.item_name}" → podría ser "${possibleMatch.name}" (${possibleMatch.category})`);
                }
            });
        }

        db.close();
        console.log('\n=== FIN DEL DIAGNÓSTICO ===');
    });
});
