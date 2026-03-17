// client/src/components/Toast.jsx
import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    useRef,
} from 'react';
import './Toast.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_TOASTS = 4;

const DURATIONS = {
    success: 3000,
    error: 6000,
    warning: 4000,
    info: 3000,
    kitchen: 5000,
};

const ICONS = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    kitchen: '🍳',
};

// success/info/kitchen are "polite" status messages; error/warning demand attention
const ROLES = {
    success: 'status',
    info: 'status',
    kitchen: 'status',
    error: 'alert',
    warning: 'alert',
};

let _toastId = 0;

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

// ─── ToastItem — single toast with its own timer logic ───────────────────────

/**
 * @param {object} props
 * @param {{ id: number, title: string, message: string, type: string, duration: number, action: {label: string, onClick: function}|null }} props.toast
 * @param {function} props.onDismiss
 */
function ToastItem({ toast, onDismiss }) {
    const { id, title, message, type, duration, action } = toast;
    const [exiting, setExiting] = useState(false);
    const [paused, setPaused] = useState(false);

    // Track remaining time so we can pause/resume correctly
    const remainingRef = useRef(duration);
    const startTimeRef = useRef(null);
    const timerRef = useRef(null);

    const handleDismiss = useCallback(() => {
        if (exiting) return;
        setExiting(true);
        // Allow the exit animation to complete before removing from DOM
        setTimeout(() => onDismiss(id), 300);
    }, [exiting, id, onDismiss]);

    const startTimer = useCallback(() => {
        startTimeRef.current = Date.now();
        timerRef.current = setTimeout(() => {
            handleDismiss();
        }, remainingRef.current);
    }, [handleDismiss]);

    const pauseTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
            const elapsed = Date.now() - startTimeRef.current;
            remainingRef.current = Math.max(0, remainingRef.current - elapsed);
        }
    }, []);

    useEffect(() => {
        startTimer();
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
        // startTimer is stable; only run on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleMouseEnter = () => {
        setPaused(true);
        pauseTimer();
    };

    const handleMouseLeave = () => {
        setPaused(false);
        startTimer();
    };

    const role = ROLES[type] ?? 'status';
    const icon = ICONS[type] ?? 'ℹ️';

    // CSS custom property drives the progress bar animation duration
    const inlineStyle = { '--toast-duration': `${duration}ms` };

    return (
        <div
            className={`toast toast--${type}${exiting ? ' toast--exit' : ''}`}
            role={role}
            aria-live={role === 'alert' ? 'assertive' : 'polite'}
            style={inlineStyle}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="toast__body">
                <span className="toast__icon" aria-hidden="true">{icon}</span>
                <div className="toast__content">
                    {title && <span className="toast__title">{title}</span>}
                    {message && (
                        <span className={`toast__message${title ? ' toast__message--sub' : ''}`}>
                            {message}
                        </span>
                    )}
                </div>
                <button
                    className="toast__dismiss"
                    onClick={handleDismiss}
                    aria-label="Cerrar notificación"
                >
                    ✕
                </button>
            </div>

            {action && (
                <div className="toast__actions">
                    <button
                        className="toast__action-btn"
                        onClick={() => {
                            action.onClick();
                            handleDismiss();
                        }}
                    >
                        {action.label}
                    </button>
                </div>
            )}

            <div
                className={`toast__progress${paused ? ' toast__progress--paused' : ''}`}
                aria-hidden="true"
            />
        </div>
    );
}

// ─── ToastProvider ────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    /**
     * Backward-compatible showToast.
     * Old API:  showToast(message, type, duration)
     * New API:  showToast({ title, message, type, duration, action })
     */
    const showToast = useCallback((messageOrConfig, type = 'info', duration) => {
        const isObject = messageOrConfig !== null && typeof messageOrConfig === 'object';

        const config = isObject
            ? messageOrConfig
            : { message: messageOrConfig, type, duration };

        const resolvedType = config.type ?? 'info';
        const resolvedDuration = config.duration ?? DURATIONS[resolvedType] ?? 3000;

        const toast = {
            id: ++_toastId,
            title: config.title ?? null,
            // When using old API the single string becomes the title if there is no
            // separate message; when using new API title and message are independent.
            message: config.message ?? null,
            type: resolvedType,
            duration: resolvedDuration,
            action: config.action ?? null,
        };

        setToasts(prev => {
            const next = [...prev, toast];
            // Enforce max: drop the oldest entries that exceed the cap
            return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
        });
    }, []);

    const dismiss = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div
                className="toast-container"
                aria-live="polite"
                aria-atomic="false"
                aria-label="Notificaciones"
            >
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// ─── useToast ─────────────────────────────────────────────────────────────────

/**
 * Returns the `showToast` function.
 * Supports both call signatures:
 *   showToast('message', 'success')
 *   showToast({ title: 'Order ready', message: 'Table 4', type: 'kitchen', action: { label: 'View', onClick: fn } })
 */
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
