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
                    const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${commonsQuery}&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=800&format=json&origin=*`;
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

    if (!event) return null;

    return (
        <div className="wiki-card-overlay" onClick={onClose}>
            <div className="wiki-glass-card" onClick={e => e.stopPropagation()}>
                {/* Header matching User's 2nd Screenshot */}
                <div className="glass-card-header">
                    <div className="header-event-type">
                        {event.type.toUpperCase()}
                        <span className={`status-dot ${event.type}`} />
                    </div>
                    <button className="glass-card-close" onClick={onClose} aria-label="Close" />
                </div>

                {/* Hero Image */}
                <div className="glass-card-image-container">
                    {isLoading ? (
                        <div className="glass-image-placeholder">
                            <div className="glass-spinner" />
                        </div>
                    ) : (
                        <img 
                            src={wikiData?.src || 'https://images.unsplash.com/photo-1594156596782-656c93e4d504?q=80&w=800&auto=format&fit=crop'} 
                            alt={wikiData?.title || basicInfo?.query} 
                            className="glass-card-image" 
                        />
                    )}
                </div>

                {/* Details */}
                <div className="glass-card-content">
                    <div className="detail-section">
                        <label>EVENT:</label>
                        <h3>{wikiData?.title || basicInfo?.query}</h3>
                    </div>

                    <div className="detail-section">
                        <label>METRICS:</label>
                        <div className="popup-metrics-grid">
                            <div className="p-metric">
                                <span className="p-label">Intensity:</span>
                                <span className="p-value">{basicInfo?.detail}</span>
                            </div>
                            <div className="p-metric">
                                <span className="p-label">Rainfall:</span>
                                <span className="p-value">{event.rainfall || 'N/A'}</span>
                            </div>
                            <div className="p-metric">
                                <span className="p-label">Economic Cost:</span>
                                <span className="p-value">{event.cost || 'N/A'}</span>
                            </div>
                            {event.deaths != null && (
                                <div className="p-metric highlight">
                                    <span className="p-label">Impact:</span>
                                    <span className="p-value">{event.deaths.toLocaleString()} souls lost</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="detail-section extract">
                        <label>SITUATION REPORT:</label>
                        <p>{isLoading ? 'Retrieving verified records...' : (wikiData?.extract || 'Regional data indicates significant environmental displacement. High atmospheric instability triggered the event.')}</p>
                    </div>

                    <div className="detail-section">
                        <label>AFFECTED ZONES:</label>
                        <p className="impact-zones">{event.impact_zone || event.landfall || event.place || "Regional coastal and inland zones"}</p>
                    </div>

                    {wikiData?.url && (
                        <a href={wikiData.url} target="_blank" rel="noreferrer" className="glass-card-link">
                            Read more on Wikipedia ↗
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}