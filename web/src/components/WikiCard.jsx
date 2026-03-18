import { useState, useEffect } from 'react';
import './WikiCard.css';

// ── Unsplash source images for each event type (free, no API key needed) ──
const EVENT_IMAGES = {
    earthquake: [
        'https://images.unsplash.com/photo-1588422964040-4ca7f2e6efbb?w=600&q=80',
        'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&q=80',
        'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&q=80',
    ],
    cyclone: [
        'https://images.unsplash.com/photo-1527482937786-6608f6e14c15?w=600&q=80',
        'https://images.unsplash.com/photo-1504270997636-07ddfbd48945?w=600&q=80',
        'https://images.unsplash.com/photo-1603789023070-49bbd9277f2e?w=600&q=80',
    ],
    tsunami: [
        'https://images.unsplash.com/photo-1509266272358-7701da638078?w=600&q=80',
        'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600&q=80',
        'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&q=80',
    ],
};

// ── Generate rich event context from raw event data ──
function buildEventContext(event) {
    if (!event) return null;

    if (event.type === 'earthquake') {
        const mag = event.magnitude || 0;
        const place = event.place || 'Unknown location';
        const time = event.time ? new Date(event.time) : null;
        const dateStr = time ? time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

        let severity = 'Minor';
        let impact = 'Little to no damage expected.';
        let cause = 'Movement along tectonic plate boundaries caused stress release in the crust.';
        let deaths = 'No casualties reported.';

        if (mag >= 7.5) {
            severity = 'Major';
            impact = 'Severe damage to buildings and infrastructure. Potential for widespread destruction across large areas.';
            deaths = 'Significant casualties likely. Emergency response activated.';
        } else if (mag >= 7.0) {
            severity = 'Strong';
            impact = 'Heavy damage in populated areas. Buildings may collapse, especially older structures.';
            deaths = 'Casualties possible depending on population density.';
        } else if (mag >= 6.0) {
            severity = 'Moderate-Strong';
            impact = 'Damage to poorly constructed buildings. Felt strongly across wide area.';
            deaths = 'Minor casualties possible in densely populated regions.';
        } else if (mag >= 5.0) {
            severity = 'Moderate';
            impact = 'Minor damage to buildings. Widely felt by population.';
        } else if (mag >= 4.5) {
            severity = 'Light';
            impact = 'Felt by many people. Rarely causes significant damage.';
        }

        if (mag >= 6.5) {
            cause = 'A major fault rupture caused sudden displacement of tectonic plates, releasing enormous seismic energy that propagated through the crust as destructive P and S waves.';
        } else if (mag >= 5.5) {
            cause = 'Stress accumulated along a fault line was suddenly released, causing the ground to shake. The hypocenter (focus) was located several kilometers below the surface.';
        }

        return {
            title: `M${mag.toFixed(1)} Earthquake — ${place}`,
            date: dateStr,
            severity,
            type: 'earthquake',
            facts: [
                { label: 'Magnitude', value: `M${mag.toFixed(1)} (Richter Scale)` },
                { label: 'Location', value: place },
                { label: 'Date', value: dateStr || 'Recent' },
                { label: 'Severity', value: severity },
            ],
            what_happened: `A magnitude ${mag.toFixed(1)} earthquake struck ${place}. ${impact}`,
            why_it_happened: cause,
            impact: `${impact} ${deaths}`,
            image: EVENT_IMAGES.earthquake[Math.floor(Math.random() * EVENT_IMAGES.earthquake.length)],
        };
    }

    if (event.type === 'cyclone') {
        const name = event.name || 'Unknown Cyclone';
        const cat = event.category || 'Cyclonic Storm';
        const wind = event.max_wind_kmh;
        const rain = event.rainfall_mm;
        const damage = event.damage_crore;
        const year = event.year;

        return {
            title: `${name} (${year})`,
            date: event.dates || `${year}`,
            severity: cat,
            type: 'cyclone',
            facts: [
                { label: 'Name', value: name },
                { label: 'Category', value: cat },
                { label: 'Max Wind', value: wind ? `${wind} km/h` : '—' },
                { label: 'Rainfall', value: rain ? `${rain} mm` : '—' },
                { label: 'Damage', value: damage ? `₹${damage} crores` : '—' },
                { label: 'Year', value: `${year}` },
            ],
            what_happened: `Cyclone ${name} was a ${cat} that formed in the Bay of Bengal and impacted the Tamil Nadu and Chennai coastline. Maximum sustained winds reached ${wind || '—'} km/h with heavy rainfall of ${rain || '—'} mm recorded.`,
            why_it_happened: 'Tropical cyclones form over warm ocean waters (above 26°C) in the Bay of Bengal during pre-monsoon and post-monsoon seasons. Warm sea surface temperatures provide the energy that fuels the storm system as it intensifies.',
            impact: `The cyclone caused significant disruption to Chennai and surrounding districts. ${damage ? `Estimated damage: ₹${damage} crores.` : ''} Heavy rainfall led to flooding in low-lying areas of the city, which sits at only 6m above sea level.`,
            image: EVENT_IMAGES.cyclone[Math.floor(Math.random() * EVENT_IMAGES.cyclone.length)],
        };
    }

    if (event.type === 'tsunami') {
        const name = event.name || 'Tsunami Event';
        const wave = event.wave_height_m;
        const mag = event.magnitude;
        const fatalities = event.fatalities;
        const year = event.year;
        const location = event.location || 'Indian Ocean';

        return {
            title: `${name} Tsunami (${year})`,
            date: event.date || `${year}`,
            severity: wave >= 10 ? 'Catastrophic' : wave >= 5 ? 'Severe' : 'Moderate',
            type: 'tsunami',
            facts: [
                { label: 'Event', value: name },
                { label: 'Location', value: location },
                { label: 'Wave Height', value: wave ? `${wave} m` : '—' },
                { label: 'Trigger Mag', value: mag ? `M${mag}` : '—' },
                { label: 'Fatalities', value: fatalities ? fatalities.toLocaleString() : '—' },
                { label: 'Year', value: `${year}` },
            ],
            what_happened: `The ${name} tsunami was triggered by a magnitude ${mag || '—'} undersea earthquake in the ${location} region. Wave heights reached up to ${wave || '—'} meters, causing widespread coastal destruction.`,
            why_it_happened: 'Tsunamis are caused by sudden large-scale disturbances of the ocean floor, most commonly undersea earthquakes along subduction zones. The displaced water forms long-wavelength waves that travel at speeds up to 800 km/h across ocean basins.',
            impact: `${fatalities ? `This event claimed ${fatalities.toLocaleString()} lives, making it one of the most devastating tsunami events recorded.` : 'Significant coastal damage and displacement of communities.'} Chennai and Tamil Nadu coastlines are particularly vulnerable due to their low elevation and proximity to seismically active zones in the Indian Ocean.`,
            image: EVENT_IMAGES.tsunami[Math.floor(Math.random() * EVENT_IMAGES.tsunami.length)],
        };
    }

    return null;
}

