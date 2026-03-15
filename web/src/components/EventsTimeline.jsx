import { useState, useMemo } from 'react';
import './EventsTimeline.css';

const TIMELINE_EVENTS = [
    {
        id: 1,
        title: 'Western North America Heatwave',
        date: 'June 2021',
        year: 2021,
        fraction: 0.15,
        location: 'North America',
        type: 'heatwave',
        color: '#f97316',
        detail: 'Record High: 49.6°C',
        description: 'Record temperatures exceeding 49°C triggered severe wildfires and extreme environmental stress across the Pacific Northwest.',
        imgUrl: '/events/1_heatwave.jpg'
    },
    {
        id: 2,
        title: 'European Floods',
        date: 'July 2021',
        year: 2021,
        fraction: 0.25,
        location: 'Germany & Belgium',
        type: 'flood',
        color: '#0ea5e9',
        detail: 'Impact: Catastrophic Rainfall',
        description: 'Severe and unprecedented rainfall caused catastrophic flash flooding across several European nations, destroying infrastructure.',
        imgUrl: '/events/2_europe_floods.jpg'
    },
    {
        id: 3,
        title: 'Pakistan Mega Floods',
        date: 'August 2022',
        year: 2022,
        fraction: 0.45,
        location: 'Pakistan',
        type: 'flood',
        color: '#0ea5e9',
        detail: 'Impact: 1/3 Country Submerged',
        description: 'Unprecedented monsoon rainfall exacerbated by melting glaciers submerged large parts of the country.',
        imgUrl: '/events/3_pakistan_floods.jpg'
    },
    {
        id: 4,
        title: 'Hunga Tonga Eruption',
        date: 'January 2022',
        year: 2022,
        fraction: 0.35,
        location: 'Pacific Ocean',
        type: 'volcano',
        color: '#ef4444',
        detail: 'Type: Submarine Eruption',
        description: 'A massive underwater volcanic eruption generated global atmospheric shockwaves and Pacific-wide tsunami effects.',
        imgUrl: '/events/4_tonga.jpg'
    },
    {
        id: 5,
        title: 'Türkiye–Syria Earthquake',
        date: 'February 2023',
        year: 2023,
        fraction: 0.55,
        location: 'Southeastern Türkiye',
        type: 'earthquake',
        color: '#eab308',
        detail: 'Magnitude: 7.8',
        description: 'One of the strongest earthquakes in the region in recent decades, causing major infrastructure damage.',
        imgUrl: '/events/5_turkey.jpg'
    },
    {
        id: 6,
        title: 'Global Ocean Temperature Record',
        date: 'August 2023',
        year: 2023,
        fraction: 0.65,
        location: 'Global Oceans',
        type: 'heatwave',
        color: '#f97316',
        detail: 'Anomaly: +0.8°C avg',
        description: 'Ocean surface temperatures reached the highest levels ever recorded, severely impacting marine ecosystems.',
        imgUrl: '/events/6_ocean.jpg'
    },
    {
        id: 7,
        title: 'Japan Noto Peninsula Quake',
        date: 'January 2024',
        year: 2024,
        fraction: 0.72,
        location: 'Japan',
        type: 'earthquake',
        color: '#eab308',
        detail: 'Magnitude: 7.5',
        description: 'Significant seismic activity impacting coastal communities, triggering local tsunami warnings and structural damage.',
        imgUrl: '/events/7_noto.jpg'
    },
    {
        id: 8,
        title: 'Atlantic Hurricane Surge',
        date: 'September 2024',
        year: 2024,
        fraction: 0.82,
        location: 'Atlantic Basin',
        type: 'cyclone',
        color: '#8b5cf6',
        detail: 'Activity: Hyperactive',
        description: 'Elevated ocean temperatures led to stronger, more rapidly intensifying, and more frequent cyclonic storms.',
        imgUrl: '/events/8_hurricane.jpg'
    },
    {
        id: 9,
        title: 'Extreme Heatwave Trends',
        date: 'July 2025',
        year: 2025,
        fraction: 0.90,
        location: 'Global',
        type: 'heatwave',
        color: '#f97316',
        detail: 'Status: Rising Anomaly',
        description: 'Rising temperature anomalies recorded consistently across multiple equatorial and mid-latitude regions.',
        imgUrl: '/events/9_future_heat.jpg'
    },
    {
        id: 10,
        title: 'AI Climate Forecast',
        date: '2026 Outlook',
        year: 2026,
        fraction: 0.98,
        location: 'Global',
        type: 'forecast',
        color: '#a855f7',
        detail: 'Prediction: Volatility',
        description: 'AI analysis suggests an exponentially increasing frequency of extreme weather events in historically vulnerable regions.',
        imgUrl: '/events/10_ai.jpg'
    }
];

