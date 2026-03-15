/**
 * Application-wide constants and ENUMs
 * Aligned with the database schema
 */

const ORDER_STATUS = {
    EN_COCINA:          'EN_COCINA',
    LISTO_PARA_SERVIR:  'LISTO_PARA_SERVIR',
    SERVIDO:            'SERVIDO',
    EN_REPARTO:         'EN_REPARTO',
    LISTO_PARA_RECOGER: 'LISTO_PARA_RECOGER',
    FINALIZADO:         'FINALIZADO'
};

const ORDER_TYPE = {
    DINE_IN:  'DINE_IN',
    DELIVERY: 'DELIVERY',
    PICKUP:   'PICKUP'
};

const USER_ROLE = {
    WAITER:  'waiter',
    COOK:    'cook',
    ADMIN:   'admin',
    MANAGER: 'manager'
};

const PROMOTION_TYPE = {
    PERCENTAGE:   'PERCENTAGE',
    FIXED_AMOUNT: 'FIXED_AMOUNT',
    BUNDLE:       'BUNDLE'
};

const PAYMENT_METHOD = {
    CASH:     'CASH',
    CARD:     'CARD',
    TRANSFER: 'TRANSFER',
    OTHER:    'OTHER'
};

const PAYMENT_STATUS = {
    PENDING:  'PENDING',
    PAID:     'PAID',
    FAILED:   'FAILED',
    REFUNDED: 'REFUNDED'
};

module.exports = {
    ORDER_STATUS,
    ORDER_TYPE,
    USER_ROLE,
    PROMOTION_TYPE,
    PAYMENT_METHOD,
    PAYMENT_STATUS
};
