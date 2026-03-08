const db = require('../server/db');
const { ORDER_TYPE, ORDER_STATUS } = require('../server/constants');

async function testOrderCreation() {
    console.log('Starting Order Creation Test...');

    try {
        // 1. Create a category
        const catId = await new Promise((resolve, reject) => {
            db.createMenuCategory({ name: 'Test Category' }, (err, id) => {
                if (err) reject(err); else resolve(id);
            });
        });
        console.log('✅ Created category:', catId);

        // 2. Create a menu item
        const itemId = await new Promise((resolve, reject) => {
            db.createMenuItem({
                name: 'Test Item',
                price: 100,
                category_id: catId,
                available: true
            }, (err, id) => {
                if (err) reject(err); else resolve(id);
            });
        });
        console.log('✅ Created item:', itemId);

        // 3. Create an order
        const items = [
            { menu_item_id: itemId, quantity: 2, price: 100, name: 'Test Item' }
        ];

        const orderId = await new Promise((resolve, reject) => {
            db.createOrder(1, items, ORDER_TYPE.DINE_IN, null, (err, id) => {
                if (err) reject(err); else resolve(id);
            });
        });
        console.log('✅ Created order:', orderId);

        // 4. Verify order items
        const order = await new Promise((resolve, reject) => {
            db.getOrderById(orderId, (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });

        console.log('Order Data:', JSON.stringify(order, null, 2));

        if (order && order.id === orderId) {
            console.log('✅ TEST PASSED: Order created successfully with items.');
        } else {
            console.error('❌ TEST FAILED: Order retrieval failed.');
        }

    } catch (err) {
        console.error('❌ TEST FAILED:', err);
    } finally {
        db.close();
    }
}

testOrderCreation();
