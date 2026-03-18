import { useState, useEffect } from 'react';
import './WikiCard.css';

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

        // Extract city/region name for image search
        const placeForImage = place.split(',').pop()?.trim() || place.split(' of ').pop()?.trim() || place;

        return {
            title: `M${mag.toFixed(1)} Earthquake — ${place}`,
            date: dateStr,
            severity,
            type: 'earthquake',
            imageQuery: `${placeForImage} earthquake damage`,
            facts: [
                { label: 'Magnitude', value: `M${mag.toFixed(1)} (Richter Scale)` },
                { label: 'Location', value: place },
                { label: 'Date', value: dateStr || 'Recent' },
                { label: 'Severity', value: severity },
            ],
            what_happened: `A magnitude ${mag.toFixed(1)} earthquake struck ${place}. ${impact}`,
            why_it_happened: cause,
            impact: `${impact} ${deaths}`,
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
            imageQuery: `Cyclone ${name} ${year}`,
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
            impact: `The cyclone caused significant disruption to Chennai and surrounding districts. ${damage ? `Estimated damage: ₹${damage} crores.` : ''} Heavy rainfall led to flooding in low-lying areas of the city.`,
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
            imageQuery: `${name} tsunami ${year}`,
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
            impact: `${fatalities ? `This event claimed ${fatalities.toLocaleString()} lives, making it one of the most devastating tsunami events recorded.` : 'Significant coastal damage and displacement of communities.'} Chennai and Tamil Nadu coastlines are particularly vulnerable due to their low elevation.`,
        };
    }

    return null;
}

// ── Fetch real image from Wikipedia for the event ──
async function fetchWikiImage(query) {
    try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        const title = searchData?.query?.search?.[0]?.title;
        if (!title) return null;

        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const summaryRes = await fetch(summaryUrl);
        const summaryData = await summaryRes.json();

        if (summaryData?.thumbnail?.source) {
            // Get higher resolution by replacing thumbnail size
            const hiRes = summaryData.originalimage?.source || summaryData.thumbnail.source.replace(/\/\d+px-/, '/600px-');
            return {
                src: hiRes,
                caption: summaryData.title,
                url: summaryData.content_urls?.desktop?.page,
            };
        }
        return null;
    } catch {
        return null;
    }
}

export default function WikiCard({ event, onClose }) {
    const [data, setData] = useState(null);
    const [imageInfo, setImageInfo] = useState(null);
    const [imgLoading, setImgLoading] = useState(false);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        if (!event) { setData(null); setImageInfo(null); return; }
        setImgError(false);
        setImgLoading(true);
        const ctx = buildEventContext(event);
        setData(ctx);

        // Fetch real Wikipedia image
        if (ctx?.imageQuery) {
            fetchWikiImage(ctx.imageQuery).then(info => {
                setImageInfo(info);
                setImgLoading(false);
            });
        } else {
            setImgLoading(false);
        }
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

                        {/* ── TWO COLUMN: Facts + Sections left, Image right ── */}
                        <div className="wiki-body-row">
                            <div className="wiki-body-left">
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
                            </div>

                            {/* ── RIGHT: Image ── */}
                            <div className="wiki-body-right">
                                <div className="wiki-image-wrap">
                                    {imgLoading ? (
                                        <div className="wiki-image-loading">
                                            <div className="wiki-spinner" style={{ borderTopColor: color }} />
                                        </div>
                                    ) : imageInfo && !imgError ? (
                                        <>
                                            <img
                                                src={imageInfo.src}
                                                alt={data.title}
                                                className="wiki-image"
                                                onError={() => setImgError(true)}
                                            />
                                            <div className="wiki-image-caption">
                                                {imageInfo.caption} · Wikipedia
                                            </div>
                                        </>
                                    ) : (
                                        <div className="wiki-image-fallback">
                                            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>Image unavailable</span>
                                        </div>
                                    )}
                                </div>

                                {/* ── SEVERITY INDICATOR ── */}
                                <div className="wiki-severity" style={{ borderColor: `${color}44` }}>
                                    <span className="wiki-severity-label">SEVERITY</span>
                                    <span className="wiki-severity-value" style={{ color }}>{data.severity}</span>
                                </div>
                            </div>
                        </div>

                        {/* ── IMPACT (full width below) ── */}
                        <div className="wiki-section">
                            <div className="wiki-section-title" style={{ color: '#f87171' }}>IMPACT & DAMAGE</div>
                            <p className="wiki-section-body">{data.impact}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}