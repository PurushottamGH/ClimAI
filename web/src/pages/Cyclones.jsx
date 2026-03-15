import { useState, useEffect } from 'react';
import { api } from '../api';
import {
    BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const TT = { backgroundColor: '#111', border: '1px solid #1e1e1e', borderRadius: '6px', color: '#e5e5e5', fontSize: '11px', padding: '6px 10px' };
const COLORS = ['#f97316', '#eab308', '#22c55e', '#a855f7', '#ec4899', '#06b6d4', '#3b82f6', '#ef4444'];

export default function Cyclones() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { api.getCyclones().then(setData).finally(() => setLoading(false)); }, []);
    if (loading) return <Loader />;

    const cyclones = data?.cyclones || [];
    const summary = data?.summary || {};

    const windData = cyclones.map(c => ({ name: c.name.replace('Cyclone ', ''), wind: c.max_wind_kmh })).reverse();
    const rainfallData = cyclones.map(c => ({ name: c.name.replace('Cyclone ', ''), rainfall: c.rainfall_mm })).reverse();

    return (
        <div className="space-y-3">
            <div>
                <h2 className="text-[15px] font-semibold gradient-text">Cyclone Intelligence</h2>
                <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>Bay of Bengal • Historical tracks • Chennai focus</p>
            </div>

            <div className="grid grid-cols-4 gap-2">
                {[
                    { icon: '🌪', label: 'Total', value: summary.total, color: '#3b82f6' },
                    { icon: '💨', label: 'Avg Wind', value: `${summary.avg_wind} km/h`, color: '#f97316' },
                    { icon: '💸', label: 'Damage', value: `₹${(summary.total_damage / 1000).toFixed(0)}K Cr`, color: '#eab308' },
                    { icon: '📅', label: 'Period', value: summary.period, color: '#22c55e' },
                ].map((k, i) => (
                    <div key={i} className="card flex flex-col justify-center h-[64px]">
                        <div className="text-[9px]" style={{ color: '#555' }}>{k.icon} {k.label}</div>
                        <div className="text-[16px] font-bold" style={{ color: k.color }}>{k.value}</div>
                    </div>
                ))}
            </div>

            {/* Track Map */}
            <div className="card" style={{ padding: '12px' }}>
                <div className="text-[12px] font-medium mb-0.5" style={{ color: '#e5e5e5' }}>Cyclone Tracks</div>
                <div className="text-[9px] mb-2" style={{ color: '#444' }}>BAY OF BENGAL</div>
                <div className="relative rounded-lg overflow-hidden" style={{ height: 320, background: '#080d16' }}>
                    <svg viewBox="75 -20 20 35" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                        <rect x="75" y="-20" width="20" height="35" fill="#080d16" />
                        {[76, 78, 80, 82, 84, 86, 88, 90, 92].map(x => <line key={`v${x}`} x1={x} y1="-20" x2={x} y2="15" stroke="#1a1a1a" strokeWidth="0.04" />)}
                        {[-18, -15, -12, -9, -6, -3, 0, 3, 6, 9, 12].map(y => <line key={`h${y}`} x1="75" y1={y} x2="95" y2={y} stroke="#1a1a1a" strokeWidth="0.04" />)}
                        <path d="M80,-13 L80.3,-15 L81,-16 L82,-16.5 L83,-16 L84.5,-15 L85,-13 L84,-10 L82.5,-8 L80.5,-8 L80,-10 L79.5,-12 Z"
                            fill="#151520" stroke="rgba(255,255,255,0.1)" strokeWidth="0.06" />
                        <circle cx="80.27" cy={-13.08} r="0.18" fill="#3b82f6" />
                        <text x="80.6" y={-12.8} fill="#3b82f6" fontSize="0.55" fontFamily="Inter">Chennai</text>
                        {cyclones.map((c, ci) => {
                            const track = c.track || [];
                            if (track.length < 2) return null;
                            const pathD = track.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.lon},${-p.lat}`).join(' ');
                            return (
                                <g key={ci}>
                                    <path d={pathD} fill="none" stroke={COLORS[ci % COLORS.length]} strokeWidth="0.1" opacity="0.5" strokeDasharray="0.3 0.2" />
                                    {track.map((p, pi) => <circle key={pi} cx={p.lon} cy={-p.lat} r="0.08" fill={COLORS[ci % COLORS.length]} opacity="0.9" />)}
                                    <text x={track[track.length - 1].lon} y={-track[track.length - 1].lat} fill={COLORS[ci % COLORS.length]} fontSize="0.4" textAnchor="middle" dominantBaseline="middle">✕</text>
                                </g>
                            );
                        })}
                    </svg>
                    <div className="absolute bottom-2 left-2 p-1.5 rounded" style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid #1e1e1e' }}>
                        <div className="flex flex-col gap-0.5">
                            {cyclones.map((c, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[8px]">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                    <span style={{ color: '#666' }}>{c.name.replace('Cyclone ', '')} ({c.year})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-2">
                <div className="card">
                    <div className="text-[12px] font-medium mb-2" style={{ color: '#e5e5e5' }}>Wind Intensity</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={windData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
                            <YAxis dataKey="name" type="category" stroke="#555" fontSize={9} tickLine={false} width={55} />
                            <XAxis type="number" stroke="#555" fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={TT} />
                            <Bar dataKey="wind" name="Wind (km/h)" radius={[0, 3, 3, 0]}>
                                {windData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card">
                    <div className="text-[12px] font-medium mb-2" style={{ color: '#e5e5e5' }}>Rainfall Impact</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={rainfallData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
                            <YAxis dataKey="name" type="category" stroke="#555" fontSize={9} tickLine={false} width={55} />
                            <XAxis type="number" stroke="#555" fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={TT} />
                            <Bar dataKey="rainfall" name="Rainfall (mm)" fill="#06b6d4" radius={[0, 3, 3, 0]} opacity={0.8} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: '12px 0' }}>
                <div className="text-[12px] font-medium mb-2 px-4" style={{ color: '#e5e5e5' }}>Cyclone History</div>
                <table className="w-full text-[11px]">
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                            {['Name', 'Year', 'Category', 'Wind', 'Rainfall'].map(h => (
                                <th key={h} className={`py-1.5 px-4 font-medium text-[9px] uppercase tracking-wider ${['Wind', 'Rainfall'].includes(h) ? 'text-right' : 'text-left'}`} style={{ color: '#555' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {cyclones.map((c, i) => (
                            <tr key={i} className="hover:bg-[#111] transition-colors" style={{ borderBottom: '1px solid #1e1e1e20' }}>
                                <td className="py-1.5 px-4 font-medium" style={{ color: '#e5e5e5' }}>{c.name}</td>
                                <td className="py-1.5 px-4" style={{ color: '#555' }}>{c.year}</td>
                                <td className="py-1.5 px-4" style={{ color: '#eab308' }}>{c.category}</td>
                                <td className="py-1.5 px-4 text-right font-medium" style={{ color: '#f97316' }}>{c.max_wind_kmh} km/h</td>
                                <td className="py-1.5 px-4 text-right" style={{ color: '#06b6d4' }}>{c.rainfall_mm} mm</td>
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
                <div className="w-5 h-5 border-2 border-[#1e1e1e] border-t-[#f97316] rounded-full animate-spin" />
                <span className="text-[10px]" style={{ color: '#555' }}>Loading cyclone data…</span>
            </div>
        </div>
    );
}
