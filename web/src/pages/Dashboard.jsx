import { useState, useEffect } from 'react';
import { api } from '../api';
import {
    AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const TT = { backgroundColor: '#111', border: '1px solid #1e1e1e', borderRadius: '6px', color: '#e5e5e5', fontSize: '11px', padding: '6px 10px' };

export default function Dashboard() {
    const [weather, setWeather] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [earthquakes, setEarthquakes] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedModel, setSelectedModel] = useState('random_forest');
    const [dateRange, setDateRange] = useState([0, 100]);

    useEffect(() => {
        Promise.all([api.getWeather(), api.getForecast(), api.getEarthquakes()])
            .then(([w, f, e]) => { setWeather(w); setForecast(f); setEarthquakes(e); })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        api.getPredict(selectedModel).then(setPrediction).catch(() => { });
    }, [selectedModel]);

    if (loading) return <Loader />;

    const daily = forecast?.daily || [];
    const events = earthquakes?.events || [];
    const predictions = prediction?.predictions || [];

    // Scatter data for earthquake map
    const scatterData = events.map(e => ({
        x: e.longitude,
        y: e.latitude,
        mag: e.magnitude,
        place: e.place,
    }));

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
                <button className="btn text-[11px]">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                    </svg>
                    Add filters
                </button>
                <button className="btn text-[11px]">
                    Perspectives 🏷
                </button>
                <span style={{ color: '#333' }}>|</span>
                <button className="btn text-[11px]">
                    ▶ drafts / graph
                </button>
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: '#555' }}>Threshold</span>
                    <span className="text-[10px]" style={{ color: '#555' }}>Fix Frame</span>
                </div>
            </div>

            {/* Main Graph Area */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Graph Header */}
                <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #1e1e1e' }}>
                    <div className="flex gap-3">
                        <button className="text-[11px] px-3 py-1 rounded" style={{ background: '#1a1a1a', color: '#e5e5e5' }}>Layers</button>
                        <button className="text-[11px] px-3 py-1 rounded" style={{ color: '#555' }}>Perspectives</button>
                    </div>
                    <div className="flex gap-1.5">
                        {['🌡', '🌍', '🌊', '🌪', '🤖'].map((icon, i) => (
                            <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[12px]"
                                style={{
                                    background: ['#3b82f620', '#22c55e20', '#06b6d420', '#f9731620', '#a855f720'][i],
                                    border: `1px solid ${['#3b82f640', '#22c55e40', '#06b6d440', '#f9731640', '#a855f740'][i]}`,
                                }}>
                                {icon}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scatter/Network Graph */}
                <div className="relative" style={{ height: 380, background: '#0d0d0d' }}>
                    {/* Legend */}
                    <div className="absolute top-3 right-3 z-10 rounded-md p-2" style={{ background: 'rgba(0,0,0,0.8)', border: '1px solid #1e1e1e' }}>
                        <div className="flex flex-col gap-1 text-[9px]" style={{ color: '#888' }}>
                            {[
                                { label: 'Individuals', color: '#3b82f6', count: 54 },
                                { label: 'Markets', color: '#eab308', count: 32 },
                                { label: 'Papers', color: '#22c55e', count: 28 },
                                { label: 'Projects', color: '#f97316', count: 15 },
                                { label: 'Weather', color: '#06b6d4', count: 10 },
                            ].map(item => (
                                <div key={item.label} className="flex items-center gap-1.5">
                                    <span className="status-dot" style={{ background: item.color }} />
                                    <span>{item.label}</span>
                                    <span style={{ color: '#444' }}>{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                            <XAxis dataKey="x" type="number" stroke="#333" fontSize={9} tickLine={false} domain={[-180, 180]} hide />
                            <YAxis dataKey="y" type="number" stroke="#333" fontSize={9} tickLine={false} domain={[-90, 90]} hide />
                            <Tooltip contentStyle={TT} formatter={(v, name) => [v, name === 'mag' ? 'Magnitude' : name]} />
                            <Scatter data={scatterData} fill="#3b82f6">
                                {scatterData.map((entry, i) => {
                                    const color = entry.mag >= 6.5 ? '#ef4444' : entry.mag >= 5.5 ? '#eab308' : '#22c55e';
                                    return <Cell key={i} fill={color} fillOpacity={0.6} r={Math.max(3, (entry.mag - 3) * 2)} />;
                                })}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>

                    {/* Coordinates overlay */}
                    <div className="absolute bottom-2 left-3 text-[9px]" style={{ color: '#444' }}>
                        22.131°N, -14.328°SE
                    </div>
                    <div className="absolute bottom-2 right-3 text-[9px]" style={{ color: '#444' }}>
                        {new Date().toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                </div>

                {/* Timeline Slider */}
                <div className="px-4 py-3" style={{ borderTop: '1px solid #1e1e1e', background: '#0d0d0d' }}>
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height={50}>
                                <AreaChart data={daily}>
                                    <Area type="monotone" dataKey="temp_max" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={1} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="flex justify-between text-[9px] mt-1" style={{ color: '#555' }}>
                        {daily.map((d, i) => (
                            <span key={i}>{d.day}</span>
                        ))}
                    </div>
                </div>

                {/* Stats bar */}
                <div className="flex items-center gap-6 px-4 py-2" style={{ borderTop: '1px solid #1e1e1e', background: '#0d0d0d' }}>
                    {[
                        { label: 'Market Cap', value: weather?.temperature ? `${weather.temperature}°C` : '--', change: '+2%' },
                        { label: 'Papers', value: earthquakes?.summary?.total || 0, change: `+${earthquakes?.summary?.m6_plus || 0}` },
                        { label: 'Persons', value: '211', change: '0%' },
                    ].map((stat, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-[10px]" style={{ color: '#555' }}>{stat.label}</span>
                            <span className="text-[11px] font-medium" style={{ color: '#e5e5e5' }}>{stat.value}</span>
                            <span className="text-[10px]" style={{ color: stat.change.startsWith('+') ? '#22c55e' : '#ef4444' }}>
                                {stat.change}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Results Section */}
            <div className="card" style={{ padding: 0 }}>
                {/* Tabs */}
                <div className="flex items-center gap-4 px-4 py-2" style={{ borderBottom: '1px solid #1e1e1e' }}>
                    {[
                        { label: 'Results', count: events.length },
                        { label: '100ms', active: false },
                    ].map((tab, i) => (
                        <span key={i} className="text-[11px]" style={{ color: i === 0 ? '#e5e5e5' : '#555' }}>
                            {tab.label} {tab.count && <span style={{ color: '#3b82f6' }}>{tab.count}</span>}
                        </span>
                    ))}
                    <div className="ml-auto flex items-center gap-2">
                        {['Problems', 'History'].map(t => (
                            <span key={t} className="text-[10px]" style={{ color: '#444' }}>{t}</span>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                        <thead>
                            <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                                <th className="text-left py-2 px-4 font-medium text-[10px] uppercase tracking-wider" style={{ color: '#555' }}>Date</th>
                                <th className="text-left py-2 px-4 font-medium text-[10px] uppercase tracking-wider" style={{ color: '#555' }}>Source</th>
                                <th className="text-left py-2 px-4 font-medium text-[10px] uppercase tracking-wider" style={{ color: '#555' }}>Type</th>
                                <th className="text-left py-2 px-4 font-medium text-[10px] uppercase tracking-wider" style={{ color: '#555' }}>Tags</th>
                                <th className="text-right py-2 px-4 font-medium text-[10px] uppercase tracking-wider" style={{ color: '#555' }}>Value</th>
                                <th className="text-right py-2 px-4 font-medium text-[10px] uppercase tracking-wider" style={{ color: '#555' }}>Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.slice(0, 10).map((e, i) => (
                                <tr key={i} className="hover:bg-[#111] transition-colors" style={{ borderBottom: '1px solid #1e1e1e30' }}>
                                    <td className="py-2 px-4" style={{ color: '#999' }}>
                                        {e.time ? new Date(e.time).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '--'}
                                    </td>
                                    <td className="py-2 px-4 font-medium" style={{ color: '#e5e5e5' }}>
                                        {e.place?.split(',')[0] || 'Unknown'}
                                    </td>
                                    <td className="py-2 px-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className="tag">Quake</span>
                                            <span className="tag">M{e.magnitude?.toFixed(1)}</span>
                                        </div>
                                    </td>
                                    <td className="py-2 px-4">
                                        <div className="flex items-center gap-1">
                                            <span className="tag" style={{ borderColor: '#3b82f640', color: '#3b82f6' }}>USGS</span>
                                        </div>
                                    </td>
                                    <td className="py-2 px-4 text-right font-mono font-medium" style={{
                                        color: e.magnitude >= 6 ? '#ef4444' : e.magnitude >= 5 ? '#eab308' : '#22c55e'
                                    }}>
                                        {e.magnitude?.toFixed(1)}M
                                    </td>
                                    <td className="py-2 px-4 text-right" style={{ color: '#555' }}>
                                        {e.significance || 0} pts
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ML Predictions */}
            <div className="card">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <div className="text-[13px] font-medium" style={{ color: '#e5e5e5' }}>🤖 ML Temperature Predictions</div>
                        <div className="text-[10px]" style={{ color: '#555' }}>Model: {selectedModel.replace('_', ' ')}</div>
                    </div>
                    <div className="flex gap-1.5">
                        {['random_forest', 'xgboost', 'lstm'].map(m => (
                            <button
                                key={m}
                                className="btn text-[10px] py-1 px-2"
                                style={selectedModel === m ? { background: '#3b82f620', borderColor: '#3b82f6', color: '#3b82f6' } : {}}
                                onClick={() => setSelectedModel(m)}
                            >
                                {m === 'random_forest' ? '🌳 RF' : m === 'xgboost' ? '⚡ XGB' : '🧠 LSTM'}
                            </button>
                        ))}
                    </div>
                </div>
                {predictions.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={predictions}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                            <XAxis dataKey="day" stroke="#555" fontSize={10} tickLine={false} />
                            <YAxis stroke="#555" fontSize={10} tickLine={false} unit="°" />
                            <Tooltip contentStyle={TT} />
                            <Area type="monotone" dataKey="predicted_max" name="Max" stroke="#f97316" fill="#f97316" fillOpacity={0.1} strokeWidth={2} />
                            <Area type="monotone" dataKey="predicted_min" name="Min" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.07} strokeWidth={1.5} />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[180px] flex items-center justify-center text-[11px]" style={{ color: '#555' }}>
                        Loading predictions...
                    </div>
                )}
            </div>
        </div>
    );
}

function Loader() {
    return (
        <div className="flex items-center justify-center h-[400px]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-[#1e1e1e] border-t-[#3b82f6] rounded-full animate-spin" />
                <span className="text-[11px]" style={{ color: '#555' }}>Loading climate data…</span>
            </div>
        </div>
    );
}
