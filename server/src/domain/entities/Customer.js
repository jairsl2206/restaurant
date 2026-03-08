const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * Customer Entity
 * Represents a restaurant customer with contact information.
 */
class Customer {
    constructor({ id, name, phone, address = null, notes = null, createdAt, updatedAt }) {
        this.validate({ name, phone });

        this.id = id;
        this.name = name.trim();
        this.phone = phone ? phone.trim() : null;
        this.address = address;
        this.notes = notes;
        this.createdAt = createdAt ? new Date(createdAt) : new Date();
        this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
    }

    validate({ name, phone }) {
        if (!name || typeof name !== 'string' || name.trim() === '') {
            throw new ValidationError('Customer name is required');
        }
        if (!phone || typeof phone !== 'string' || phone.trim() === '') {
            throw new ValidationError('Customer phone is required');
        }
    }

    // ── Business Rules ────────────────────────────────────────────────────────

    isPlaceholder() {
        // Detect placeholder phone numbers used to avoid real customer tracking
        const placeholders = ['00', '0000000000', '0'];
        return placeholders.includes(this.phone?.replace(/\D/g, '') || '');
    }

    updateContact({ name, phone, address, notes }) {
        return new Customer({
            ...this.toPlain(),
            name: name ?? this.name,
            phone: phone ?? this.phone,
            address: address ?? this.address,
            notes: notes ?? this.notes,
            updatedAt: new Date()
        });
    }

    // ── Serialization ─────────────────────────────────────────────────────────

    toPlain() {
        return {
            id: this.id,
            name: this.name,
            phone: this.phone,
            address: this.address,
            notes: this.notes,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    toJSON() {
        return this.toPlain();
    }
}

module.exports = Customer;