const FILTERS = [
    { id: 'all', label: 'All Events' },
    { id: 'earthquake', label: 'Earthquakes' },
    { id: 'cyclone', label: 'Cyclones' },
    { id: 'flood', label: 'Floods' },
    { id: 'heatwave', label: 'Heatwaves' },
    { id: 'volcano', label: 'Volcanic' }
];

export default function EventsTimeline() {
    const [filter, setFilter] = useState('all');
    const [hoveredEventId, setHoveredEventId] = useState(null);

    const filteredEvents = useMemo(() => {
        if (filter === 'all') return TIMELINE_EVENTS;
        return TIMELINE_EVENTS.filter(e => e.type === filter);
    }, [filter]);

    return (
        <div className="events-timeline-container">
            {/* ── Header Area ── */}
            <div className="events-header">
                <div className="events-title-area">
                    <h1 className="events-title">Climate Events Timeline</h1>
                    <p className="events-subtitle">
                        Major global environmental events, seismic activities, and climate anomalies monitored between 2021 and 2026.
                    </p>
                </div>
                
                <div className="events-filters">
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            className={`filter-btn ${filter === f.id ? 'active' : ''}`}
                            onClick={() => setFilter(f.id)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Content Area ── */}
            <div className="events-content">
                
                {/* ── Timeline Track ── */}
                <div className="timeline-viewer">
                    <div className="timeline-line" />
                    
                    <div className="timeline-year-markers">
                        {[2021, 2022, 2023, 2024, 2025, 2026].map(y => (
                            <div key={y} className="timeline-year">
                                <div className="year-tick" />
                                <span className="year-label">{y}</span>
                            </div>
                        ))}
                    </div>

                    <div className="event-nodes-container">
                        {filteredEvents.map((evt, i) => {
                            const isHovered = hoveredEventId === evt.id;
                            // Offset cards upwards or downwards to alternate, and leftwards
                            const isTop = i % 2 === 0;
                            const posClass = isTop ? 'position-top' : 'position-bottom';
                            const indexStr = String(i + 1).padStart(2, '0');
                            
                            return (
                                <div 
                                    key={evt.id} 
                                    className={`event-node-wrapper ${isHovered ? 'active' : ''}`}
                                    style={{ left: `${evt.fraction * 100}%` }}
                                    onMouseEnter={() => setHoveredEventId(evt.id)}
                                    onMouseLeave={() => setHoveredEventId(null)}
                                >
                                    <div 
                                        className="event-node" 
                                        style={{ backgroundColor: evt.color, color: evt.color }} 
                                    />
                                    
                                    {/* SVG Angled Line Connector */}
                                    <svg className={`angled-connector ${posClass} ${isHovered ? 'show' : ''}`} width="120" height="100">
                                      {isTop ? (
                                        <polyline points="0,100 0,50 80,0 120,0" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                                      ) : (
                                        <polyline points="0,0 0,50 80,100 120,100" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
                                      )}
                                    </svg>

                                    {/* Premium Floating Card */}
                                    <div className={`premium-event-card ${posClass} ${isHovered ? 'show' : ''}`}>
                                        <img src={evt.imgUrl} alt={evt.title} className="premium-card-img" />
                                        
                                        <div className="premium-card-body">
                                            <div className="premium-title-row">
                                                <div className="premium-index">{indexStr}</div>
                                                <div className="premium-titles">
                                                    <div className="premium-title">{evt.title}</div>
                                                    <div className="premium-detail" style={{ color: evt.color }}>
                                                        {evt.detail}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="premium-desc-box">
                                                <div className="premium-meta">
                                                    <span>{evt.date}</span>
                                                    <span className="premium-dot">•</span>
                                                    <span>{evt.location}</span>
                                                </div>
                                                <p className="premium-desc-text">{evt.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── AI Insight Panel ── */}
                <div className="ai-insight-panel">
                    <div className="insight-header">
                        <svg className="insight-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                        </svg>
                        <span className="insight-title">AI Climate Insight</span>
                    </div>
                    <div className="insight-text">
                        "Between 2021 and 2024, extreme weather and geological events increased significantly. Rising ocean heat content strongly correlates with the surge in cyclonic activity and thermal anomalies, while tectonic shifts remain unpredictable but severe."
                    </div>
                    <div className="insight-footer">
                        <span className="insight-model">Powered by xAI Synthesis</span>
                    </div>
                </div>

            </div>
        </div>
    );
}
