import { ORDER_STATUS, ORDER_TYPE } from '../constants';

export const getNextStatus = (order) => {
    switch (order.status) {
        case ORDER_STATUS.EN_COCINA:
            if (order.type === ORDER_TYPE.DELIVERY) return ORDER_STATUS.EN_REPARTO;
            if (order.type === ORDER_TYPE.PICKUP)   return ORDER_STATUS.LISTO_PARA_RECOGER;
            return ORDER_STATUS.LISTO_PARA_SERVIR; // DINE_IN
        case ORDER_STATUS.LISTO_PARA_SERVIR:  return ORDER_STATUS.SERVIDO;
        case ORDER_STATUS.SERVIDO:            return ORDER_STATUS.FINALIZADO;
        case ORDER_STATUS.EN_REPARTO:         return ORDER_STATUS.FINALIZADO;
        case ORDER_STATUS.LISTO_PARA_RECOGER: return ORDER_STATUS.FINALIZADO;
        default: return null;
    }
};

export const getStatusSteps = (order) => {
    if (order.type === ORDER_TYPE.DELIVERY) {
        return [ORDER_STATUS.EN_COCINA, ORDER_STATUS.EN_REPARTO, ORDER_STATUS.FINALIZADO];
    }
    if (order.type === ORDER_TYPE.PICKUP) {
        return [ORDER_STATUS.EN_COCINA, ORDER_STATUS.LISTO_PARA_RECOGER, ORDER_STATUS.FINALIZADO];
    }
    return [ORDER_STATUS.EN_COCINA, ORDER_STATUS.LISTO_PARA_SERVIR, ORDER_STATUS.SERVIDO, ORDER_STATUS.FINALIZADO];
};

export const cleanItemName = (str) => {
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

export const parseItemsIndividual = (itemsString) => {
    if (!itemsString) return [];
    const individualItems = [];
    const str = String(itemsString);
    const parts = str.split(/,\s*(?![^(]*\))/);
    let globalIndex = 0;

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
        let qty = 1;
        if (qtyMatch) {
            nameWithNote = qtyMatch[1].trim();
            qty = parseInt(qtyMatch[2], 10);
        }

        const noteMatch = nameWithNote.match(/(.+?)\s*?\((.+)\)$/);
        let name = nameWithNote;
        let note = '';
        if (noteMatch) {
            name = noteMatch[1].trim();
            note = noteMatch[2].trim();
        }

        name = cleanItemName(name);

        for (let i = 0; i < qty; i++) {
            individualItems.push({
                id: `item_${globalIndex}`,
                text: name,
                note: note,
                quantity: 1,
                price: itemPrice,
                checked: false
            });
            globalIndex++;
        }
    });
    return individualItems;
};

/**
 * Builds the item list shown at billing time.
 * Merges parent items with addition items (from sub-orders) when present.
 * Addition items are flagged with isAddition: true.
 */
export const buildBillingItemsList = (order) => {
    const parentItems = parseItemsIndividual(order.items);
    if (!order.additions_items) return parentItems;
    const additionItems = parseItemsIndividual(order.additions_items).map(i => ({ ...i, isAddition: true }));
    return [...parentItems, ...additionItems];
};

export const parseItemsGrouped = (itemsString) => {
    if (!itemsString) return [];
    const str = String(itemsString);
    const parts = str.split(/,\s*(?![^(]*\))/);
    let itemMap = new Map();

    parts.forEach(part => {
        let content = part.trim();

        const priceSuffixMatch = content.match(/(.+) \[(\d+\.?\d*)\]$/);
        if (priceSuffixMatch) {
            content = priceSuffixMatch[1].trim();
        }

        const qtySuffixMatch = content.match(/(.+) x(\d+)$/);
        let nameWithNote = content;
        let qty = 1;

        if (qtySuffixMatch) {
            nameWithNote = qtySuffixMatch[1].trim();
            qty = parseInt(qtySuffixMatch[2], 10);
        }

        const key = nameWithNote.trim();

        if (itemMap.has(key)) {
            itemMap.set(key, itemMap.get(key) + qty);
        } else {
            itemMap.set(key, qty);
        }
    });

    return Array.from(itemMap.entries()).map(([nameWithNote, quantity], index) => {
        const noteMatch = nameWithNote.match(/(.+?)\s*?\((.+)\)$/);
        let name = nameWithNote;
        let note = '';
        if (noteMatch) {
            name = noteMatch[1].trim();
            note = noteMatch[2].trim();
        }

        name = cleanItemName(name);

        return {
            id: `grouped_${index}`,
            text: name,
            note: note,
            quantity: quantity
        };
    });
};
