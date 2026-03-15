import { useState, useEffect } from 'react';
import { api } from '../api';
import {
    BarChart, Bar, ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const TT = { backgroundColor: '#111', border: '1px solid #1e1e1e', borderRadius: '6px', color: '#e5e5e5', fontSize: '11px', padding: '6px 10px' };

export default function Earthquakes() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { api.getEarthquakes().then(setData).finally(() => setLoading(false)); }, []);
    if (loading) return <Loader />;

    const events = data?.events || [];
    const summary = data?.summary || {};

    const magBins = [
        { range: '4.0-4.9', count: events.filter(e => e.magnitude >= 4 && e.magnitude < 5).length, color: '#22c55e' },
        { range: '5.0-5.9', count: events.filter(e => e.magnitude >= 5 && e.magnitude < 6).length, color: '#eab308' },
        { range: '6.0-6.9', count: events.filter(e => e.magnitude >= 6 && e.magnitude < 7).length, color: '#f97316' },
        { range: '7.0+', count: events.filter(e => e.magnitude >= 7).length, color: '#ef4444' },
    ];

    return (
        <div className="space-y-3">
            <div>
                <h2 className="text-[15px] font-semibold gradient-text">Earthquake Monitor</h2>
                <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>Real-time USGS data • Global M4.5+</p>
            </div>

            <div className="grid grid-cols-5 gap-2">
                {[
                    { icon: '📊', label: 'Total', value: summary.total, color: '#3b82f6' },
                    { icon: '⚡', label: 'Strongest', value: `${summary.max_magnitude}M`, color: '#ef4444' },
                    { icon: '🌊', label: 'Tsunami', value: summary.tsunami_alerts, color: '#eab308' },
                    { icon: '📏', label: 'Avg Depth', value: `${summary.avg_depth}km`, color: '#22c55e' },
                    { icon: '🔴', label: 'M6+', value: summary.m6_plus, color: '#a855f7' },
                ].map((k, i) => (
                    <div key={i} className="card flex flex-col justify-center h-[64px]">
                        <div className="text-[9px]" style={{ color: '#555' }}>{k.icon} {k.label}</div>
                        <div className="text-[18px] font-bold" style={{ color: k.color }}>{k.value}</div>
                    </div>
                ))}
            </div>

            {/* SVG Map */}
            <div className="card" style={{ padding: '12px' }}>
                <div className="text-[12px] font-medium mb-0.5" style={{ color: '#e5e5e5' }}>Seismic Activity Map</div>
                <div className="text-[9px] mb-2" style={{ color: '#444' }}>DOT SIZE = INTENSITY</div>
                <div className="relative rounded-lg overflow-hidden" style={{ height: 320, background: '#0d0d0d' }}>
                    <svg viewBox="-180 -90 360 180" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                        <rect x="-180" y="-90" width="360" height="180" fill="#0d0d0d" />
                        {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(x => <line key={`v${x}`} x1={x} y1="-90" x2={x} y2="90" stroke="#1a1a1a" strokeWidth="0.3" />)}
                        {[-60, -30, 0, 30, 60].map(y => <line key={`h${y}`} x1="-180" y1={y} x2="180" y2={y} stroke="#1a1a1a" strokeWidth="0.3" />)}
                        <path d="M-160,-10L-130,-60L-120,-70L-100,-55L-80,-40L-60,-30L-80,-10L-100,0L-120,5L-140,0Z" fill="#151515" stroke="#222" strokeWidth="0.3" />
                        <path d="M-80,-10L-60,-5L-40,10L-35,30L-40,45L-55,55L-70,50L-75,35L-80,15Z" fill="#151515" stroke="#222" strokeWidth="0.3" />
                        <path d="M-10,-35L0,-45L10,-50L20,-55L30,-50L40,-45L30,-35L20,-30L10,-30L0,-35Z" fill="#151515" stroke="#222" strokeWidth="0.3" />
                        <path d="M-10,-30L0,-25L10,-20L20,-15L25,0L30,15L25,30L15,35L5,30L0,20L-5,10L-10,0L-15,-15Z" fill="#151515" stroke="#222" strokeWidth="0.3" />
                        <path d="M30,-50L60,-55L80,-50L100,-40L120,-30L140,-20L150,-30L140,-45L120,-50L100,-55L80,-60L60,-60L40,-55Z" fill="#151515" stroke="#222" strokeWidth="0.3" />
                        <path d="M65,-5L75,-10L85,-5L80,10L75,15L70,10Z" fill="#1a1a1a" stroke="#222" strokeWidth="0.3" />
                        <path d="M110,15L130,15L140,25L135,35L120,35L110,30L115,20Z" fill="#151515" stroke="#222" strokeWidth="0.3" />
                        <circle cx={80.27} cy={-13.08} r="2" fill="#3b82f6" opacity="0.9" />
                        <text x="82" y={-12} fill="#3b82f6" fontSize="3" fontFamily="Inter">Chennai</text>
                        {events.map((eq, i) => {
                            const r = Math.max(1, (eq.magnitude - 3.5) * 1.2);
                            const color = eq.magnitude >= 6.5 ? '#ef4444' : eq.magnitude >= 5.5 ? '#eab308' : '#22c55e';
                            return (
                                <g key={i}>
                                    <circle cx={eq.longitude} cy={-eq.latitude} r={r * 2.5} fill={color} opacity={0.1} />
                                    <circle cx={eq.longitude} cy={-eq.latitude} r={r} fill={color} opacity={0.7} />
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-2">
                <div className="card">
                    <div className="text-[12px] font-medium mb-2" style={{ color: '#e5e5e5' }}>Magnitude Distribution</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={magBins} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
                            <YAxis dataKey="range" type="category" stroke="#555" fontSize={10} tickLine={false} width={55} />
                            <XAxis type="number" stroke="#555" fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={TT} />
                            <Bar dataKey="count" name="Events" radius={[0, 3, 3, 0]}>
                                {magBins.map((b, i) => <Cell key={i} fill={b.color} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="card">
                    <div className="text-[12px] font-medium mb-2" style={{ color: '#e5e5e5' }}>Depth vs Magnitude</div>
                    <ResponsiveContainer width="100%" height={180}>
                        <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                            <XAxis dataKey="magnitude" stroke="#555" fontSize={10} tickLine={false} />
                            <YAxis dataKey="depth_km" stroke="#555" fontSize={10} tickLine={false} reversed />
                            <Tooltip contentStyle={TT} />
                            <Scatter data={events.slice(0, 50)} fill="#a855f7" fillOpacity={0.5} />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: '12px 0' }}>
                <div className="text-[12px] font-medium mb-2 px-4" style={{ color: '#e5e5e5' }}>Recent Events</div>
                <table className="w-full text-[11px]">
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                            {['Date', 'Mag', 'Location', 'Depth'].map(h => (
                                <th key={h} className={`py-1.5 px-4 font-medium text-[9px] uppercase tracking-wider ${['Mag', 'Depth'].includes(h) ? 'text-right' : 'text-left'}`} style={{ color: '#555' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {events.slice(0, 12).map((e, i) => (
                            <tr key={i} className="hover:bg-[#111] transition-colors" style={{ borderBottom: '1px solid #1e1e1e20' }}>
                                <td className="py-1.5 px-4" style={{ color: '#999' }}>
                                    {e.time ? new Date(e.time).toLocaleDateString('en', { day: '2-digit', month: 'short' }) : '--'}
                                </td>
                                <td className="py-1.5 px-4 text-right font-mono font-medium" style={{ color: e.magnitude >= 6 ? '#ef4444' : e.magnitude >= 5 ? '#eab308' : '#22c55e' }}>
                                    {e.magnitude?.toFixed(1)}
                                </td>
                                <td className="py-1.5 px-4 truncate max-w-[200px]" style={{ color: '#e5e5e5' }}>{e.place}</td>
                                <td className="py-1.5 px-4 text-right" style={{ color: '#555' }}>{e.depth_km?.toFixed(0)} km</td>
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
                <div className="w-5 h-5 border-2 border-[#1e1e1e] border-t-[#22c55e] rounded-full animate-spin" />
                <span className="text-[10px]" style={{ color: '#555' }}>Loading seismic data…</span>
            </div>
        </div>
    );
}
