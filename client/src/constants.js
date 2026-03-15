/**
 * Frontend constants — aligned with the new database schema ENUMs
 */

export const ORDER_STATUS = {
    EN_COCINA:          'EN_COCINA',
    LISTO_PARA_SERVIR:  'LISTO_PARA_SERVIR',
    SERVIDO:            'SERVIDO',
    EN_REPARTO:         'EN_REPARTO',
    LISTO_PARA_RECOGER: 'LISTO_PARA_RECOGER',
    FINALIZADO:         'FINALIZADO'
};

export const ORDER_STATUS_LABELS = {
    EN_COCINA:          'En cocina',
    LISTO_PARA_SERVIR:  'Listo para servir',
    SERVIDO:            'Servido (En mesa)',
    EN_REPARTO:         'En reparto',
    LISTO_PARA_RECOGER: 'Listo para recoger',
    FINALIZADO:         'Finalizado'
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
    FIXED_AMOUNT: 'FIXED_AMOUNT',
    BUNDLE:       'BUNDLE'
};

export const PROMOTION_TYPE_LABELS = {
    PERCENTAGE:   'Porcentaje (%)',
    FIXED_AMOUNT: 'Monto Fijo ($)',
    BUNDLE:       'Bundle (Nx(N-1))'
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

export const SALE_PERIOD_STATUS = {
    OPEN:   'open',
    CLOSED: 'closed'
};

// ── Status display maps (single source of truth) ──────────────────────────────

export const STATUS_ICONS = {
    [ORDER_STATUS.EN_COCINA]:          '🍳',
    [ORDER_STATUS.LISTO_PARA_SERVIR]:  '🥡',
    [ORDER_STATUS.SERVIDO]:            '🍽️',
    [ORDER_STATUS.EN_REPARTO]:         '🚗',
    [ORDER_STATUS.LISTO_PARA_RECOGER]: '📦',
    [ORDER_STATUS.FINALIZADO]:         '✅'
};

export const STATUS_CSS_CLASSES = {
    [ORDER_STATUS.EN_COCINA]:          'status-cocina',
    [ORDER_STATUS.LISTO_PARA_SERVIR]:  'status-listo',
    [ORDER_STATUS.SERVIDO]:            'status-servido',
    [ORDER_STATUS.EN_REPARTO]:         'status-reparto',
    [ORDER_STATUS.LISTO_PARA_RECOGER]: 'status-recoger',
    [ORDER_STATUS.FINALIZADO]:         'status-pagado'
};

// ── Numeric constants (no magic numbers in components) ────────────────────────

export const POLL_INTERVAL_MS          = 5000;
export const POLL_INTERVAL_WHATSAPP_MS = 3000;
export const POLL_INTERVAL_MENU_MS     = 10000;
export const TIME_BADGE_WARN_MIN       = 10;
export const TIME_BADGE_URGENT_MIN     = 20;
export const DEFAULT_MAX_TABLES        = 20;
