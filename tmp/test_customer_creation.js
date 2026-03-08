const db = require('../server/db');

async function testCustomerCreation() {
    console.log('Starting Customer Creation Test...');

    try {
        const customerName = 'Test Customer ' + Date.now();
        const customerPhone = '555' + Math.floor(Math.random() * 1000000);
        const customerAddress = 'Test Address 123';

        const customerId = await new Promise((resolve, reject) => {
            db.createCustomer(customerName, customerPhone, customerAddress, (err, id) => {
                if (err) reject(err); else resolve(id);
            });
        });
        console.log('✅ Created customer:', customerId);

        // Verify customer data
        const customer = await new Promise((resolve, reject) => {
            db.getCustomerById(customerId, (err, row) => {
                if (err) reject(err); else resolve(row);
            });
        });

        console.log('Customer Data:', JSON.stringify(customer, null, 2));

        if (customer && customer.id === customerId && customer.address === customerAddress) {
            console.log('✅ TEST PASSED: Customer created with address successfully.');
        } else {
            console.error('❌ TEST FAILED: Customer data mismatch.');
        }

    } catch (err) {
        console.error('❌ TEST FAILED:', err);
    } finally {
        db.close();
    }
}

testCustomerCreation();
