import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api';
import './XaiPanel.css';

/* ─── Constants ─────────────────────────────────────── */
const MODEL_NAMES = {
    random_forest: 'Random Forest',
    xgboost: 'XGBoost',
    lstm: 'LSTM',
    lightgbm: 'LightGBM',
};
const MODEL_ORDER = ['random_forest', 'xgboost', 'lstm', 'lightgbm'];

const INTENT_COLORS = {
    weather: { bg: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: 'rgba(56,189,248,0.25)' },
    prediction: { bg: 'rgba(168,85,247,0.12)', color: '#a855f7', border: 'rgba(168,85,247,0.25)' },
    earthquake: { bg: 'rgba(251,146,60,0.12)', color: '#fb923c', border: 'rgba(251,146,60,0.25)' },
    cyclone: { bg: 'rgba(52,211,153,0.12)', color: '#34d399', border: 'rgba(52,211,153,0.25)' },
    tsunami: { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', border: 'rgba(99,102,241,0.25)' },
    disaster: { bg: 'rgba(248,113,113,0.12)', color: '#f87171', border: 'rgba(248,113,113,0.25)' },
    weather_history: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
    aqi: { bg: 'rgba(163,230,53,0.12)', color: '#a3e635', border: 'rgba(163,230,53,0.25)' },
    flood: { bg: 'rgba(14,165,233,0.12)', color: '#0ea5e9', border: 'rgba(14,165,233,0.25)' },
};

const QUICK_PROMPTS = [
    { label: 'Current weather', query: 'What is the current weather in Chennai?', icon: '🌤' },
    { label: 'Cyclone history', query: 'Show me recent cyclones in Bay of Bengal', icon: '🌀' },
    { label: 'Earthquake risk', query: 'What are recent earthquakes near Chennai?', icon: '📊' },
    { label: 'Flood risk today', query: 'What is the flood risk in Chennai today?', icon: '🌊' },
    { label: 'Air quality', query: 'What is the AQI in Chennai right now?', icon: '💨' },
    { label: 'ML forecast', query: 'Predict the temperature for next 7 days using all ML models', icon: '🤖' },
    { label: 'Disaster report', query: 'Give me a full disaster and weather report for Chennai', icon: '⚡' },
    { label: 'Tsunami history', query: 'Tell me about major tsunamis in the Indian Ocean', icon: '🔱' },
];

const SOURCES = {
    weather: 'Open-Meteo API',
    earthquake: 'USGS FDSNWS',
    cyclone: 'NOAA IBTrACS',
    tsunami: 'NOAA Tsunami DB',
    prediction: 'ClimAI ML Ensemble',
    disaster: 'Multi-source',
    aqi: 'Open-Meteo AQI',
    flood: 'ClimAI Flood Model',
};

/* ─── SVG Icons ──────────────────────────────────────── */
const Icons = {
    send: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>,
    close: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
    copy: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>,
    check: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>,
    clear: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M19 6l-1 14H6L5 6M9 6V4h6v2" /></svg>,
    weather: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg>,
    cyclone: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" /></svg>,
    earthquake: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>,
    tsunami: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.6 2 5.2 2 2.5 0 2.5-2 5.2-2 1.3 0 1.9.5 2.5 1" /><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.6 2 5.2 2 2.5 0 2.5-2 5.2-2 1.3 0 1.9.5 2.5 1" /></svg>,
    prediction: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>,
    disaster: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4M12 17h.01" /></svg>,
    bot: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4M8 15h.01M16 15h.01" /></svg>,
    expand: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>,
    collapse: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" /></svg>,
    at: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" /></svg>,
};

const IntentIcon = ({ intent }) => Icons[intent] || Icons.bot;

/* ─── Markdown-ish text renderer ─────────────────────── */
function AnalysisText({ text }) {
    if (!text) return null;
    const lines = text.split('\n');
    return (
        <div className="xai-analysis-content">
            {lines.map((line, i) => {
                if (!line.trim()) return <div key={i} className="xai-line-gap" />;
                // Bold **text**
                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                return (
                    <p key={i} className="xai-analysis-line">
                        {parts.map((p, j) =>
                            p.startsWith('**') && p.endsWith('**')
                                ? <strong key={j}>{p.slice(2, -2)}</strong>
                                : p
                        )}
                    </p>
                );
            })}
        </div>
    );
}

/* ─── Data Grid Card ─────────────────────────────────── */
function DataGrid({ weather, earthquake, cyclone, tsunami, intents }) {
    const primary = intents?.[0] || 'weather';
    if (primary === 'weather' && weather) {
        const w = weather;
        return (
            <div className="xai-data-grid">
                <div className="xai-data-grid-title">
                    <span className="xai-grid-icon">{Icons.weather}</span>
                    Current Conditions — Chennai
                </div>
                <div className="xai-grid-cells">
                    {[
                        { label: 'Temperature', value: `${w.temperature ?? '—'}°C`, accent: true },
                        { label: 'Feels Like', value: `${w.feels_like ?? '—'}°C` },
                        { label: 'Humidity', value: `${w.humidity ?? '—'}%` },
                        { label: 'Wind', value: `${w.wind_speed ?? '—'} km/h ${w.wind_direction ?? ''}` },
                        { label: 'Pressure', value: `${w.pressure ?? '—'} hPa` },
                        { label: 'Cloud Cover', value: `${w.cloud_cover ?? '—'}%` },
                    ].map((c, i) => (
                        <div key={i} className={`xai-grid-cell ${c.accent ? 'accent' : ''}`}>
                            <div className="xai-cell-label">{c.label}</div>
                            <div className="xai-cell-value">{c.value}</div>
                        </div>
                    ))}
                </div>
                <div className="xai-grid-source">Source: Open-Meteo API · {new Date().toLocaleTimeString()} IST</div>
            </div>
        );
    }
    if (primary === 'earthquake' && earthquake) {
        const s = earthquake.summary || {};
        return (
            <div className="xai-data-grid earthquake">
                <div className="xai-data-grid-title">
                    <span className="xai-grid-icon">{Icons.earthquake}</span>
                    Seismic Report — Last 30 Days
                </div>
                <div className="xai-grid-cells">
                    {[
                        { label: 'Total Events', value: s.total ?? '—', accent: true },
                        { label: 'Max Magnitude', value: `M${s.max_magnitude ?? '—'}` },
                        { label: 'Avg Depth', value: `${s.avg_depth ?? '—'} km` },
                        { label: 'M6+ Events', value: s.m6_plus ?? '—' },
                        { label: 'Tsunami Alerts', value: s.tsunami_alerts ?? '0' },
                        { label: 'Threshold', value: 'M4.5+' },
                    ].map((c, i) => (
                        <div key={i} className={`xai-grid-cell ${c.accent ? 'accent' : ''}`}>
                            <div className="xai-cell-label">{c.label}</div>
                            <div className="xai-cell-value">{c.value}</div>
                        </div>
                    ))}
                </div>
                <div className="xai-grid-source">Source: USGS FDSNWS · Radius 8000km from Chennai</div>
            </div>
        );
    }
    if ((primary === 'cyclone') && cyclone) {
        const top = cyclone.cyclones?.[0] || {};
        const s = cyclone.summary || {};
        return (
            <div className="xai-data-grid cyclone">
                <div className="xai-data-grid-title">
                    <span className="xai-grid-icon">{Icons.cyclone}</span>
                    Cyclone Intelligence — Bay of Bengal
                </div>
                <div className="xai-grid-cells">
                    {[
                        { label: 'Latest Cyclone', value: top.name ?? '—', accent: true },
                        { label: 'Year', value: top.year ?? '—' },
                        { label: 'Max Wind', value: `${top.max_wind_kmh ?? '—'} km/h` },
                        { label: 'Category', value: top.category ?? '—' },
                        { label: 'Total in DB', value: s.total ?? '—' },
                        { label: 'Avg Wind', value: `${s.avg_wind ?? '—'} km/h` },
                    ].map((c, i) => (
                        <div key={i} className={`xai-grid-cell ${c.accent ? 'accent' : ''}`}>
                            <div className="xai-cell-label">{c.label}</div>
                            <div className="xai-cell-value">{c.value}</div>
                        </div>
                    ))}
                </div>
                <div className="xai-grid-source">Source: NOAA IBTrACS · {s.period ?? 'Bay of Bengal'}</div>
            </div>
        );
    }
    if (primary === 'tsunami' && tsunami) {
        const top = tsunami.events?.[0] || {};
        const s = tsunami.summary || {};
        return (
            <div className="xai-data-grid tsunami">
                <div className="xai-data-grid-title">
                    <span className="xai-grid-icon">{Icons.tsunami}</span>
                    Tsunami Database — Indian Ocean
                </div>
                <div className="xai-grid-cells">
                    {[
                        { label: 'Notable Event', value: top.name ?? '—', accent: true },
                        { label: 'Date', value: top.date ?? '—' },
                        { label: 'Max Wave', value: `${top.wave_height_m ?? '—'}m` },
                        { label: 'Fatalities', value: top.fatalities?.toLocaleString() ?? '—' },
                        { label: 'Total Records', value: s.total ?? '—' },
                        { label: 'Period', value: s.period ?? '—' },
                    ].map((c, i) => (
                        <div key={i} className={`xai-grid-cell ${c.accent ? 'accent' : ''}`}>
                            <div className="xai-cell-label">{c.label}</div>
                            <div className="xai-cell-value">{c.value}</div>
                        </div>
                    ))}
                </div>
                <div className="xai-grid-source">Source: NOAA Tsunami DB · {s.total ?? 0} verified events</div>
            </div>
        );
    }
    return null;
}

/* ─── ML Model Status ────────────────────────────────── */
function ModelPanel({ models, modelsStatus }) {
    if (!models || Object.keys(models).length === 0) return null;
    return (
        <div className="xai-model-panel">
            <div className="xai-model-panel-header">
                <span className="xai-model-label">ML Ensemble</span>
                <span className="xai-model-count">{Object.keys(models).length} models</span>
            </div>
            <div className="xai-model-list">
                {MODEL_ORDER.filter(m => models[m]).map(m => {
                    const info = models[m];
                    const status = info?.status;
                    return (
                        <div key={m} className={`xai-model-item ${status}`}>
                            <span className={`xai-model-dot ${status}`} />
                            <span className="xai-model-name">{MODEL_NAMES[m]}</span>
                            {info?.time_ms && status === 'success' && (
                                <span className="xai-model-time">{info.time_ms}ms</span>
                            )}
                            {status === 'error' && (
                                <span className="xai-model-err">fallback</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ─── Pipeline Steps ─────────────────────────────────── */
function PipelineSteps({ steps, phase }) {
    if (!steps || steps.length === 0) return null;
    return (
        <div className="xai-pipeline">
            {steps.map((s, i) => (
                <div key={i} className={`xai-pipe-step ${s.status}`}>
                    <span className="xai-pipe-icon">
                        {s.status === 'done' ? '✓' : s.status === 'error' ? '✗' : '◎'}
                    </span>
                    <span className="xai-pipe-detail">{s.detail}</span>
                </div>
            ))}
            {phase === 'working' && (
                <div className="xai-pipe-step running">
                    <span className="xai-pipe-icon running">◎</span>
                    <span className="xai-pipe-detail">Processing with Groq LLaMA 3.3 70B...</span>
                </div>
            )}
        </div>
    );
}

/* ─── Typing animation ───────────────────────────────── */
function TypingIndicator() {
    return (
        <div className="xai-typing">
            <div className="xai-typing-bubble">
                <span className="xai-typing-dot" />
                <span className="xai-typing-dot" style={{ animationDelay: '0.15s' }} />
                <span className="xai-typing-dot" style={{ animationDelay: '0.3s' }} />
            </div>
            <span className="xai-typing-label">ClimAI is thinking</span>
        </div>
    );
}

/* ─── Copy button ────────────────────────────────────── */
function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text).catch(() => { });
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };
    return (
        <button className="xai-copy-btn" onClick={handleCopy} title="Copy response">
            {copied ? Icons.check : Icons.copy}
        </button>
    );
}

/* ─── MAIN COMPONENT ─────────────────────────────────── */
export default function XaiPanel({ open, onClose }) {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState([]);
    const [isWorking, setIsWorking] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [showQuick, setShowQuick] = useState(true);
    const [showAtMenu, setShowAtMenu] = useState(false);
    const [atFilter, setAtFilter] = useState('');
    const [atIndex, setAtIndex] = useState(0);
    const [selectedCtx, setSelectedCtx] = useState([]);
    const [charCount, setCharCount] = useState(0);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    /* auto-scroll */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isWorking]);

    /* focus input on open */
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [open]);

    /* hide quick prompts once first message sent */
    useEffect(() => {
        if (messages.length > 0) setShowQuick(false);
    }, [messages.length]);

    if (!open) return null;

    /* helpers */
    const updateMsg = (id, patch) =>
        setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));

    const AT_OPTIONS = [
        { id: 'weather', label: 'Weather', desc: 'Current + forecast' },
        { id: 'cyclone', label: 'Cyclone', desc: 'Bay of Bengal tracking' },
        { id: 'earthquake', label: 'Earthquake', desc: 'USGS seismic feed' },
        { id: 'tsunami', label: 'Tsunami', desc: 'Indian Ocean history' },
        { id: 'prediction', label: 'Prediction', desc: 'ML ensemble forecast' },
        { id: 'disaster', label: 'Disaster', desc: 'Full multi-hazard report' },
    ];

    const filteredAt = AT_OPTIONS.filter(o =>
        o.id.includes(atFilter.toLowerCase()) || o.label.toLowerCase().includes(atFilter.toLowerCase())
    );

    const selectAtOption = (opt) => {
        if (!selectedCtx.includes(opt.id)) setSelectedCtx(prev => [...prev, opt.id]);
        const words = query.split(' ');
        const cleaned = words.filter(w => !w.startsWith('@')).join(' ').trimStart();
        setQuery(cleaned);
        setShowAtMenu(false);
        inputRef.current?.focus();
    };

    const submit = async (queryText) => {
        const text = queryText || query;
        const ctxPrefix = selectedCtx.map(c => `@${c}`).join(' ');
        const fullPrompt = [ctxPrefix, text].filter(Boolean).join(' ').trim();
        if (!fullPrompt || isWorking) return;

        const id = Date.now();
        const newMsg = {
            id,
            query: fullPrompt,
            displayQuery: text,
            contexts: [...selectedCtx],
            phase: 'working',
            result: null,
            steps: [],
        };

        setMessages(prev => [...prev, newMsg]);
        setIsWorking(true);
        setQuery('');
        setCharCount(0);
        setShowAtMenu(false);

        try {
            const data = await api.askClimAI(fullPrompt);
            if (data.error) {
                updateMsg(id, { phase: 'error', result: { error: data.error } });
            } else {
                updateMsg(id, { phase: 'done', result: data, steps: data.steps || [] });
            }
        } catch (err) {
            updateMsg(id, { phase: 'error', result: { error: err.message || 'Network error' } });
        } finally {
            setIsWorking(false);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        setQuery(val);
        setCharCount(val.length);

        const lastWord = val.split(' ').pop();
        if (lastWord.startsWith('@')) {
            setShowAtMenu(true);
            setAtFilter(lastWord.slice(1));
            setAtIndex(0);
        } else {
            setShowAtMenu(false);
            setAtFilter('');
        }
    };

    const handleKeyDown = (e) => {
        if (showAtMenu) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setAtIndex(i => (i + 1) % filteredAt.length); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setAtIndex(i => (i - 1 + filteredAt.length) % filteredAt.length); }
            else if ((e.key === 'Enter' || e.key === 'Tab') && filteredAt[atIndex]) { e.preventDefault(); selectAtOption(filteredAt[atIndex]); }
            else if (e.key === 'Escape') setShowAtMenu(false);
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
        if (e.key === 'Backspace' && query === '' && selectedCtx.length > 0) {
            setSelectedCtx(prev => prev.slice(0, -1));
        }
    };

    const clearHistory = () => { setMessages([]); setShowQuick(true); };

    return (
        <div className="xai-overlay" onClick={onClose}>
            <div className={`xai-modal ${expanded ? 'expanded' : ''}`} onClick={e => e.stopPropagation()}>

                {/* ── HEADER ── */}
                <div className="xai-header">
                    <div className="xai-header-left">
                        <span className="xai-header-title">ClimAI</span>
                    </div>
                    <div className="xai-header-right">
                        {messages.length > 0 && (
                            <button className="xai-hbtn" onClick={clearHistory} title="Clear history">
                                {Icons.clear}
                            </button>
                        )}
                        <button className="xai-hbtn" onClick={() => setExpanded(v => !v)} title={expanded ? 'Collapse' : 'Expand'}>
                            {expanded ? Icons.collapse : Icons.expand}
                        </button>
                        <button className="xai-hbtn close" onClick={onClose} title="Close">
                            {Icons.close}
                        </button>
                    </div>
                </div>

                {/* ── DIVIDER ── */}
                <div className="xai-divider" />

                {/* ── MESSAGES AREA ── */}
                <div className="xai-messages">

                    {/* ── EMPTY STATE ── */}
                    {messages.length === 0 && (
                        <div className="xai-empty">
                            <div className="xai-empty-logo">
                                <div className="xai-logo-ring" />
                                <div className="xai-logo-text">ClimAI</div>
                            </div>
                            <p className="xai-empty-title">Hey, I'm ClimAI.</p>
                            <p className="xai-empty-sub">
                                Ask me about weather, cyclones, earthquakes, floods,<br />
                                or anything climate-related for Chennai & Bay of Bengal.
                            </p>
                            <div className="xai-empty-hint">
                                Type <kbd>@</kbd> to filter by data source
                            </div>
                        </div>
                    )}

                    {/* ── QUICK PROMPTS ── */}
                    {showQuick && messages.length === 0 && (
                        <div className="xai-quick-section">
                            <div className="xai-quick-label">Try asking</div>
                            <div className="xai-quick-grid">
                                {QUICK_PROMPTS.map((p, i) => (
                                    <button
                                        key={i}
                                        className="xai-quick-btn"
                                        onClick={() => submit(p.query)}
                                        disabled={isWorking}
                                    >
                                        <span className="xai-quick-icon">{p.icon}</span>
                                        <span className="xai-quick-text">{p.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── MESSAGE BLOCKS ── */}
                    {messages.map((msg) => {
                        const result = msg.result;
                        const phase = msg.phase;
                        const intents = result?.intents || [];
                        const weather = result?.data?.weather;
                        const earthquake = result?.data?.earthquake;
                        const cyclone = result?.data?.cyclone;
                        const tsunami = result?.data?.tsunami;
                        const models = result?.models;
                        const analysis = result?.analysis || '';

                        return (
                            <div key={msg.id} className="xai-msg-block">

                                {/* USER BUBBLE */}
                                <div className="xai-user-row">
                                    <div className="xai-user-bubble">
                                        {msg.contexts?.map(c => (
                                            <span key={c} className="xai-ctx-tag" style={INTENT_COLORS[c] ? {
                                                background: INTENT_COLORS[c].bg,
                                                color: INTENT_COLORS[c].color,
                                                borderColor: INTENT_COLORS[c].border,
                                            } : {}}>
                                                <span style={{ display: 'flex', alignItems: 'center' }}><IntentIcon intent={c} /></span>
                                                {c}
                                            </span>
                                        ))}
                                        {msg.displayQuery || msg.query}
                                    </div>
                                </div>

                                {/* INTENT TAGS */}
                                {intents.length > 0 && (
                                    <div className="xai-intent-row">
                                        {intents.slice(0, 5).map(i => {
                                            const col = INTENT_COLORS[i] || INTENT_COLORS.weather;
                                            return (
                                                <span key={i} className="xai-intent-chip" style={{
                                                    background: col.bg,
                                                    color: col.color,
                                                    borderColor: col.border,
                                                }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <IntentIcon intent={i} />
                                                        {i.replace('_', ' ')}
                                                    </span>
                                                </span>
                                            );
                                        })}
                                        {result?.target_date && (
                                            <span className="xai-intent-chip date">
                                                📅 {result.target_date}
                                            </span>
                                        )}
                                        {intents[0] && SOURCES[intents[0]] && (
                                            <span className="xai-source-chip">
                                                {SOURCES[intents[0]]}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* PIPELINE STEPS */}
                                <PipelineSteps steps={msg.steps} phase={phase} />

                                {/* WORKING STATE */}
                                {phase === 'working' && <TypingIndicator />}

                                {/* ERROR */}
                                {phase === 'error' && (
                                    <div className="xai-error-bubble">
                                        <span className="xai-err-icon">✗</span>
                                        <span>{result?.error || 'Something went wrong. Please try again.'}</span>
                                    </div>
                                )}

                                {/* DONE — RESPONSE */}
                                {phase === 'done' && result && (
                                    <div className="xai-response-block">

                                        {/* Data Grid Card */}
                                        <DataGrid
                                            weather={weather}
                                            earthquake={earthquake}
                                            cyclone={cyclone}
                                            tsunami={tsunami}
                                            intents={intents}
                                        />

                                        {/* ML Models */}
                                        <ModelPanel models={models} />

                                        {/* Analysis */}
                                        {analysis && (
                                            <div className="xai-analysis-block">
                                                <div className="xai-analysis-header">
                                                    <div className="xai-analysis-label">
                                                        <span className="xai-bot-icon">{Icons.bot}</span>
                                                        Analysis
                                                    </div>
                                                    <CopyButton text={analysis} />
                                                </div>
                                                <AnalysisText text={analysis} />
                                            </div>
                                        )}

                                        {/* Errors / warnings */}
                                        {result.errors?.length > 0 && (
                                            <div className="xai-warn-list">
                                                {result.errors.map((e, i) => (
                                                    <div key={i} className="xai-warn-item">⚠ {e}</div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Footer */}
                                        <div className="xai-response-footer">
                                            <span>Powered by ClimAI · Groq LLaMA 3.3 70B</span>
                                            <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* auto-scroll anchor */}
                    <div ref={messagesEndRef} />
                </div>

                {/* ── DIVIDER ── */}
                <div className="xai-divider" />

                {/* ── INPUT AREA ── */}
                <div className="xai-input-zone">

                    {/* Context chips row */}
                    {selectedCtx.length > 0 && (
                        <div className="xai-ctx-row">
                            {selectedCtx.map(c => {
                                const col = INTENT_COLORS[c] || {};
                                return (
                                    <div key={c} className="xai-ctx-chip" style={{
                                        background: col.bg,
                                        borderColor: col.border,
                                        color: col.color,
                                    }}>
                                        <span>{c}</span>
                                        <button
                                            className="xai-ctx-remove"
                                            onClick={() => setSelectedCtx(prev => prev.filter(x => x !== c))}
                                        >{Icons.close}</button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* @ mention dropdown */}
                    {showAtMenu && filteredAt.length > 0 && (
                        <div className="xai-at-menu">
                            <div className="xai-at-header">
                                <span>{Icons.at}</span> Data sources
                            </div>
                            {filteredAt.map((opt, i) => {
                                const col = INTENT_COLORS[opt.id] || {};
                                return (
                                    <div
                                        key={opt.id}
                                        className={`xai-at-item ${i === atIndex ? 'active' : ''}`}
                                        onClick={() => selectAtOption(opt)}
                                        onMouseEnter={() => setAtIndex(i)}
                                    >
                                        <span className="xai-at-icon" style={{ color: col.color }}>
                                            <IntentIcon intent={opt.id} />
                                        </span>
                                        <div className="xai-at-text">
                                            <span className="xai-at-label">{opt.label}</span>
                                            <span className="xai-at-desc">{opt.desc}</span>
                                        </div>
                                        {i === atIndex && <span className="xai-at-enter">↵</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Input box */}
                    <div className={`xai-input-box ${isWorking ? 'loading' : ''}`}>
                        <textarea
                            ref={inputRef}
                            className="xai-textarea"
                            placeholder={isWorking ? 'ClimAI is thinking...' : 'Ask anything about weather, disasters, or climate...'}
                            value={query}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            disabled={isWorking}
                            rows={1}
                            style={{ resize: 'none' }}
                            onInput={e => {
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                            }}
                        />
                        <div className="xai-input-actions">
                            <button
                                className="xai-at-btn"
                                onClick={() => { setQuery(q => q + '@'); inputRef.current?.focus(); }}
                                title="Mention a data source"
                            >
                                {Icons.at}
                            </button>
                            <button
                                className={`xai-send-btn ${query.trim() || selectedCtx.length ? 'active' : ''}`}
                                onClick={() => submit()}
                                disabled={isWorking || (!query.trim() && !selectedCtx.length)}
                                title="Send (Enter)"
                            >
                                {isWorking ? <span className="xai-send-spinner" /> : Icons.send}
                            </button>
                        </div>
                    </div>

                    <div className="xai-footer-row">
                        <span className="xai-disclaimer">ClimAI can make mistakes · Data from Open-Meteo, USGS, NOAA</span>
                        {charCount > 0 && <span className="xai-charcount">{charCount}/500</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }