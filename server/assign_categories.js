const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'restaurant.db');
const db = new sqlite3.Database(DB_PATH);

console.log('=== ASIGNACIÓN DE CATEGORÍAS FALTANTES ===\n');

// Primero, ver qué items no tienen categoría
db.all(`
    SELECT id, name, category 
    FROM menu_items 
    WHERE category IS NULL OR category = ''
    ORDER BY name
`, [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        db.close();
        return;
    }

    if (rows.length === 0) {
        console.log('✅ Todos los items del menú ya tienen categoría asignada!\n');
        db.close();
        return;
    }

    console.log(`⚠️  ${rows.length} items sin categoría:\n`);
    rows.forEach(row => {
        console.log(`   - ${row.name} (ID: ${row.id})`);
    });

    console.log('\n¿Deseas asignar categorías automáticamente basándose en el nombre?');
    console.log('Presiona Ctrl+C para cancelar, o espera 5 segundos para continuar...\n');

    setTimeout(() => {
        console.log('Asignando categorías...\n');

        let updated = 0;
        const updates = rows.map(item => {
            return new Promise((resolve) => {
                // Intentar inferir categoría del nombre
                let category = 'Sin Categoría';
                const name = item.name.toLowerCase();

                if (name.includes('burguer') || name.includes('hamburguesa')) {
                    category = 'Hamburguesas';
                } else if (name.includes('alita') || name.includes('ala')) {
                    category = 'Alitas';
                } else if (name.includes('coca') || name.includes('pepsi') || name.includes('sprite') || name.includes('fanta') || name.includes('agua') || name.includes('refresco')) {
                    category = 'Bebidas';
                } else if (name.includes('malteada') || name.includes('shake')) {
                    category = 'Malteadas';
                } else if (name.includes('papas') || name.includes('fries')) {
                    category = 'Acompañamientos';
                } else if (name.includes('sushi') || name.includes('roll')) {
                    category = 'Sushi';
                } else if (name.includes('entrada') || name.includes('aperitivo')) {
                    category = 'Entradas';
                } else if (name.includes('postre') || name.includes('helado') || name.includes('pastel')) {
                    category = 'Postres';
                }

                db.run(
                    'UPDATE menu_items SET category = ? WHERE id = ?',
                    [category, item.id],
                    (err) => {
                        if (err) {
                            console.error(`   ❌ Error actualizando ${item.name}:`, err.message);
                        } else {
                            console.log(`   ✅ ${item.name} → ${category}`);
                            updated++;
                        }
                        resolve();
                    }
                );
            });
        });

        Promise.all(updates).then(() => {
            console.log(`\n✅ Proceso completado: ${updated}/${rows.length} items actualizados`);
            db.close();
        });
    }, 5000);
});
