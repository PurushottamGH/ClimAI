import { useRef, useState, useEffect, useCallback } from 'react';
import './TopNavigation.css';

const NAV_ITEMS = [
    { id: 'overview', label: 'Overview' },
    { id: 'events', label: 'Events' },
    { id: 'xai', label: 'xAI' },
    { id: 'lab', label: 'Lab' },
    { id: 'about', label: 'About' },
];

export default function TopNavigation({ activeView, onChangeView }) {
    const containerRef = useRef(null);
    const btnRefs = useRef({});
    const [pill, setPill] = useState({ left: 0, width: 0, initialized: false });
    const [hoveredId, setHoveredId] = useState(null);

    const measureBtn = useCallback((id) => {
        const btn = btnRefs.current[id];
        const container = containerRef.current;
        if (btn && container) {
            const cRect = container.getBoundingClientRect();
            const bRect = btn.getBoundingClientRect();
            setPill({
                left: bRect.left - cRect.left,
                width: bRect.width,
                initialized: true
            });
        }
    }, []);

    // The target pill position is either the hovered item (preview mode) or the active item
    const pillTarget = hoveredId || activeView;

    // React to target changes
    useEffect(() => {
        measureBtn(pillTarget);
    }, [pillTarget, measureBtn]);

    // React to window resizes
    useEffect(() => {
        const h = () => measureBtn(pillTarget);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, [pillTarget, measureBtn]);
    
    // Initial measurement delay in case fonts/styles are loading
    useEffect(() => {
        const t = setTimeout(() => measureBtn(activeView), 50);
        return () => clearTimeout(t);
    }, [activeView, measureBtn]);

    return (
        <div className="top-nav-wrapper">
            <div className="top-nav-inner" ref={containerRef} onMouseLeave={() => setHoveredId(null)}>
                
                {/* ── Slide Pill ── */}
                <div 
                    className={`nav-pill-slider ${!pill.initialized ? 'uninitialized' : ''}`}
                    style={{
                        left: `${pill.left}px`,
                        width: `${pill.width}px`
                    }}
                />

                {/* ── Nav Items ── */}
                {NAV_ITEMS.map(item => (
                    <button
                        key={item.id}
                        ref={el => (btnRefs.current[item.id] = el)}
                        className={`nav-btn ${activeView === item.id ? 'active' : ''}`}
                        onClick={() => {
                            setHoveredId(null);
                            onChangeView(item.id);
                        }}
                        onMouseEnter={() => setHoveredId(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
