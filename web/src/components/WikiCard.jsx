import { useState, useEffect } from 'react';
import { api } from '../api';
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
            
            // We will calculate date upfront specifically for the backend call
            let eventDate = '';
            let d;
            if (event.time) {
                d = new Date(event.time);
            } else if (event.year) {
                const monthIndex = event.month ? event.month - 1 : 0;
                const day = event.day || 1;
                d = new Date(event.year, monthIndex, day);
            }
            if (d && !isNaN(d.getTime())) {
                const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
                const date = d.getDate();
                const day = d.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();
                const year = d.getFullYear();
                eventDate = `${month} ${date} | ${day} ${year}`;
            }

            let queryParams = new URLSearchParams();
            queryParams.append('type', event.type);
            queryParams.append('date', eventDate);
            
            if (event.type === 'earthquake') {
                queryParams.append('name', event.place);
                queryParams.append('magnitude', event.magnitude || '');
            } else if (event.type === 'cyclone') {
                queryParams.append('name', event.name);
            } else if (event.type === 'tsunami') {
                queryParams.append('name', event.name);
            }

            try {
                const data = await api.getEventContext(queryParams.toString());
                
                if (data.error) {
                    setError('Intelligence failure: ' + data.error);
                } else {
                    setData(data);
                }
            } catch (err) {
                console.error('API fetch error:', err);
                setError('Failed to fetch event context. Error: ' + err.message);
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
