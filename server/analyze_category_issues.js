const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'restaurant.db');
const db = new sqlite3.Database(DB_PATH);

console.log('=== ANÁLISIS DE ITEMS SIN CATEGORÍA EN REPORTES ===\n');

// Obtener items que aparecen como "Sin Categoría" en reportes
db.all(`
    SELECT 
        oi.item_name,
        COUNT(*) as usage_count,
        m.name as menu_name,
        m.category
    FROM order_items oi
    LEFT JOIN menu_items m ON oi.item_name = m.name
    WHERE m.name IS NULL
    GROUP BY oi.item_name
    ORDER BY usage_count DESC
`, [], (err, unmatchedItems) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    if (unmatchedItems.length === 0) {
        console.log('✅ Todos los items históricos tienen match con menu_items!\n');
        db.close();
        return;
    }

    console.log(`⚠️  ${unmatchedItems.length} nombres de items en order_items sin match:\n`);
    unmatchedItems.forEach(item => {
        console.log(`   "${item.item_name}" (usado ${item.usage_count} veces)`);
    });

    // Obtener todos los items del menú para comparación
    db.all('SELECT name, category FROM menu_items ORDER BY name', [], (err, menuItems) => {
        if (err) {
            console.error('Error:', err);
            db.close();
            return;
        }

        console.log('\n=== POSIBLES CORRECCIONES ===\n');

        const corrections = [];
        unmatchedItems.forEach(orderItem => {
            // Limpiar el nombre (quitar notas entre paréntesis)
            const cleanName = orderItem.item_name.replace(/\s*\(.+\)$/, '').trim();

            // Buscar match exacto con nombre limpio
            let match = menuItems.find(m => m.name === cleanName);

            // Si no hay match exacto, buscar similar (case-insensitive)
            if (!match) {
                match = menuItems.find(m =>
                    m.name.toLowerCase() === cleanName.toLowerCase()
                );
            }

            // Si aún no hay match, buscar parcial
            if (!match) {
                match = menuItems.find(m =>
                    cleanName.toLowerCase().includes(m.name.toLowerCase()) ||
                    m.name.toLowerCase().includes(cleanName.toLowerCase())
                );
            }

            if (match) {
                corrections.push({
                    oldName: orderItem.item_name,
                    newName: match.name,
                    category: match.category,
                    count: orderItem.usage_count
                });
                console.log(`   "${orderItem.item_name}"`);
                console.log(`   → "${match.name}" (${match.category})`);
                console.log(`   Afecta ${orderItem.usage_count} registros\n`);
            } else {
                console.log(`   ⚠️  "${orderItem.item_name}" - No se encontró match sugerido\n`);
            }
        });

        if (corrections.length > 0) {
            console.log('\n=== SCRIPT DE CORRECCIÓN ===\n');
            console.log('Para aplicar estas correcciones, ejecuta:\n');
            console.log('node server/apply_category_fixes.js\n');

            // Guardar correcciones en un archivo JSON
            const fs = require('fs');
            fs.writeFileSync(
                path.join(__dirname, 'category_corrections.json'),
                JSON.stringify(corrections, null, 2)
            );
            console.log('✅ Correcciones guardadas en server/category_corrections.json');
        }

        db.close();
    });
});
