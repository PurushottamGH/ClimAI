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

    const getFormattedDate = () => {
        if (!event) return '';
        let d;
        if (event.time) {
            d = new Date(event.time);
        } else if (event.year) {
            const monthIndex = event.month ? event.month - 1 : 0;
            const day = event.day || 1;
            d = new Date(event.year, monthIndex, day);
        } else {
            return '';
        }
        
        if (isNaN(d.getTime())) return '';
        
        const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        const date = d.getDate();
        const day = d.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();
        const year = d.getFullYear();
        
        return `${month} ${date} | ${day} ${year}`;
    };

    const dateString = getFormattedDate();

    return (
        <div className="wiki-card-overlay">
            <div className="wiki-card">
                <button className="wiki-close" onClick={onClose} aria-label="Close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                        <div className="wiki-body">
                            <h2 className="wiki-title">{data.title}</h2>
                            {dateString && <div className="wiki-date">{dateString}</div>}
                            
                            <p className="wiki-extract">{data.extract}</p>
                            
                            <div className="wiki-footer">
                                <span className="wiki-footer-text">(more option to vew more details about events)</span>
                                <a 
                                    href={data.content_urls?.desktop?.page} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="wiki-link"
                                >
                                    more.
                                </a>
                            </div>

                            {data.thumbnail ? (
                                <div className="wiki-image-wrap">
                                    <img src={data.thumbnail.source} alt={data.title} className="wiki-image" />
                                </div>
                            ) : (
                                <div className="wiki-image-wrap wiki-image-placeholder">
                                    <span>REFERENCE REAL IMAGE</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
