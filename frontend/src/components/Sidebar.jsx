import { useState, useEffect } from 'react';
import './Sidebar.css';

/* ── Hourly temperature anomaly data ── */
const HOURLY_DATA = [
    { hour: '12 AM', val: 0.2, type: 'cold' },
    { hour: '1 AM', val: 0.15, type: 'cold' },
    { hour: '2 AM', val: 0.1, type: 'cold' },
    { hour: '3 AM', val: 0.08, type: 'cold' },
    { hour: '4 AM', val: 0.12, type: 'cold' },
    { hour: '5 AM', val: 0.18, type: 'cold' },
    { hour: '6 AM', val: 0.25, type: 'cool' },
    { hour: '7 AM', val: 0.3, type: 'cool' },
    { hour: '8 AM', val: 0.35, type: 'cool' },
    { hour: '9 AM', val: 0.5, type: 'cool' },
    { hour: '10 AM', val: 0.65, type: 'warm' },
    { hour: '11 AM', val: 0.7, type: 'warm' },
    { hour: '12 PM', val: 0.85, type: 'warm' },
    { hour: '1 PM', val: 0.95, type: 'hot' },
    { hour: '2 PM', val: 1.0, type: 'hot' },
    { hour: '3 PM', val: 0.9, type: 'hot' },
    { hour: '4 PM', val: 0.75, type: 'warm' },
    { hour: '5 PM', val: 0.6, type: 'warm' },
    { hour: '6 PM', val: 0.45, type: 'cool' },
    { hour: '7 PM', val: 0.35, type: 'cool' },
    { hour: '8 PM', val: 0.28, type: 'cool' },
    { hour: '9 PM', val: 0.22, type: 'cold' },
    { hour: '10 PM', val: 0.18, type: 'cold' },
    { hour: '11 PM', val: 0.15, type: 'cold' },
];

/* ── Wikipedia-style earthquake details ── */
const EARTHQUAKE_WIKI = {
    seismic: {
        image: '/earthquake_seismic.png',
        badge: 'LIVE MONITORING',
        badgeColor: '#c4f55a',
        title: 'SEISMIC ACTIVITY',
        subtitle: 'REAL-TIME ANALYSIS',
        description: 'Track real-time seismic events worldwide. The USGS Global Seismographic Network monitors over 150 stations across the globe, detecting earthquakes as small as magnitude 2.0. Seismic waves travel through Earth\'s interior at speeds up to 13 km/s, providing critical data for early warning systems and tectonic plate research. Each event is assessed for tsunami potential within minutes of detection.',
    },
    tectonic: {
        image: '/earthquake_tectonic.png',
        badge: 'TECTONIC DATA',
        badgeColor: '#f472b6',
        title: 'PLATE BOUNDARIES',
        subtitle: 'SUBDUCTION ZONES',
        description: 'Earth\'s lithosphere consists of 15 major tectonic plates in constant motion at rates of 1-10 cm/year. The Pacific Ring of Fire hosts 90% of the world\'s earthquakes and 75% of active volcanoes. Subduction zones, where oceanic plates dive beneath continental plates, produce the most powerful megathrust earthquakes — including the 2004 Indian Ocean event (M9.1) and the 2011 Tōhoku earthquake (M9.1).',
    },
    tsunami: {
        image: '/earthquake_tsunami.png',
        badge: 'ALERT SYSTEM',
        badgeColor: '#38bdf8',
        title: 'TSUNAMI MONITORING',
        subtitle: 'COASTAL DEFENSE',
        description: 'Submarine earthquakes with magnitude ≥7.0 and shallow depth (<70km) can generate devastating tsunamis. The Indian Ocean Tsunami Warning System (IOTWS), established after the catastrophic 2004 event that killed 227,898 people, now uses a network of 26 seismic stations, 6 deep-ocean pressure sensors, and 3 satellite altimeters. Warning times have improved from hours to under 10 minutes for coastal regions.',
    },
};

