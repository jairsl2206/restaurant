/**
 * Frontend constants — aligned with the new database schema ENUMs
 */

export const ORDER_STATUS = {
    CREADA:     'CREADA',
    PREPARANDO: 'PREPARANDO',
    LISTA:      'LISTA',
    ENTREGADA:  'ENTREGADA',
    CANCELADA:  'CANCELADA'
};

export const ORDER_STATUS_LABELS = {
    CREADA:     'Orden Creada',
    PREPARANDO: 'Preparando',
    LISTA:      'Lista',
    ENTREGADA:  'Entregada',
    CANCELADA:  'Cancelada'
};

export const ORDER_TYPE = {
    DINE_IN:  'DINE_IN',
    DELIVERY: 'DELIVERY',
    PICKUP:   'PICKUP'
};

export const ORDER_TYPE_LABELS = {
    DINE_IN:  'Mesa',
    DELIVERY: 'Domicilio',
    PICKUP:   'Pickup'
};

export const USER_ROLE = {
    WAITER:  'waiter',
    COOK:    'cook',
    ADMIN:   'admin',
    MANAGER: 'manager'
};

export const USER_ROLE_LABELS = {
    waiter:  'Mesero',
    cook:    'Cocinero',
    admin:   'Administrador',
    manager: 'Gerente'
};

export const PROMOTION_TYPE = {
    PERCENTAGE:   'PERCENTAGE',
    FIXED_AMOUNT: 'FIXED_AMOUNT'
};

export const PROMOTION_TYPE_LABELS = {
    PERCENTAGE:   'Porcentaje (%)',
    FIXED_AMOUNT: 'Monto Fijo ($)'
};

export const PAYMENT_METHOD = {
    CASH:     'CASH',
    CARD:     'CARD',
    TRANSFER: 'TRANSFER',
    OTHER:    'OTHER'
};

export const PAYMENT_METHOD_LABELS = {
    CASH:     'Efectivo',
    CARD:     'Tarjeta',
    TRANSFER: 'Transferencia',
    OTHER:    'Otro'
};
