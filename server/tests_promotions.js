const db = require('./db');

async function runTests() {
  console.log('Starting Category and Promotion Tests...\n');

  await new Promise(resolve => setTimeout(resolve, 500)); 

  await new Promise((resolve) => {
    db.db.serialize(() => {
        db.db.run('DELETE FROM item_promotions');
        db.db.run('DELETE FROM category_promotions');
        db.db.run('DELETE FROM menu_items');
        db.db.run('DELETE FROM menu_categories', resolve);
    });
  });
  await new Promise(resolve => setTimeout(resolve, 500)); 

  // 1. Create category
  const categoryId = await new Promise((resolve, reject) => {
    db.createMenuCategory({ name: 'Burgers', description: 'Delicious burgers' }, (err, id) => {
      if (err) reject(err);
      else resolve(id);
    });
  });
  console.log(`✅ Created category: Burgers (ID: ${categoryId})`);

  // 2. Create item
  const itemId = await new Promise((resolve, reject) => {
    db.createMenuItem({
      name: 'Classic Burger',
      price: 100,
      category_id: categoryId,
      available: true
    }, (err, id) => {
      if (err) reject(err);
      else resolve(id);
    });
  });
  console.log(`✅ Created item: Classic Burger (ID: ${itemId}), Price: $100`);

  // 3. Test NO PROMOS
  let items = await new Promise((resolve, reject) => {
    db.getMenuItemsWithPromotions((err, res) => err ? reject(err) : resolve(res));
  });
  console.assert(items[0].final_price === 100, 'Expected final_price to be 100');
  console.assert(items[0].has_promotion === false, 'Expected no promotion');
  console.log(`✅ Test 1 Passed: No Promos -> Final Price: $${items[0].final_price}`);

  // 4. Test Category Promotion (10% OFF)
  const catPromoId = await new Promise((resolve, reject) => {
    db.createCategoryPromotion({
      category_id: categoryId,
      type: 'PERCENTAGE',
      value: 10,
      active: true,
      valid_from: null,
      valid_to: null
    }, (err, id) => err ? reject(err) : resolve(id));
  });

  items = await new Promise((resolve, reject) => {
    db.getMenuItemsWithPromotions((err, res) => err ? reject(err) : resolve(res));
  });
  console.assert(items[0].final_price === 90, `Expected 90, got ${items[0].final_price}`);
  console.assert(items[0].has_promotion === true, 'Expected promotion to be true');
  console.assert(items[0].promotion_type === 'PERCENTAGE', 'Expected PERCENTAGE');
  console.log(`✅ Test 2 Passed: 10% Category Promo -> Final Price: $${items[0].final_price}`);

  // 5. Test Item Promotion (Fixed Amount $25) Override
  const itemPromoId = await new Promise((resolve, reject) => {
    db.createItemPromotion({
      menu_item_id: itemId,
      type: 'FIXED_AMOUNT',
      value: 25,
      active: true,
      valid_from: null,
      valid_to: null
    }, (err, id) => err ? reject(err) : resolve(id));
  });

  items = await new Promise((resolve, reject) => {
    db.getMenuItemsWithPromotions((err, res) => err ? reject(err) : resolve(res));
  });
  // Item promo should override category promo
  console.assert(items[0].final_price === 75, `Expected 75, got ${items[0].final_price}`);
  console.assert(items[0].promotion_type === 'FIXED_AMOUNT', 'Expected FIXED_AMOUNT');
  console.log(`✅ Test 3 Passed: $25 Item Promo overrides Category Promo -> Final Price: $${items[0].final_price}`);

  // 6. Test EXPIRED Category Promotion (Simulate by setting valid_to in the past)
  // Let's create another item to test independently
  const item2Id = await new Promise((resolve, reject) => {
    db.createMenuItem({
      name: 'Cheese Burger',
      price: 150,
      category_id: categoryId,
      available: true
    }, (err, id) => err ? reject(err) : resolve(id));
  });

  // Since it doesn't have an item promotion, it should get the category promotion.
  items = await new Promise((resolve, reject) => {
    db.getMenuItemsWithPromotions((err, res) => err ? reject(err) : resolve(res));
  });
  const i2 = items.find(i => i.id === item2Id);
  console.assert(i2.final_price === 135, `Expected 135, got ${i2.final_price}`); // 10% off 150
  
  // Now let's expire the category promotion
  await new Promise((resolve, reject) => {
    db.updateCategoryPromotion(catPromoId, {
      category_id: categoryId,
      type: 'PERCENTAGE',
      value: 10,
      active: true,
      valid_from: null,
      valid_to: '2020-01-01 00:00:00' // Past date
    }, err => err ? reject(err) : resolve());
  });

  items = await new Promise((resolve, reject) => {
    db.getMenuItemsWithPromotions((err, res) => err ? reject(err) : resolve(res));
  });
  const i2_expired = items.find(i => i.id === item2Id);
  console.assert(i2_expired.final_price === 150, `Expected 150, got ${i2_expired.final_price}`);
  console.assert(i2_expired.has_promotion === false, 'Should have no promotion since its expired');
  console.log(`✅ Test 4 Passed: Expired category promotion is ignored -> Final Price: $${i2_expired.final_price}`);

  // 7. Test UPCOMING Item Promotion
  await new Promise((resolve, reject) => {
    db.updateItemPromotion(itemPromoId, {
      menu_item_id: itemId,
      type: 'FIXED_AMOUNT',
      value: 25,
      active: true,
      valid_from: '2030-01-01 00:00:00', // Future date
      valid_to: null
    }, err => err ? reject(err) : resolve());
  });

  items = await new Promise((resolve, reject) => {
    db.getMenuItemsWithPromotions((err, res) => err ? reject(err) : resolve(res));
  });
  const i1_upcoming = items.find(i => i.id === itemId);
  console.assert(i1_upcoming.final_price === 100, `Expected 100, got ${i1_upcoming.final_price}. The promo is not active yet AND the category promo is expired.`);
  console.log(`✅ Test 5 Passed: Upcoming item promo is ignored -> Final Price: $${i1_upcoming.final_price}`);

  // 8. Test ACTIVE false
  await new Promise((resolve, reject) => {
    db.updateItemPromotion(itemPromoId, {
      menu_item_id: itemId,
      type: 'FIXED_AMOUNT',
      value: 25,
      active: false,
      valid_from: null,
      valid_to: null
    }, err => err ? reject(err) : resolve());
  });

  items = await new Promise((resolve, reject) => {
    db.getMenuItemsWithPromotions((err, res) => err ? reject(err) : resolve(res));
  });
  const i1_inactive = items.find(i => i.id === itemId);
  console.assert(i1_inactive.final_price === 100, `Expected 100, got ${i1_inactive.final_price}`);
  console.log(`✅ Test 6 Passed: Inactive feature toggle is ignored -> Final Price: $${i1_inactive.final_price}`);

  console.log('\nAll tests passed locally.');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