const NAV_ITEMS = [
    {
        id: 'map', label: 'Map View',
        icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.893 13.393l-1.135-1.135a2.252 2.252 0 01-.421-.585l-1.08-2.16a.414.414 0 00-.663-.107.827.827 0 01-.812.21l-1.273-.363a.89.89 0 00-.738.145l-.573.43a.9.9 0 01-.69.145l-.773-.154a.68.68 0 01-.545-.554l-.162-.813a.92.92 0 00-.891-.725H10.5m10.393.393V5.25A2.25 2.25 0 0018.75 3h-1.5M4.5 21h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v12A2.25 2.25 0 004.5 21z" />
            </svg>
        ),
    },
    {
        id: 'analytics', label: 'Model Analytics',
        icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
        ),
    },
    {
        id: 'sensors', label: 'Sensor Network',
        icon: (
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
            </svg>
        ),
    },
];

const SETTINGS_ICON = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

/* ── Helper: format earthquake time ── */
function formatQuakeTime(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getMagClass(mag) {
    if (mag >= 7) return 'mag-extreme';
    if (mag >= 6) return 'mag-high';
    if (mag >= 5) return 'mag-moderate';
    return 'mag-low';
}

export default function Sidebar({ weatherData, earthquakes = [] }) {
    const [activeNav, setActiveNav] = useState('map');
    const [confidence, setConfidence] = useState(0);
    const [currentTemp, setCurrentTemp] = useState(null);

    // Animate confidence score
    useEffect(() => {
        const target = 0.87;
        let current = 0;
        const step = target / 40;
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            setConfidence(current);
        }, 25);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (weatherData && weatherData.temperature !== undefined) {
            setCurrentTemp(weatherData.temperature);
        }
    }, [weatherData]);

    const tempDisplay = currentTemp !== null ? currentTemp : 32.4;
    const tempPercent = Math.max(0, Math.min(100, ((tempDisplay + 20) / 70) * 100));

    // Get latest 3 significant earthquakes for detail cards
    const topQuakes = [...earthquakes]
        .sort((a, b) => (b.magnitude || 0) - (a.magnitude || 0))
        .slice(0, 3);

    // Summary stats
    const totalQuakes = earthquakes.length;
    const maxMag = earthquakes.length > 0
        ? Math.max(...earthquakes.map(e => e.magnitude || 0))
        : 0;
    const m6Plus = earthquakes.filter(e => (e.magnitude || 0) >= 6).length;
    const tsunamiAlerts = earthquakes.filter(e => e.tsunami).length;

    return (
        <div className="sidebar-container">
            {/* ── Left Nav Strip ── */}
            <div className="sidebar-nav-strip">
                {NAV_ITEMS.map(item => (
                    <button
                        key={item.id}
                        className={`nav-icon-btn ${activeNav === item.id ? 'active' : ''}`}
                        onClick={() => setActiveNav(item.id)}
                        title={item.label}
                    >
                        {item.icon}
                    </button>
                ))}
                <div className="nav-spacer" />
                <button className="nav-icon-btn bottom-icon" title="Settings">
                    {SETTINGS_ICON}
                </button>
            </div>

            {/* ── Main Panel ── */}
            <div className="sidebar-main">

                {/* ═══════════════════════════════════════
                    SECTION 1: Climate Activity Header
                   ═══════════════════════════════════════ */}
                <div className="sidebar-header">
                    <div className="sidebar-header-left">
                        <div className="sidebar-icon-badge">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                            </svg>
                        </div>
                        <h2 className="sidebar-title">Climate Activity</h2>
                        <p className="sidebar-subtitle">
                            Real-time climate monitoring and temperature anomaly detection
                        </p>
                    </div>
                    <div className="sidebar-score">
                        {confidence.toFixed(2)}
                    </div>
                </div>

                {/* ═══════════════════════════════════════
                    SECTION 2: Stat Cards
                   ═══════════════════════════════════════ */}
                <div className="stat-cards-row">
                    <div className="stat-card">
                        <div className="stat-card-icon">
                            <span style={{ color: '#f87171' }}>▲</span>
                        </div>
                        <div className="stat-card-value">
                            +1.3<span className="stat-unit">°C</span>
                        </div>
                        <div className="stat-card-label">Since Yesterday</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-icon">
                            <span style={{ color: '#a78bfa' }}>⬡</span>
                        </div>
                        <div className="stat-card-value">
                            4,820<span className="stat-unit"> sensors</span>
                        </div>
                        <div className="stat-card-label">Active Stations</div>
                    </div>
                    <div className="stat-card full-width">
                        <div className="stat-card-icon">
                            <span style={{ color: '#4ade80' }}>◈</span>
                        </div>
                        <div className="stat-card-value">
                            0.4<span className="stat-unit">°C avg</span>
                        </div>
                        <div className="stat-card-label">Prediction Error</div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════
                    SECTION 3: Temperature Timeline
                   ═══════════════════════════════════════ */}
                <div className="timeline-section">
                    <span className="section-label">Temperature Anomaly Timeline</span>
                    <div className="timeline-bars">
                        {HOURLY_DATA.map((d, i) => (
                            <div
                                key={i}
                                className={`timeline-bar bar-${d.type}`}
                                style={{ height: `${Math.max(4, d.val * 100)}%` }}
                                title={`${d.hour}: ${(d.val * 2).toFixed(1)}°C anomaly`}
                            />
                        ))}
                    </div>
                    <div className="timeline-labels">
                        <span>6 AM</span>
                        <span>8 AM</span>
                        <span>10 AM</span>
                        <span>12 PM</span>
                        <span>2 PM</span>
                        <span>4 PM</span>
                        <span className="now-label">Now</span>
                    </div>
                </div>

                {/* ═══════════════════════════════════════
                    SECTION 4: Temperature Scale
                   ═══════════════════════════════════════ */}
                <div className="temp-scale-section">
                    <span className="section-label">Temperature Scale</span>
                    <div className="temp-scale-bar">
                        <div className="temp-scale-indicator" style={{ left: `${tempPercent}%` }} />
                    </div>
                    <div className="temp-scale-labels">
                        <span>-20°C</span>
                        <span>0°C</span>
                        <span>25°C</span>
                        <span>50°C</span>
                    </div>
                </div>

                {/* Zone Gradient */}
                <div className="temp-scale-section">
                    <div className="zone-gradient-bar">
                        <div className="zone-divider" style={{ left: '35%' }} />
                        <div className="zone-divider" style={{ left: '65%' }} />
                    </div>
                    <div className="zone-labels">
                        <span>05:30 AM</span>
                        <span className="zone-highlight">Anomaly Zone</span>
                    </div>
                </div>

                {/* ═══════════════════════════════════════
                    SECTION 5: Alert Card
                   ═══════════════════════════════════════ */}
                <div className="alert-card">
                    <div className="alert-dot critical" />
                    <div className="alert-icon-circle">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <div className="alert-content">
                        <div className="alert-title">Heatwave Alert</div>
                        <div className="alert-text">
                            Temperature anomaly detected in South Asia. Station ID 4821 reporting abnormal values.
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════
                    SECTION 6: Earthquake Intelligence — Reference Design
                   ═══════════════════════════════════════════════════ */}
                <div className="eq-divider" />

                <div className="eq-hero-section">
                    <h1 className="eq-hero-title">
                        A Monitoring Platform where we track global Seismic Events
                    </h1>
                    <div className="eq-hero-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                        </svg>
                    </div>
                </div>

                <p className="eq-hero-desc">
                    You can monitor real-time seismic data from the USGS network,
                    as well as historical earthquake records and tsunami early warning systems
                </p>

                {/* Earthquake Summary Strip */}
                <div className="eq-summary-strip">
                    <div className="eq-summary-item">
                        <span className="eq-summary-val">{totalQuakes}</span>
                        <span className="eq-summary-label">Total Events</span>
                    </div>
                    <div className="eq-summary-divider" />
                    <div className="eq-summary-item">
                        <span className="eq-summary-val">{maxMag.toFixed(1)}</span>
                        <span className="eq-summary-label">Max Mag</span>
                    </div>
                    <div className="eq-summary-divider" />
                    <div className="eq-summary-item">
                        <span className="eq-summary-val">{m6Plus}</span>
                        <span className="eq-summary-label">M6+</span>
                    </div>
                    <div className="eq-summary-divider" />
                    <div className="eq-summary-item">
                        <span className="eq-summary-val">{tsunamiAlerts}</span>
                        <span className="eq-summary-label">Tsunami</span>
                    </div>
                </div>

                {/* ── Wiki-Style Info Cards (matching reference layout) ── */}
                {Object.entries(EARTHQUAKE_WIKI).map(([key, info]) => (
                    <div className="eq-info-card" key={key}>
                        <div className="eq-card-image" style={{ backgroundImage: `url(${info.image})` }}>
                            <span className="eq-card-badge" style={{ background: info.badgeColor, color: '#000' }}>
                                {info.badge}
                            </span>
                        </div>
                        <div className="eq-card-body">
                            <div className="eq-card-title">{info.title}</div>
                            <span className="eq-card-subtitle-badge">{info.subtitle}</span>
                            <p className="eq-card-desc">{info.description}</p>
                        </div>
                    </div>
                ))}

                {/* ── Live Earthquake Event Cards ── */}
                {topQuakes.length > 0 && (
                    <>
                        <span className="section-label" style={{ marginTop: 4 }}>Recent Major Events</span>
                        {topQuakes.map((eq, i) => (
                            <div className="eq-event-card" key={i}>
                                <div className="eq-event-header">
                                    <div className={`eq-mag-badge ${getMagClass(eq.magnitude)}`}>
                                        {(eq.magnitude || 0).toFixed(1)}
                                    </div>
                                    <div className="eq-event-meta">
                                        <div className="eq-event-place">{eq.place || 'Unknown Location'}</div>
                                        <div className="eq-event-time">{formatQuakeTime(eq.time)}</div>
                                    </div>
                                    {eq.tsunami === 1 && (
                                        <span className="eq-tsunami-badge">🌊 TSUNAMI</span>
                                    )}
                                </div>
                                <div className="eq-event-details">
                                    <div className="eq-detail-row">
                                        <span className="eq-detail-label">Depth</span>
                                        <span className="eq-detail-val">{(eq.depth_km || 0).toFixed(1)} km</span>
                                    </div>
                                    <div className="eq-detail-row">
                                        <span className="eq-detail-label">Coordinates</span>
                                        <span className="eq-detail-val">
                                            {(eq.latitude || 0).toFixed(3)}°, {(eq.longitude || 0).toFixed(3)}°
                                        </span>
                                    </div>
                                    <div className="eq-detail-row">
                                        <span className="eq-detail-label">Significance</span>
                                        <div className="eq-significance-bar">
                                            <div
                                                className="eq-significance-fill"
                                                style={{ width: `${Math.min(100, ((eq.significance || 0) / 1000) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="eq-detail-val">{eq.significance || 0}</span>
                                    </div>
                                </div>
                                <p className="eq-event-wiki">
                                    {(eq.magnitude || 0) >= 7
                                        ? `A magnitude ${(eq.magnitude || 0).toFixed(1)} earthquake is classified as "Major" by the USGS Richter scale. Events of this magnitude can cause severe damage over large areas, affecting critical infrastructure and triggering secondary hazards including landslides, liquefaction, and potential tsunamis in maritime zones.`
                                        : (eq.magnitude || 0) >= 6
                                            ? `A magnitude ${(eq.magnitude || 0).toFixed(1)} earthquake is classified as "Strong" on the Richter scale. Such events are capable of causing significant structural damage in populated areas within a 100km radius of the epicenter, especially in regions without earthquake-resistant building codes.`
                                            : `A magnitude ${(eq.magnitude || 0).toFixed(1)} earthquake is classified as "Moderate" by seismological standards. While rarely causing major structural damage, events at this level are widely felt across the affected region and may cause minor damage to vulnerable structures, falling objects, and temporary disruptions.`
                                    }
                                </p>
                            </div>
                        ))}
                    </>
                )}

                {/* Bottom Spacer */}
                <div style={{ height: 24 }} />
            </div>
        </div>
    );
}
