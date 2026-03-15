import { createContext, useContext, useState, useCallback } from 'react';
import './Toast.css';

const ToastContext = createContext(null);

let _toastId = 0;

const DURATIONS = { success: 3000, error: 5000, warning: 4000, info: 3000 };
const ICONS = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration) => {
        const id = ++_toastId;
        const ms = duration ?? DURATIONS[type] ?? 3000;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ms);
    }, []);

    const dismiss = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div className="toast-container" aria-live="polite" aria-atomic="false">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`} role="alert">
                        <span className="toast-icon" aria-hidden="true">{ICONS[toast.type]}</span>
                        <span className="toast-message">{toast.message}</span>
                        <button
                            className="toast-dismiss"
                            onClick={() => dismiss(toast.id)}
                            aria-label="Cerrar notificación"
                        >✕</button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
