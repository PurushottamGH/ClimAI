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
            region = "Oceanic Basin";
            detail = `Category ${event.category || 'Storm'}`;
        } else if (event.type === 'tsunami') {
            query = event.name.toLowerCase().includes('tsunami') ? event.name : `${event.name} Tsunami`;
            region = event.origin || event.location || "Oceanic Region";
            detail = `Wave Height: ${event.wave_height_m || '?'}m`;
        }

        setBasicInfo({ type: event.type, region, detail, query });

        // 2. Fetch authentic Wikipedia Data
        fetchWikiData(query).then(data => {
            setWikiData(data);
            setIsLoading(false);
        });

    }, [event]);

    if (!event) return null;

    return (
        <div className="wiki-card-overlay" onClick={onClose}>
            <div className="wiki-glass-card" onClick={e => e.stopPropagation()}>
                {/* Header matching EventsTimeline */}
                <div className="glass-card-header">
                    <span className="glass-card-id">{basicInfo?.type?.toUpperCase()}</span>
                    <button className="glass-card-close" onClick={onClose} aria-label="Close" />
                </div>

                {/* Hero Image matching EventsTimeline */}
                <div className="glass-card-image-container">
                    {isLoading ? (
                        <div className="glass-image-placeholder">
                            <div className="glass-spinner" />
                        </div>
                    ) : (
                        <img 
                            src={wikiData?.src || 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=='} 
                            alt={wikiData?.title || basicInfo?.query} 
                            className="glass-card-image" 
                        />
                    )}
                </div>

                {/* Details matching EventsTimeline */}
                <div className="glass-card-details">
                    <div className="glass-detail-row">
                        <span className="glass-detail-label">Event:</span>
                        <span className="glass-detail-value">
                            {isLoading ? 'Searching Wikipedia...' : (wikiData?.title || basicInfo?.query)}
                        </span>
                    </div>
                    <div className="glass-detail-row" style={{ marginTop: '4px' }}>
                        <span className="glass-detail-label">Region:</span>
                        <span className="glass-detail-value">{basicInfo?.region}</span>
                    </div>
                    <div className="glass-detail-row" style={{ marginTop: '4px' }}>
                        <span className="glass-detail-label">Metrics:</span>
                        <span className="glass-detail-value">{basicInfo?.detail}</span>
                    </div>
                    
                    <div className="glass-card-extract">
                        {isLoading ? 'Extracting verified architectural data...' : (wikiData?.extract || 'No exact Wikipedia summary found. Real-time data mapped from event grid.')}
                    </div>

                    {wikiData?.url && (
                        <a 
                            href={wikiData.url} target="_blank" rel="noreferrer"
                            className="glass-card-link"
                        >
                            Read more on Wikipedia ↗
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}