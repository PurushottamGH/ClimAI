import { useState, useEffect } from 'react';
import './WikiCard.css';

// ── Fetch real image and text from Wikipedia ──
async function fetchWikiData(query) {
    try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();
        const title = searchData?.query?.search?.[0]?.title;
        if (!title) return null;

        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
        const summaryRes = await fetch(summaryUrl);
        const summaryData = await summaryRes.json();

        let hiRes = null;
        if (summaryData?.thumbnail?.source) {
            hiRes = summaryData.originalimage?.source || summaryData.thumbnail.source.replace(/\/\d+px-/, '/600px-');
        }
        
        return {
            title: summaryData.title,
            src: hiRes,
            extract: summaryData.extract,
            url: summaryData.content_urls?.desktop?.page,
        };
    } catch {
        return null;
    }
}

export default function WikiCard({ event, onClose }) {
    const [wikiData, setWikiData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [basicInfo, setBasicInfo] = useState(null);

    useEffect(() => {
        if (!event) return;
        setIsLoading(true);

        // 1. Determine natural language query and generic stats
        let query = "";
        let region = "";
        let detail = "";

        if (event.type === 'earthquake') {
            const place = event.place || 'Unknown';
            const placeQuery = place.split(',').pop()?.trim() || place.split(' of ').pop()?.trim() || place;
            query = `${placeQuery} earthquake`;
            region = place;
            detail = `Magnitude ${event.magnitude} Seismic Event`;
        } else if (event.type === 'cyclone') {
            query = `Cyclone ${event.name} ${event.year || ''}`.trim();
            region = event.landfall || "Oceanic Basin";
            detail = `${event.category || 'Storm'}`;
        } else if (event.type === 'tsunami') {
            query = event.name.toLowerCase().includes('tsunami') ? event.name : `${event.name} Tsunami`;
            region = event.origin || event.location || "Oceanic Region";
            detail = `Wave Height: ${event.wave_height_m || '?'}m`;
        }

        setBasicInfo({ type: event.type, region, detail, query });

        // 2. Fetch authentic Wikipedia Data
        fetchWikiData(query).then(async data => {
            // 3. Authentic Image Search Fallback
            if (data && !data.src) {
                try {
                    const commonsQuery = encodeURIComponent(query);
                    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${commonsQuery}&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json&origin=*`;
                    const res = await fetch(commonsUrl);
                    const commonsData = await res.json();
                    if (commonsData.query && commonsData.query.pages) {
                        const pages = Object.values(commonsData.query.pages);
                        if (pages.length > 0 && pages[0].imageinfo && pages[0].imageinfo[0]) {
                            data.src = pages[0].imageinfo[0].thumburl;
                        }
                    }
                } catch (e) { console.error(e); }
            }
            setWikiData(data);
            setIsLoading(false);
        });

    }, [event]);

    // Use a CSS class for visibility instead of returning null
    const isActive = !!event;

    return (
        <div className={`side-widget-container ${isActive ? 'active' : ''}`}>
            {event && (
                <div className="side-widget-content">
                    {/* Header */}
                    <div className="widget-header">
                        <div className="widget-type-badge">
                            <span className={`type-dot ${event.type}`} />
                            {event.type.toUpperCase()}
                        </div>
                        <button className="widget-close" onClick={onClose}>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    {/* Image */}
                    <div className="widget-hero">
                        {isLoading ? (
                            <div className="shimmer-placeholder" />
                        ) : (
                            <img 
                                src={wikiData?.src || 'https://images.unsplash.com/photo-1594156596782-656c93e4d504?q=80&w=800&auto=format&fit=crop'} 
                                alt={wikiData?.title} 
                                className="hero-img" 
                            />
                        )}
                        <div className="hero-overlay">
                            <h3>{wikiData?.title || basicInfo?.query}</h3>
                            <p>{basicInfo?.region}</p>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="metrics-scroll-area">
                        <section className="metrics-section">
                            <h4 className="section-title">Core Metrics</h4>
                            <div className="metrics-grid">
                                <div className="metric-item">
                                    <label>Intensity / Scale</label>
                                    <span>{basicInfo?.detail}</span>
                                </div>
                                <div className="metric-item">
                                    <label>Date / Period</label>
                                    <span>{event.time || event.dates || event.year}</span>
                                </div>
                                {event.deaths != null && (
                                    <div className="metric-item highlight">
                                        <label>People Died</label>
                                        <span>{event.deaths.toLocaleString()} souls</span>
                                    </div>
                                )}
                                {event.cost && (
                                    <div className="metric-item">
                                        <label>Economic Cost</label>
                                        <span>{event.cost}</span>
                                    </div>
                                )}
                                {event.rainfall && (
                                    <div className="metric-item">
                                        <label>Rainfall</label>
                                        <span>{event.rainfall}</span>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="metrics-section">
                            <h4 className="section-title">Impact Zones & Details</h4>
                            <div className="detail-card">
                                <label>Affected Places</label>
                                <p>{event.impact_zone || event.landfall || event.place || "Regional coastal and inland zones"}</p>
                            </div>
                            {event.reason && (
                                <div className="detail-card">
                                    <label>Primary Cause</label>
                                    <p>{event.reason}</p>
                                </div>
                            )}
                            <div className="detail-card extract">
                                <label>Situation Report</label>
                                <p>
                                    {isLoading ? 'Fetching verified report...' : (wikiData?.extract || 'Localized environmental impact recorded. High surface temperature and atmospheric pressure instability triggered the event.')}
                                </p>
                            </div>
                        </section>

                        {wikiData?.url && (
                            <a href={wikiData.url} target="_blank" rel="noreferrer" className="wiki-source-btn">
                                Open Wikipedia Report
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}