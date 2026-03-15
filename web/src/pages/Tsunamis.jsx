import { useState, useEffect } from 'react';
import { api } from '../api';
import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const TT = { backgroundColor: '#111', border: '1px solid #1e1e1e', borderRadius: '6px', color: '#e5e5e5', fontSize: '11px', padding: '6px 10px' };

export default function Tsunamis() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { api.getTsunamis().then(setData).finally(() => setLoading(false)); }, []);
    if (loading) return <Loader />;

    const events = data?.events || [];
    const summary = data?.summary || {};

    const waveData = events.map(e => ({
        name: e.name.length > 16 ? e.name.slice(0, 14) + '…' : e.name, wave: e.wave_height_m,
    })).sort((a, b) => b.wave - a.wave);

    const fatalityData = events.filter(e => e.fatalities > 0).map(e => ({
        name: e.name.length > 16 ? e.name.slice(0, 14) + '…' : e.name, fatalities: e.fatalities,
    })).sort((a, b) => b.fatalities - a.fatalities);

    return (
        <div className="space-y-3">
            <div>
                <h2 className="text-[15px] font-semibold gradient-text">Tsunami History</h2>
                <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>Indian Ocean events • Chennai coast impact</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {[
                    { icon: '📊', label: 'Recorded', value: summary.total, color: '#3b82f6' },
                    { icon: '💀', label: 'Total Deaths', value: summary.total_fatalities?.toLocaleString(), color: '#ef4444' },
                    { icon: '🌊', label: 'Max Wave', value: `${summary.max_wave}m`, color: '#06b6d4' },
                ].map((k, i) => (
                    <div key={i} className="card flex flex-col justify-center h-[64px]">
                        <div className="text-[9px]" style={{ color: '#555' }}>{k.icon} {k.label}</div>
                        <div className="text-[18px] font-bold" style={{ color: k.color }}>{k.value}</div>
                    </div>
                ))}
            </div>

            {/* Alert */}
            <div className="rounded-md px-3 py-2 text-[11px]" style={{ background: '#1a0a0a', borderLeft: '3px solid #ef4444', color: '#e5e5e5' }}>
                🚨 <strong>2004 Indian Ocean Tsunami</strong> — Deadliest in recorded history. M9.1, 30m waves, 227K+ deaths.
            </div>

            {/* Map */}
            <div className="card" style={{ padding: '12px' }}>
                <div className="text-[12px] font-medium mb-0.5" style={{ color: '#e5e5e5' }}>Tsunami Origins</div>
                <div className="text-[9px] mb-2" style={{ color: '#444' }}>DOT SIZE = WAVE HEIGHT</div>
                <div className="relative rounded-lg overflow-hidden" style={{ height: 280, background: '#0d0d0d' }}>
                    <svg viewBox="40 -35 110 80" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                        <rect x="40" y="-35" width="110" height="80" fill="#0d0d0d" />
                        {Array.from({ length: 12 }, (_, i) => <line key={`v${i}`} x1={40 + i * 10} y1="-35" x2={40 + i * 10} y2="45" stroke="#1a1a1a" strokeWidth="0.1" />)}
                        {Array.from({ length: 9 }, (_, i) => <line key={`h${i}`} x1="40" y1={-35 + i * 10} x2="150" y2={-35 + i * 10} stroke="#1a1a1a" strokeWidth="0.1" />)}
                        <path d="M65,-5L75,-10L85,-5L80,10L75,15L70,10Z" fill="#151515" stroke="rgba(255,255,255,0.08)" strokeWidth="0.15" />
                        <path d="M95,-10L100,-15L110,-10L120,0L115,10L105,5Z" fill="#151515" stroke="rgba(255,255,255,0.08)" strokeWidth="0.15" />
                        {events.map((e, i) => {
                            const r = Math.max(0.8, e.wave_height_m * 0.15);
                            const color = e.fatalities > 10000 ? '#ef4444' : e.fatalities > 1000 ? '#eab308' : '#22c55e';
                            return (
                                <g key={i}>
                                    <circle cx={e.lon} cy={-e.lat} r={r * 4} fill={color} opacity={0.08} />
                                    <circle cx={e.lon} cy={-e.lat} r={r * 2} fill={color} opacity={0.15} />
                                    <circle cx={e.lon} cy={-e.lat} r={r} fill={color} opacity={0.7} />
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-2">
                <div className="card">
                    <div className="text-[12px] font-medium mb-2" style={{ color: '#e5e5e5' }}>Wave Heights</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={waveData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
                            <YAxis dataKey="name" type="category" stroke="#555" fontSize={8} tickLine={false} width={75} />
                            <XAxis type="number" stroke="#555" fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={TT} />
                            <Bar dataKey="wave" name="Wave (m)" fill="#06b6d4" radius={[0, 3, 3, 0]} opacity={0.8} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card">
                    <div className="text-[12px] font-medium mb-2" style={{ color: '#e5e5e5' }}>Fatalities</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={fatalityData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
                            <YAxis dataKey="name" type="category" stroke="#555" fontSize={8} tickLine={false} width={75} />
                            <XAxis type="number" stroke="#555" fontSize={10} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                            <Tooltip contentStyle={TT} formatter={(v) => v.toLocaleString()} />
                            <Bar dataKey="fatalities" name="Deaths" radius={[0, 3, 3, 0]}>
                                {fatalityData.map((d, i) => (
                                    <Cell key={i} fill={d.fatalities > 10000 ? '#ef4444' : d.fatalities > 1000 ? '#eab308' : '#22c55e'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: '12px 0' }}>
                <div className="text-[12px] font-medium mb-2 px-4" style={{ color: '#e5e5e5' }}>Event Records</div>
                <table className="w-full text-[11px]">
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                            {['Event', 'Year', 'Mag', 'Wave', 'Deaths'].map(h => (
                                <th key={h} className={`py-1.5 px-4 font-medium text-[9px] uppercase tracking-wider ${['Mag', 'Wave', 'Deaths'].includes(h) ? 'text-right' : 'text-left'}`} style={{ color: '#555' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {events.map((e, i) => (
                            <tr key={i} className="hover:bg-[#111] transition-colors" style={{ borderBottom: '1px solid #1e1e1e20' }}>
                                <td className="py-1.5 px-4 font-medium" style={{ color: '#e5e5e5' }}>{e.name}</td>
                                <td className="py-1.5 px-4" style={{ color: '#555' }}>{new Date(e.date).getFullYear()}</td>
                                <td className="py-1.5 px-4 text-right font-medium" style={{ color: '#f97316' }}>{e.magnitude || 'Vol.'}</td>
                                <td className="py-1.5 px-4 text-right font-medium" style={{ color: '#06b6d4' }}>{e.wave_height_m}m</td>
                                <td className="py-1.5 px-4 text-right font-medium" style={{ color: e.fatalities > 10000 ? '#ef4444' : e.fatalities > 1000 ? '#eab308' : '#22c55e' }}>
                                    {e.fatalities.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Loader() {
    return (
        <div className="flex items-center justify-center h-[300px]">
            <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#1e1e1e] border-t-[#06b6d4] rounded-full animate-spin" />
                <span className="text-[10px]" style={{ color: '#555' }}>Loading tsunami data…</span>
            </div>
        </div>
    );
}
