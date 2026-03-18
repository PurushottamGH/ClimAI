import { useState, useEffect } from 'react';
import './WikiCard.css';

export default function WikiCard({ event, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!event) return;

        async function fetchWiki() {
            setLoading(true);
            setError(null);
            
            // Generate search query based on event type
            let query = '';
            if (event.type === 'earthquake') {
                // Earthquakes often don't have specific pages unless very large
                // We'll search for the location + earthquake + year
                const date = new Date(event.time);
                const year = date.getFullYear();
                query = `${event.place} earthquake ${year}`;
            } else if (event.type === 'cyclone') {
                query = `Cyclone ${event.name}`;
            } else if (event.type === 'tsunami') {
                query = `${event.name} Tsunami`;
            }

            try {
                // 1. Search for best title
                const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
                const searchRes = await fetch(searchUrl);
                const searchData = await searchRes.json();
                
                const title = searchData.query?.search[0]?.title;
                
                if (!title) {
                    setError('No detailed records found for this specific event.');
                    setLoading(false);
                    return;
                }

                // 2. Fetch summary and image
                const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
                const summaryRes = await fetch(summaryUrl);
                const summaryData = await summaryRes.json();

                if (summaryData.type === 'standard' || summaryData.type === 'disambiguation') {
                    setData(summaryData);
                } else {
                    setError('Relevant page found, but summary is unavailable.');
                }
            } catch (err) {
                console.error('Wiki fetch error:', err);
                setError('Failed to fetch event context.');
            } finally {
                setLoading(false);
            }
        }

        fetchWiki();
    }, [event]);

    if (!event) return null;

    return (
        <div className="wiki-card-overlay">
            <div className="wiki-card">
                <button className="wiki-close" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                {loading ? (
                    <div className="wiki-loading">
                        <div className="wiki-spinner" />
                        <span>Searching Archives...</span>
                    </div>
                ) : error ? (
                    <div className="wiki-error">
                        <div className="wiki-error-icon">!</div>
                        <p>{error}</p>
                        <button className="wiki-retry-btn" onClick={onClose}>Close</button>
                    </div>
                ) : data && (
                    <div className="wiki-content">
                        {data.thumbnail && (
                            <div className="wiki-image-wrap">
                                <img src={data.thumbnail.source} alt={data.title} className="wiki-image" />
                                <div className="wiki-image-gradient" />
                            </div>
                        )}
                        
                        <div className="wiki-body">
                            <div className="wiki-eyebrow">Data Intelligence / Context</div>
                            <h2 className="wiki-title">{data.title}</h2>
                            <p className="wiki-extract">{data.extract}</p>
                            
                            <div className="wiki-footer">
                                <a 
                                    href={data.content_urls?.desktop?.page} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="wiki-link"
                                >
                                    <span>Read Full Archive</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
