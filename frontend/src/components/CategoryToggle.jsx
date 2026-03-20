import { useRef, useState, useEffect, useCallback } from 'react';
import './CategoryToggle.css';

const CATEGORIES = [
    { id: 'earthquake', label: 'Earthquake' },
    { id: 'cyclone', label: 'Cyclone' },
    { id: 'tsunami', label: 'Tsunamis' },
    { id: 'weather', label: 'Weather' },
    { id: 'temperature', label: 'Temperature' },
];

export default function CategoryToggle({ active, onChange }) {
    const containerRef = useRef(null);
    const btnRefs = useRef({});
    const [pill, setPill] = useState({ left: 0, width: 0 });
    const [expanded, setExpanded] = useState(true);
    const [hoveredId, setHoveredId] = useState(null);
    const collapseTimer = useRef(null);

    const measureBtn = useCallback((id) => {
        const btn = btnRefs.current[id];
        const container = containerRef.current;
        if (btn && container) {
            const cRect = container.getBoundingClientRect();
            const bRect = btn.getBoundingClientRect();
            setPill({
                left: bRect.left - cRect.left,
                width: bRect.width,
            });
        }
    }, []);

    const pillTarget = hoveredId || active;

    useEffect(() => {
        if (!expanded) return;
        const t = setTimeout(() => measureBtn(pillTarget), 20);
        return () => clearTimeout(t);
    }, [pillTarget, expanded, measureBtn]);

    useEffect(() => {
        const h = () => { if (expanded) measureBtn(pillTarget); };
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, [pillTarget, expanded, measureBtn]);

    const startCollapse = (delay) => {
        clearTimeout(collapseTimer.current);
        collapseTimer.current = setTimeout(() => setExpanded(false), delay);
    };

    const cancelCollapse = () => {
        clearTimeout(collapseTimer.current);
    };

    const handleCategoryClick = (catId) => {
        onChange(catId);
        setHoveredId(null);
        startCollapse(350);
    };

    const handleExpand = () => {
        cancelCollapse();
        if (!expanded) setExpanded(true);
    };

    const handleWrapperLeave = () => {
        setHoveredId(null);
        startCollapse(250);
    };

    const activeLabel = CATEGORIES.find(c => c.id === active)?.label || '';

    return (
        <div
            className={`category-toggle-wrapper ${expanded ? 'is-expanded' : 'is-collapsed'}`}
            onMouseEnter={handleExpand}
            onMouseLeave={handleWrapperLeave}
        >
            {/* ── COLLAPSED: readable label pill — click OR hover to expand ── */}
            {!expanded && (
                <div className="toggle-collapsed" onClick={handleExpand}>
                    <span className="collapsed-pill">{activeLabel}</span>
                    <span className="collapsed-hint">▾</span>
                </div>
            )}

            {/* ── EXPANDED: full bar with all options ── */}
            {expanded && (
                <div className="category-toggle-inner" ref={containerRef}>
                    <div
                        className="category-pill-slider"
                        style={{
                            left: `${pill.left}px`,
                            width: `${pill.width}px`,
                        }}
                    />
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            ref={el => (btnRefs.current[cat.id] = el)}
                            className={`category-btn ${active === cat.id ? 'active' : ''}`}
                            onClick={() => handleCategoryClick(cat.id)}
                            onMouseEnter={() => setHoveredId(cat.id)}
                            onMouseLeave={() => setHoveredId(null)}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
