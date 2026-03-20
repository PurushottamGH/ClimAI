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
            <div className="wiki-timeline-card" onClick={e => e.stopPropagation()}>
                {/* Header matching EventsTimeline */}
                <div className="card-header">
                    <span className="card-id">{event.id || `EVT-${event.year || new Date().getFullYear()}`}</span>
                    <span className={`card-dot ${event.type}`} />
                    <button className="timeline-card-close" onClick={onClose}>×</button>
                </div>

                {/* Compact Image */}
                <div className="card-image-container">
                    {isLoading ? (
                        <div className="card-image-placeholder">
                            <div className="card-spinner" />
                        </div>
                    ) : (
                        <img 
                            src={wikiData?.src || 'https://images.unsplash.com/photo-1594156596782-656c93e4d504?q=80&w=800&auto=format&fit=crop'} 
                            alt={wikiData?.title || basicInfo?.query} 
                            className="card-image" 
                        />
                    )}
                </div>

                {/* Vertical Details matching 3rd Image */}
                <div className="card-details">
                    <div className="detail-row">
                        <span className="detail-label">EVENT:</span>
                        <span className="detail-value">{wikiData?.title || basicInfo?.query}</span>
                    </div>

                    <div className="detail-row">
                        <span className="detail-label">REGION:</span>
                        <span className="detail-value">{basicInfo?.region}</span>
                    </div>

                    <div className="detail-row">
                        <span className="detail-label">FOCUS:</span>
                        <span className="detail-value">{basicInfo?.detail}</span>
                    </div>

                    {/* Enriched Metrics in same style */}
                    {(event.deaths != null || event.cost || event.rainfall) && (
                        <div className="detail-row metrics-row">
                            <span className="detail-label">METRICS:</span>
                            <div className="compact-metrics-list">
                                {event.deaths != null && <span className="m-pill deaths">{event.deaths.toLocaleString()} Deaths</span>}
                                {event.cost && <span className="m-pill cost">{event.cost}</span>}
                                {event.rainfall && <span className="m-pill rain">{event.rainfall}</span>}
                            </div>
                        </div>
                    )}

                    <div className="card-extract">
                        {isLoading ? 'Retrieving records...' : (wikiData?.extract || 'Regional data indicates environmental displacement. Atmospheric instability triggered the event.')}
                    </div>

                    {wikiData?.url && (
                        <a href={wikiData.url} target="_blank" rel="noreferrer" className="card-link">
                            Read more on Wikipedia ↗
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}