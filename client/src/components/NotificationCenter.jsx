import { useState, useRef, useEffect } from 'react';
import './NotificationCenter.css';

const TYPE_ICONS = {
    success: '✅',
    error:   '❌',
    info:    'ℹ️',
    kitchen: '🍳',
    warning: '⚠️',
};

function formatRelativeTime(timestamp) {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60)   return 'ahora';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    return new Date(timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function NotificationCenter({ notifications, onDismiss, onDismissAll }) {
    const [isOpen, setIsOpen]         = useState(false);
    const [pulseBadge, setPulseBadge] = useState(false);
    const prevCountRef                = useRef(notifications.length);
    const dropdownRef                 = useRef(null);
    const bellRef                     = useRef(null);
    const firstFocusRef               = useRef(null);

    const unreadCount = notifications.length;
    const badgeLabel  = unreadCount > 9 ? '9+' : String(unreadCount);

    // Pulse the badge once when a new notification arrives (no continuous swing)
    useEffect(() => {
        if (notifications.length > prevCountRef.current) {
            setPulseBadge(true);
            const t = setTimeout(() => setPulseBadge(false), 600);
            prevCountRef.current = notifications.length;
            return () => clearTimeout(t);
        }
        prevCountRef.current = notifications.length;
    }, [notifications.length]);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Escape closes dropdown and returns focus to bell
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                bellRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    // Move focus into dropdown when it opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => firstFocusRef.current?.focus(), 50);
        }
    }, [isOpen]);

    return (
        <div className="notification-center" ref={dropdownRef}>
            <button
                ref={bellRef}
                className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={() => setIsOpen(v => !v)}
                aria-label={unreadCount > 0
                    ? `Notificaciones, ${unreadCount} sin leer`
                    : 'Notificaciones'}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                🔔
                {unreadCount > 0 && (
                    <span
                        className={`notification-badge${pulseBadge ? ' notification-badge--pulse' : ''}`}
                        aria-hidden="true"
                    >
                        {badgeLabel}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    className="notification-dropdown glass-card"
                    role="dialog"
                    aria-modal="false"
                    aria-label="Panel de notificaciones"
                >
                    <div className="notification-header">
                        <h3 className="notification-header__title">Notificaciones</h3>
                        {unreadCount > 0 && (
                            <button
                                ref={firstFocusRef}
                                className="clear-all-btn"
                                onClick={onDismissAll}
                            >
                                Borrar todas
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div
                                className="empty-notifications"
                                ref={firstFocusRef}
                                tabIndex={-1}
                            >
                                <span className="empty-notifications__icon" aria-hidden="true">🔕</span>
                                <p>Sin notificaciones pendientes</p>
                            </div>
                        ) : (
                            notifications.map((notif, idx) => (
                                <div
                                    key={notif.id}
                                    className={`notification-item notification-item--${notif.type || 'info'}`}
                                >
                                    <span className="notif-icon" aria-hidden="true">
                                        {TYPE_ICONS[notif.type] ?? 'ℹ️'}
                                    </span>
                                    <div className="notif-content">
                                        <div className="notif-message">{notif.message}</div>
                                        <div
                                            className="notif-time"
                                            title={new Date(notif.timestamp).toLocaleString('es-MX')}
                                        >
                                            {formatRelativeTime(notif.timestamp)}
                                        </div>
                                    </div>
                                    <button
                                        className="dismiss-btn"
                                        onClick={() => onDismiss(notif.id)}
                                        aria-label="Eliminar notificación"
                                        ref={idx === 0 ? firstFocusRef : null}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationCenter;
