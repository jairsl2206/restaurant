const cleanName = (str) => {
    let current = str.trim();
    let changed = true;
    while (changed) {
        changed = false;
        const fullSuffixMatch = current.match(/(.+) x\d+(\.\d+)?( \[(\d+\.?\d*)\])?$/);
        if (fullSuffixMatch) {
            current = fullSuffixMatch[1].trim();
            changed = true;
            continue;
        }
        const priceSuffixMatch = current.match(/(.+) \[(\d+\.?\d*)\]$/);
        if (priceSuffixMatch) {
            current = priceSuffixMatch[1].trim();
            changed = true;
            continue;
        }
        const qtySuffixMatch = current.match(/(.+) x\d+$/);
        if (qtySuffixMatch) {
            current = qtySuffixMatch[1].trim();
            changed = true;
        }
    }
    return current;
};

export const parseInitialItems = (itemsString, menu) => {
    if (!itemsString) return [];

    const parts = itemsString.split(/,\s*(?![^(]*\))/);
    const parsed = [];

    parts.forEach(part => {
        let content = part.trim();
        let itemPrice = 0;

        const priceMatch = content.match(/(.+) \[(\d+\.?\d*)\]$/);
        if (priceMatch) {
            content = priceMatch[1].trim();
            itemPrice = parseFloat(priceMatch[2]);
        }

        const qtyMatch = content.match(/(.+) x(\d+)$/);
        let nameWithNote = content;
        let quantity = 1;
        if (qtyMatch) {
            nameWithNote = qtyMatch[1].trim();
            quantity = parseInt(qtyMatch[2], 10);
        }

        const noteMatch = nameWithNote.match(/(.+?)\s*\((.+)\)$/);
        let name = nameWithNote;
        let note = '';
        if (noteMatch) {
            name = noteMatch[1].trim();
            note = noteMatch[2].trim();
        }

        name = cleanName(name);

        const menuItem = menu ? menu.find(m => m.name === name) : null;
        parsed.push({
            uid: `item_${Date.now()}_${Math.random()}`,
            id: menuItem ? menuItem.id : `legacy_${Date.now()}_${Math.random()}`,
            name: name,
            note: note,
            quantity: quantity,
            price: itemPrice || (menuItem ? menuItem.price : 0),
            image_url: menuItem ? menuItem.image_url : null
        });
    });
    return parsed;
};
