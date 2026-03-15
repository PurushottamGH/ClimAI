import { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import './XaiPanel.css';

const MODEL_NAMES = {
    random_forest: 'Random Forest',
    xgboost: 'XGBoost',
    lstm: 'LSTM',
    lightgbm: 'LightGBM',
};
const MODEL_ORDER = ['random_forest', 'xgboost', 'lstm', 'lightgbm'];

const INTENT_LABELS = {
    weather: 'Weather',
    prediction: 'Prediction',
    earthquake: 'Earthquake',
    cyclone: 'Cyclone',
    tsunami: 'Tsunami',
    disaster: 'Disaster',
};

const SUGGESTION_ICONS = {
    earthquake: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
    cyclone: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" /></svg>,
    tsunami: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.6 2 5.2 2 2.5 0 2.5-2 5.2-2 1.3 0 1.9.5 2.5 1" /><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.6 2 5.2 2 2.5 0 2.5-2 5.2-2 1.3 0 1.9.5 2.5 1" /><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.6 2 5.2 2 2.5 0 2.5-2 5.2-2 1.3 0 1.9.5 2.5 1" /></svg>,
    temperature: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" /></svg>,
    weather: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg>,
    prediction: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>,
    disaster: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
};

const SUGGESTION_OPTIONS = [
    { id: 'earthquake', label: 'Earthquake', desc: 'Seismic events & monitoring' },
    { id: 'cyclone', label: 'Cyclone', desc: 'Storm tracking & impacts' },
    { id: 'tsunami', label: 'Tsunami', desc: 'Wave heights & warnings' },
    { id: 'temperature', label: 'Temperature', desc: 'Heatmaps & climate trends' },
    { id: 'weather', label: 'Weather', desc: 'Forecasts & conditions' },
];

const SOURCE_FILES = {
    weather: ['api/weather.py', 'services/open_meteo.py'],
    prediction: ['models/random_forest.py', 'models/xgboost.py', 'models/lstm.py', 'models/lightgbm.py'],
    earthquake: ['api/earthquakes.py', 'services/usgs.py'],
    cyclone: ['api/cyclones.py', 'data/bay_of_bengal.json'],
    tsunami: ['api/tsunamis.py', 'data/indian_ocean.json'],
    disaster: ['api/main.py', 'services/analysis.py'],
};

export default function XaiPanel({ open, onClose }) {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState([]); // array of { id, query, phase, result, steps, modelStatus }
    const [activeId, setActiveId] = useState(null); // id of the currently loading message

    // UI Chatbox @ Mentions State
    const [selectedContexts, setSelectedContexts] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionFilter, setSuggestionFilter] = useState('');
    const [suggestionIndex, setSuggestionIndex] = useState(0);

    const messagesRef = useRef(null);

    useEffect(() => {
        if (messagesRef.current) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        }
    }, [messages, activeId]);

    const reset = () => {
        setQuery(''); setMessages([]); setActiveId(null);
        setSelectedContexts([]); setShowSuggestions(false);
    };

    const handleClose = () => { reset(); onClose(); };

    // Helper: is any message still loading?
    const isWorking = messages.some(m => m.phase === 'working');
    // Current overall phase for UI (idle if no messages, else check last)
    const globalPhase = messages.length === 0 ? 'idle' : isWorking ? 'working' : 'done';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!query.trim() && selectedContexts.length === 0) return;
        if (isWorking) return; // don't allow while a query is loading

        const contextPrefix = selectedContexts.map(c => `@${c}`).join(' ');
        const fullPrompt = `${contextPrefix} ${query}`.trim();
        const msgId = Date.now();

        // Create a new message entry
        const newMsg = {
            id: msgId,
            query: fullPrompt,
            phase: 'working',
            result: null,
            steps: [{ step: 'understand', status: 'running', detail: 'Understanding your question...' }],
            modelStatus: {},
        };

        setMessages(prev => [...prev, newMsg]);
        setActiveId(msgId);
        setQuery('');
        setShowSuggestions(false);
        // Don't clear selectedContexts so user can reuse

        const updateMsg = (id, updates) => {
            setMessages(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
        };

        await delay(500);
        updateMsg(msgId, { steps: [{ step: 'understand', status: 'done', detail: 'Query understood' }] });
        await delay(300);
        updateMsg(msgId, {
            steps: [
                { step: 'understand', status: 'done', detail: 'Query understood' },
                { step: 'fetch', status: 'running', detail: 'Fetching relevant data...' }
            ]
        });

        try {
            const data = await api.askClimAI(fullPrompt);
            if (data.error) {
                updateMsg(msgId, { phase: 'error', result: { error: data.error } });
                setActiveId(null);
                return;
            }

            let newModelStatus = {};
            if (data.models && Object.keys(data.models).length > 0) {
                for (const m of MODEL_ORDER) {
                    if (data.models[m]) {
                        newModelStatus[m] = data.models[m]?.status === 'success' ? 'done' : 'error';
                    }
                }
            }

            updateMsg(msgId, {
                phase: 'done',
                result: data,
                steps: data.steps || [],
                modelStatus: newModelStatus,
            });
            setActiveId(null);
        } catch (err) {
            updateMsg(msgId, {
                phase: 'error',
                result: { error: err.message || 'Request failed' },
            });
            setActiveId(null);
        }
    };

    if (!open) return null;

    return (
        <div className="xai-overlay" onClick={handleClose}>
            <div className="xai-modal" onClick={e => e.stopPropagation()}>
                <button className="xai-close" onClick={handleClose}>✕</button>

                <div className="xai-messages" ref={messagesRef}>
                    {messages.length === 0 && (
                        <div className="xai-empty-state">
                            <div className="xai-logo">Hey, ClimAI here.</div>
                            <p className="xai-subtitle">How can I help you today?</p>
                        </div>
                    )}

                    {messages.map((msg) => {
                        const result = msg.result;
                        const phase = msg.phase;
                        const steps = msg.steps || [];
                        const modelStatus = msg.modelStatus || {};

                        const intents = result?.intents || [];
                        const targetDate = result?.target_date;
                        const dateType = result?.date_type;
                        const historicalWeather = result?.data?.historical_weather;
                        const weather = result?.data?.weather;
                        const earthquake = result?.data?.earthquake;
                        const cyclone = result?.data?.cyclone;
                        const tsunami = result?.data?.tsunami;

                        // Collect source files based on intents
                        const files = intents.flatMap(i => SOURCE_FILES[i] || []);
                        if (historicalWeather) files.push('archive-api.open-meteo.com');
                        const uniqueFiles = [...new Set(files)];

                        return (
                            <div key={msg.id} className="xai-message-block">
                                {/* User query */}
                                <div className="xai-user-query">
                                    <span>→ </span>
                                    {msg.query.split(' ').map((word, idx) => {
                                        if (word.startsWith('@')) {
                                            return <span key={idx} className="xai-query-pill">{word.slice(1)}</span>;
                                        }
                                        return <span key={idx}>{word} </span>;
                                    })}
                                </div>

                                {/* Intent + Date tags */}
                                {(intents.length > 0 || targetDate) && (
                                    <div className="xai-intents">
                                        {intents.map(i => (
                                            <span key={i} className="xai-intent-tag">
                                                {SUGGESTION_ICONS[i] && <span className="xai-intent-icon">{SUGGESTION_ICONS[i]}</span>}
                                                {INTENT_LABELS[i] || i}
                                            </span>
                                        ))}
                                        {targetDate && (
                                            <span className="xai-intent-tag xai-date-tag">
                                                <span className="xai-intent-icon">
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                                                </span>
                                                {targetDate} ({dateType?.replace('_', ' ')})
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Source files */}
                                <div className="xai-file-list">
                                    {(uniqueFiles.length > 0 ? uniqueFiles : ['api/main.py']).map(f => (
                                        <span key={f} className="xai-file-path">{f}</span>
                                    ))}
                                </div>

                                {/* Steps from backend */}
                                {steps.map((s, i) => (
                                    <div key={i} className={`xai-step ${s.status}`}>
                                        <span className={`xai-step-icon ${s.status}`}>
                                            {s.status === 'done' ? '✓' : s.status === 'error' ? '✗' : '◎'}
                                        </span>
                                        <span>{s.detail}</span>
                                    </div>
                                ))}

                                {/* Model checklist — only if models actually ran */}
                                {Object.keys(modelStatus).length > 0 && (
                                    <div className="xai-task-group">
                                        <div className="xai-task-header">
                                            <span className={`xai-dot ${phase === 'done' ? 'dot-green' : 'dot-gray'}`}></span>
                                            <span className="xai-task-title">
                                                {phase === 'done' ? 'All models complete' : 'Models working as team'}
                                            </span>
                                        </div>
                                        <div className="xai-task-list">
                                            {MODEL_ORDER.filter(m => modelStatus[m]).map(m => {
                                                const s = modelStatus[m];
                                                return (
                                                    <div key={m} className={`xai-task ${s === 'done' ? 'done' : s === 'error' ? 'err' : ''}`}>
                                                        <span className={`xai-checkbox ${s === 'done' ? 'checked' : s === 'error' ? 'err' : ''}`}>
                                                            {s === 'done' ? '⊠' : '✗'}
                                                        </span>
                                                        <span>{MODEL_NAMES[m]}</span>
                                                        {result?.models?.[m]?.time_ms && s === 'done' && (
                                                            <span className="xai-time-badge">{result.models[m].time_ms}ms</span>
                                                        )}
                                                        {s === 'error' && <span className="xai-time-badge err">failed → fallback</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Cooking indicator */}
                                {phase === 'working' && (
                                    <div className="xai-task-group">
                                        <div className="xai-task-header">
                                            <span className="xai-dot dot-green dot-pulse"></span>
                                            <span className="xai-task-title">Cooking...</span>
                                        </div>
                                    </div>
                                )}

                                {/* Error */}
                                {phase === 'error' && result?.error && (
                                    <div className="xai-error">✗ {result.error}</div>
                                )}

                                {/* ═══ RESULTS — BERKELEY GRAPHICS TECH DOC ═══ */}
                                {phase === 'done' && result && (() => {
                                    const primaryIntent = intents[0] || 'weather';
                                    const now = new Date();
                                    const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);

                                    // Build data fields based on intent
                                    const buildGridData = () => {
                                        if (primaryIntent === 'cyclone' && cyclone) {
                                            const c = cyclone.cyclones?.[0] || {};
                                            return {
                                                title: `CYCLONE INTELLIGENCE REPORT`,
                                                subtitle: c.name ? `CYCLONE ${c.name.toUpperCase()}` : 'CYCLONE ANALYSIS',
                                                classification: 'TROPICAL CYCLONE',
                                                leftCells: [
                                                    { label: 'EVENT TYPE', value: 'TROPICAL CYCLONE' },
                                                    { label: 'BASIN', value: 'BAY OF BENGAL' },
                                                    { label: 'REGION', value: 'INDIAN OCEAN / SOUTH ASIA' },
                                                ],
                                                centerCells: [
                                                    { label: 'MAX WIND', value: `${c.max_wind_kmh || '—'} KM/H` },
                                                    { label: 'CATEGORY', value: c.category || '—' },
                                                    { label: 'YEAR', value: `${c.year || '—'}` },
                                                ],
                                                rightCells: [
                                                    { label: 'DATA SOURCE', value: 'NOAA IBTrACS' },
                                                    { label: 'ANALYSIS ENGINE', value: 'CLIMAI v2.0' },
                                                    { label: 'CONFIDENCE', value: 'HIGH' },
                                                ],
                                                callouts: [
                                                    { pos: 'top-left', label: 'WIND PROFILE', value: `Vmax = ${c.max_wind_kmh || '—'} km/h` },
                                                    { pos: 'top-right', label: 'STORM CATEGORY', value: c.category || 'UNKNOWN' },
                                                    { pos: 'bottom-left', label: 'LANDFALL REGION', value: 'TAMIL NADU COAST' },
                                                    { pos: 'bottom-right', label: 'TOTAL CYCLONES', value: `${cyclone.cyclones?.length || 0} EVENTS` },
                                                ],
                                                vizType: 'cyclone',
                                                spectrumLabel: 'CYCLONE INTENSITY SCALE',
                                                events: cyclone.cyclones || [],
                                            };
                                        }
                                        if (primaryIntent === 'earthquake' && earthquake) {
                                            const s = earthquake.summary || {};
                                            const topEvent = earthquake.events?.[0] || {};
                                            return {
                                                title: 'SEISMIC ACTIVITY REPORT',
                                                subtitle: topEvent.place || 'GLOBAL SEISMIC MONITORING',
                                                classification: 'SEISMIC EVENT',
                                                leftCells: [
                                                    { label: 'EVENT TYPE', value: 'TECTONIC EARTHQUAKE' },
                                                    { label: 'MONITORING', value: 'LAST 30 DAYS' },
                                                    { label: 'NETWORK', value: 'USGS SEISMOGRAPH' },
                                                ],
                                                centerCells: [
                                                    { label: 'TOTAL EVENTS', value: `${s.total || '—'}` },
                                                    { label: 'MAX MAGNITUDE', value: `M${s.max_magnitude || '—'}` },
                                                    { label: 'AVG DEPTH', value: `${s.avg_depth || '—'} KM` },
                                                ],
                                                rightCells: [
                                                    { label: 'DATA SOURCE', value: 'USGS EARTHQUAKE API' },
                                                    { label: 'ANALYSIS ENGINE', value: 'CLIMAI v2.0' },
                                                    { label: 'MIN MAGNITUDE', value: 'M4.5+' },
                                                ],
                                                callouts: [
                                                    { pos: 'top-left', label: 'PEAK MAGNITUDE', value: `Mw = ${s.max_magnitude || '—'}` },
                                                    { pos: 'top-right', label: 'DEPTH RANGE', value: `${s.avg_depth || '—'} KM AVG` },
                                                    { pos: 'bottom-left', label: 'EVENT COUNT', value: `N = ${s.total || 0}` },
                                                    { pos: 'bottom-right', label: 'DETECTION THRESHOLD', value: 'M ≥ 4.5' },
                                                ],
                                                vizType: 'earthquake',
                                                spectrumLabel: 'MAGNITUDE INTENSITY',
                                                events: earthquake.events?.slice(0, 5) || [],
                                            };
                                        }
                                        if (primaryIntent === 'tsunami' && tsunami) {
                                            const topEvent = tsunami.events?.[0] || {};
                                            return {
                                                title: 'TSUNAMI INTELLIGENCE REPORT',
                                                subtitle: topEvent.name || 'INDIAN OCEAN MONITORING',
                                                classification: 'TSUNAMI EVENT',
                                                leftCells: [
                                                    { label: 'EVENT TYPE', value: 'TSUNAMI / SEISMIC SEA WAVE' },
                                                    { label: 'BASIN', value: 'INDIAN OCEAN' },
                                                    { label: 'REGION', value: 'SOUTH / SOUTHEAST ASIA' },
                                                ],
                                                centerCells: [
                                                    { label: 'TRIGGER MAG', value: `M${topEvent.magnitude || '—'}` },
                                                    { label: 'WAVE HEIGHT', value: `${topEvent.wave_height_m || '—'} M` },
                                                    { label: 'DATE', value: topEvent.date || '—' },
                                                ],
                                                rightCells: [
                                                    { label: 'DATA SOURCE', value: 'NOAA TSUNAMI DATABASE' },
                                                    { label: 'ANALYSIS ENGINE', value: 'CLIMAI v2.0' },
                                                    { label: 'CONFIDENCE', value: 'HIGH' },
                                                ],
                                                callouts: [
                                                    { pos: 'top-left', label: 'WAVE AMPLITUDE', value: `H = ${topEvent.wave_height_m || '—'} m` },
                                                    { pos: 'top-right', label: 'TRIGGER MAGNITUDE', value: `Mw = ${topEvent.magnitude || '—'}` },
                                                    { pos: 'bottom-left', label: 'PROPAGATION', value: 'RADIAL — OCEAN BASIN' },
                                                    { pos: 'bottom-right', label: 'TOTAL EVENTS', value: `${tsunami.events?.length || 0} RECORDS` },
                                                ],
                                                vizType: 'tsunami',
                                                spectrumLabel: 'WAVE INTENSITY',
                                                events: tsunami.events || [],
                                            };
                                        }
                                        // Default: weather
                                        const w = weather || {};
                                        return {
                                            title: 'METEOROLOGICAL ANALYSIS',
                                            subtitle: 'CHENNAI WEATHER STATION',
                                            classification: 'WEATHER DATA',
                                            leftCells: [
                                                { label: 'STATION', value: 'CHENNAI, INDIA' },
                                                { label: 'COORDINATES', value: '13.0827°N, 80.2707°E' },
                                                { label: 'ELEVATION', value: '6 M ASL' },
                                            ],
                                            centerCells: [
                                                { label: 'TEMPERATURE', value: `${w.temperature || '—'}°C` },
                                                { label: 'HUMIDITY', value: `${w.humidity || '—'}%` },
                                                { label: 'WIND SPEED', value: `${w.wind_speed || '—'} KM/H` },
                                            ],
                                            rightCells: [
                                                { label: 'DATA SOURCE', value: 'OPEN-METEO API' },
                                                { label: 'PRESSURE', value: `${w.pressure || '—'} HPA` },
                                                { label: 'CLOUD COVER', value: `${w.cloud_cover || '—'}%` },
                                            ],
                                            callouts: [
                                                { pos: 'top-left', label: 'FEELS LIKE', value: `T = ${w.feels_like || '—'}°C` },
                                                { pos: 'top-right', label: 'PRESSURE', value: `P = ${w.pressure || '—'} hPa` },
                                                { pos: 'bottom-left', label: 'WIND DIR', value: `θ = ${w.wind_direction || '—'}°` },
                                                { pos: 'bottom-right', label: 'VISIBILITY', value: 'STANDARD' },
                                            ],
                                            vizType: 'weather',
                                            spectrumLabel: 'TEMPERATURE SCALE',
                                            events: [],
                                        };
                                    };

                                    const grid = buildGridData();

                                    return (
                                        <div className="tech-doc">
                                            {/* ── HEADER ── */}
                                            <div className="tech-header">
                                                <span className="tech-header-left">CLIMAI INTELLIGENCE</span>
                                                <span className="tech-header-right">SERIAL {Math.floor(Math.random() * 9000 + 1000)}-{primaryIntent.toUpperCase()}</span>
                                            </div>

                                            {/* ── TITLE BLOCK ── */}
                                            <div className="tech-title-block">
                                                <div className="tech-title-left">
                                                    <div className="tech-title-big">{grid.subtitle}</div>
                                                </div>
                                                <div className="tech-title-right">
                                                    <div>{grid.classification}</div>
                                                    <div>CLASSIFICATION: ANALYSIS REPORT</div>
                                                </div>
                                            </div>

                                            {/* ── 3-COLUMN DATA GRID ── */}
                                            <div className="tech-grid">
                                                <div className="tech-col">
                                                    {grid.leftCells.map((c, i) => (
                                                        <div key={i} className="tech-cell">
                                                            <div className="tech-cell-label">{c.label}</div>
                                                            <div className="tech-cell-value">{c.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="tech-col">
                                                    {grid.centerCells.map((c, i) => (
                                                        <div key={i} className="tech-cell">
                                                            <div className="tech-cell-label">{c.label}</div>
                                                            <div className="tech-cell-value">{c.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="tech-col">
                                                    {grid.rightCells.map((c, i) => (
                                                        <div key={i} className="tech-cell">
                                                            <div className="tech-cell-label">{c.label}</div>
                                                            <div className="tech-cell-value">{c.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* (Viewport removed for clean aerospace layout) */}

                                            {/* (Events list removed for strict tabular aerospace layout) */}

                                            {/* ── ANALYSIS TEXT ── */}
                                            <div className="tech-analysis">
                                                <div className="tech-analysis-title">ANALYSIS</div>
                                                <div className="tech-analysis-body">{result.analysis}</div>
                                            </div>

                                            {/* (Spectrum bar removed) */}

                                            {/* ── FOOTER ── */}
                                            <div className="tech-footer">
                                                <span>POWERED BY CLIMAI</span>
                                                <span>{timestamp} UTC</span>
                                            </div>

                                            {/* ── ERRORS ── */}
                                            {result.errors?.length > 0 && (
                                                <div className="tech-errors">
                                                    {result.errors.map((e, i) => (
                                                        <div key={i} className="tech-error-line">⚠ {e}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })}
                </div>

                {/* Input */}
                <div className="xai-input-area">
                    <form className="xai-input-wrapper" onSubmit={handleSubmit} onClick={() => document.getElementById('xai-main-input').focus()}>
                        <span className="xai-input-arrow">→</span>

                        <div className="xai-input-flex">
                            {selectedContexts.map(ctx => (
                                <div key={ctx} className="xai-context-pill">
                                    {ctx}
                                    <button
                                        type="button"
                                        className="xai-context-remove"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedContexts(prev => prev.filter(c => c !== ctx));
                                        }}
                                    >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                    </button>
                                </div>
                            ))}

                            <input
                                id="xai-main-input"
                                type="text"
                                className="xai-input"
                                placeholder={globalPhase === 'idle' && selectedContexts.length === 0 ? 'Ask ClimAI' : globalPhase !== 'working' && selectedContexts.length === 0 ? 'Ask a follow-up...' : ''}
                                value={query}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setQuery(val);

                                    const lastWord = val.split(' ').pop();
                                    if (lastWord.startsWith('@')) {
                                        setShowSuggestions(true);
                                        setSuggestionFilter(lastWord.slice(1).toLowerCase());
                                        setSuggestionIndex(0);
                                    } else {
                                        setShowSuggestions(false);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (!showSuggestions) {
                                        if (e.key === 'Backspace' && query === '' && selectedContexts.length > 0) {
                                            setSelectedContexts(prev => prev.slice(0, -1));
                                        }
                                        return;
                                    }

                                    const filteredOpts = SUGGESTION_OPTIONS.filter(o => o.id.includes(suggestionFilter) || o.label.toLowerCase().includes(suggestionFilter));

                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setSuggestionIndex(prev => (prev + 1) % filteredOpts.length);
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setSuggestionIndex(prev => (prev - 1 + filteredOpts.length) % filteredOpts.length);
                                    } else if (e.key === 'Enter' || e.key === 'Tab') {
                                        e.preventDefault();
                                        if (filteredOpts[suggestionIndex]) {
                                            setSelectedContexts(prev => [...prev, filteredOpts[suggestionIndex].id]);
                                            const newQuery = query.split(' ').slice(0, -1).join(' ') + ' ';
                                            setQuery(newQuery.trimStart());
                                            setShowSuggestions(false);
                                        }
                                    } else if (e.key === 'Escape') {
                                        setShowSuggestions(false);
                                    }
                                }}
                                disabled={isWorking}
                                autoFocus
                                autoComplete="off"
                            />
                        </div>

                        {showSuggestions && (
                            <div className="xai-suggestions-dropdown">
                                <div className="xai-suggestions-header">Suggestions</div>
                                {SUGGESTION_OPTIONS.filter(o => o.id.includes(suggestionFilter) || o.label.toLowerCase().includes(suggestionFilter)).map((opt, i) => (
                                    <div
                                        key={opt.id}
                                        className={`xai-suggestion-item ${i === suggestionIndex ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedContexts(prev => [...prev, opt.id]);
                                            const newQuery = query.split(' ').slice(0, -1).join(' ') + ' ';
                                            setQuery(newQuery.trimStart());
                                            setShowSuggestions(false);
                                            document.getElementById('xai-main-input').focus();
                                        }}
                                        onMouseEnter={() => setSuggestionIndex(i)}
                                    >
                                        <div className="xs-item-content">
                                            <div className="xs-icon">{SUGGESTION_ICONS[opt.id]}</div>
                                            <div className="xs-text">
                                                <div className="xs-label">{opt.label}</div>
                                                {opt.desc && <div className="xs-desc">{opt.desc}</div>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </form>
                    <div className="xai-disclaimer">ClimAI can make mistakes.</div>
                </div>
            </div>
        </div>
    );
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