export default function WikiCard({ event, onClose }) {
    const [data, setData] = useState(null);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        if (!event) { setData(null); return; }
        setImgError(false);
        const ctx = buildEventContext(event);
        setData(ctx);
    }, [event]);

    if (!event) return null;

    const TYPE_COLORS = {
        earthquake: '#f97316',
        cyclone: '#3b82f6',
        tsunami: '#06b6d4',
    };
    const color = TYPE_COLORS[event.type] || '#ffffff';

    return (
        <div className="wiki-card-overlay" onClick={onClose}>
            <div className="wiki-card" onClick={e => e.stopPropagation()}>
                <button className="wiki-close" onClick={onClose} aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                {!data ? (
                    <div className="wiki-loading">
                        <div className="wiki-spinner" style={{ borderTopColor: color }} />
                        <span>Loading event data...</span>
                    </div>
                ) : (
                    <div className="wiki-content">
                        {/* ── TYPE BADGE ── */}
                        <div className="wiki-type-badge" style={{ color, borderColor: `${color}33`, background: `${color}11` }}>
                            {event.type.toUpperCase()}
                        </div>

                        {/* ── TITLE + DATE ── */}
                        <h2 className="wiki-title">{data.title}</h2>
                        {data.date && <div className="wiki-date">{data.date}</div>}

                        {/* ── FACTS GRID ── */}
                        <div className="wiki-facts">
                            {data.facts.map((f, i) => (
                                <div key={i} className="wiki-fact">
                                    <div className="wiki-fact-label">{f.label}</div>
                                    <div className="wiki-fact-value" style={{ color }}>{f.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* ── WHAT HAPPENED ── */}
                        <div className="wiki-section">
                            <div className="wiki-section-title">WHAT HAPPENED</div>
                            <p className="wiki-section-body">{data.what_happened}</p>
                        </div>

                        {/* ── WHY IT HAPPENED ── */}
                        <div className="wiki-section">
                            <div className="wiki-section-title">WHY IT HAPPENED</div>
                            <p className="wiki-section-body">{data.why_it_happened}</p>
                        </div>

                        {/* ── IMPACT ── */}
                        <div className="wiki-section">
                            <div className="wiki-section-title" style={{ color: '#f87171' }}>IMPACT & DAMAGE</div>
                            <p className="wiki-section-body">{data.impact}</p>
                        </div>

                        {/* ── REAL IMAGE ── */}
                        <div className="wiki-image-wrap">
                            {!imgError ? (
                                <img
                                    src={data.image}
                                    alt={data.title}
                                    className="wiki-image"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="wiki-image-fallback" style={{ borderColor: `${color}33` }}>
                                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Image unavailable</span>
                                </div>
                            )}
                            <div className="wiki-image-caption">
                                Reference image · {data.title}
                            </div>
                        </div>

                        {/* ── SEVERITY INDICATOR ── */}
                        <div className="wiki-severity" style={{ borderColor: `${color}44` }}>
                            <span className="wiki-severity-label">SEVERITY</span>
                            <span className="wiki-severity-value" style={{ color }}>{data.severity}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}