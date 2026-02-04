import { useState, useRef, useEffect } from 'react';
import './NotificationCenter.css';

function NotificationCenter({ notifications, onDismiss, onDismissAll }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const unreadCount = notifications.length;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="notification-center" ref={dropdownRef}>
            <button
                className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Notificaciones"
            >
                🔔
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown glass-card">
                    <div className="notification-header">
                        <h3>Notificaciones</h3>
                        {unreadCount > 0 && (
                            <button className="clear-all-btn" onClick={onDismissAll}>
                                Borrar todas
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="empty-notifications">
                                <p>No tienes notificaciones nuevas</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div key={notif.id} className={`notification-item ${notif.type}`}>
                                    <div className="notif-content">
                                        <div className="notif-message">{notif.message}</div>
                                        <div className="notif-time">{formatTime(notif.timestamp)}</div>
                                    </div>
                                    <button
                                        className="dismiss-btn"
                                        onClick={() => onDismiss(notif.id)}
                                        title="Eliminar"
                                    >
                                        ×
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
