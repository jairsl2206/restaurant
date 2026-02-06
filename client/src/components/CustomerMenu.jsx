import { useState, useEffect } from 'react';
import API_BASE_URL from '../config';
import './CustomerMenu.css';

const CustomerMenu = ({ restaurantName, restaurantLogo }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    // Track expanded state for each category
    const [expandedCategories, setExpandedCategories] = useState({});

    const fetchMenu = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/menu?type=public`);
            if (res.ok) {
                const data = await res.json();
                setMenuItems(data);
            }
        } catch (err) {
            console.error('Error fetching menu:', err);
        } finally {
            setLoading(false);
        }
    };

    const groupItems = (items) => {
        return items.reduce((acc, item) => {
            const category = item.category || 'Otros';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {});
    };

    useEffect(() => {
        // Initial fetch
        const initialFetch = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/menu?type=public`);
                if (res.ok) {
                    const data = await res.json();
                    setMenuItems(data);
                }
            } catch (err) {
                console.error('Error fetching menu:', err);
            } finally {
                setLoading(false);
            }
        };

        initialFetch();

        // Auto-refresh every 10 seconds
        const intervalId = setInterval(fetchMenu, 10000);
        return () => clearInterval(intervalId);
    }, []);

    const toggleCategory = (category) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    // Helper to construct image URL
    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;

        const isDev = import.meta.env.DEV;
        const baseUrl = isDev
            ? `${window.location.protocol}//${window.location.hostname}:3001`
            : window.location.origin;

        return `${baseUrl}${path}`;
    };

    const groupedItems = groupItems(menuItems);

    if (loading && menuItems.length === 0) {
        return <div className="loading-container">Cargando menú...</div>;
    }

    return (
        <div className="customer-menu">
            <header className="menu-header">
                {restaurantLogo && (restaurantLogo.startsWith('http') || restaurantLogo.startsWith('/')) ? (
                    <img src={getImageUrl(restaurantLogo)} alt="Logo" className="menu-logo-img" />
                ) : (
                    <div className="menu-logo-emoji">{restaurantLogo}</div>
                )}
                <h1>{restaurantName}</h1>
                <p>Nuestro Menú</p>
            </header>

            {Object.keys(groupedItems).length === 0 ? (
                <div className="no-items">
                    <p style={{ textAlign: 'center', color: '#7f8c8d', fontSize: '1.2rem' }}>
                        No hay productos disponibles en este momento.
                    </p>
                </div>
            ) : (
                Object.entries(groupedItems).map(([category, items]) => (
                    <div key={category} className="category-section">
                        <div
                            className="category-header"
                            onClick={() => toggleCategory(category)}
                            role="button"
                            tabIndex={0}
                        >
                            <h2 className="category-title">{category}</h2>
                            <span className={`category-toggle ${expandedCategories[category] ? 'expanded' : ''}`}>
                                ▼
                            </span>
                        </div>

                        {expandedCategories[category] && (
                            <div className="items-grid fade-in">
                                {items.map(item => (
                                    <div key={item.id} className="menu-item-card">
                                        {item.image_url ? (
                                            <img
                                                src={getImageUrl(item.image_url)}
                                                alt={item.name}
                                                className="item-image"
                                                onError={(e) => {
                                                    e.target.onerror = null;
                                                    e.target.src = 'https://via.placeholder.com/300x200?text=No+Image';
                                                }}
                                            />
                                        ) : (
                                            <div className="item-placeholder">🍽️</div>
                                        )}
                                        <div className="item-details">
                                            <div className="item-header">
                                                <h3>{item.name}</h3>
                                                <div className="price-container">
                                                    {item.has_promotion ? (
                                                        <>
                                                            <span className="item-price-original">${item.original_price}</span>
                                                            <span className="item-price-promo">${item.final_price}</span>
                                                        </>
                                                    ) : (
                                                        <span className="item-price">${item.price}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {item.has_promotion && (
                                                <div className="promo-badge">
                                                    <span>🔥 PROMOCIÓN</span>
                                                    <span className="promo-discount">
                                                        {item.promotion_type === 'percentage'
                                                            ? `-${item.promotion_value}%`
                                                            : `-$${item.promotion_value.toFixed(2)}`
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                            <p className="item-description">{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default CustomerMenu;
