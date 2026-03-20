import { useMemo } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import './widgets/ModularDashboard.css';

/* ── Custom Tooltip ── */
function TsunamiTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="premium-tooltip">
            <div className="premium-tooltip-title">{payload[0]?.payload?.name || label}</div>
            {payload.map((p, i) => (
                <div key={i} className="premium-tooltip-row">
                    <span className="premium-tooltip-label">{p.name}</span>
                    <span className="premium-tooltip-value" style={{ color: p.color || '#2DE4FF' }}>
                        {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function TsunamiCharts({ data = [] }) {

    const { waveData, timelineData, fatalityData } = useMemo(() => {
        if (!data.length) return { waveData: [], timelineData: [], fatalityData: [] };

        const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

        const wave = sorted.slice(-15).map(t => ({
            name: t.name?.length > 14 ? t.name.slice(0, 12) + '…' : (t.name || 'Unknown'),
            'Wave Height (m)': t.wave_height_m || 0,
            magnitude: t.magnitude || 0,
            color: (t.magnitude || 0) > 8 ? '#EF4444' : (t.magnitude || 0) > 7 ? '#F97316' : '#2DE4FF',
        }));

        const timeline = sorted.map(t => ({
            name: t.name?.length > 14 ? t.name.slice(0, 12) + '…' : (t.name || 'Unknown'),
            year: new Date(t.date).getFullYear() || t.name,
            'Magnitude': t.magnitude || 0,
            'Wave (m)': t.wave_height_m || 0,
        }));

        const fatality = sorted
            .filter(t => (t.fatalities || 0) > 0)
            .slice(-12)
            .map(t => ({
                name: t.name?.length > 14 ? t.name.slice(0, 12) + '…' : (t.name || 'Unknown'),
                'Fatalities': t.fatalities || 0,
                magnitude: t.magnitude || 0,
                color: (t.fatalities || 0) > 10000 ? '#EF4444'
                    : (t.fatalities || 0) > 1000 ? '#F97316'
                    : (t.fatalities || 0) > 100 ? '#EAB308' : '#10B981',
            }));

        return { waveData: wave, timelineData: timeline, fatalityData: fatality };
    }, [data]);

    if (!data.length) return null;

    return (
        <div className="three-box-layout">
            {/* ── Box 1: Max Wave Height by Event ── */}
            <div className="chart-box">
                <div className="chart-box-header">
                    <span className="chart-box-title">MAX WAVE HEIGHT BY EVENT</span>
                    <div className="chart-box-legend">
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#EF4444' }} /> M8+</span>
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#F97316' }} /> M7-8</span>
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#2DE4FF' }} /> {'<M7'}</span>
                    </div>
                </div>
                <div className="chart-box-body">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={waveData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 8, fill: '#555', fontFamily: 'DM Mono' }}
                                axisLine={{ stroke: '#222' }}
                                tickLine={false}
                                angle={-40}
                                textAnchor="end"
                                height={50}
                            />
                            <YAxis
                                tick={{ fontSize: 9, fill: '#444', fontFamily: 'DM Mono' }}
                                axisLine={false}
                                tickLine={false}
                                unit=" m"
                            />
                            <Tooltip content={<TsunamiTooltip />} cursor={{ fill: 'rgba(45, 228, 255, 0.04)' }} />
                            <Bar dataKey="Wave Height (m)" radius={[4, 4, 0, 0]}>
                                {waveData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Box 2: Tsunami Magnitude Timeline ── */}
            <div className="chart-box">
                <div className="chart-box-header">
                    <span className="chart-box-title">TSUNAMI MAGNITUDE TIMELINE</span>
                    <div className="chart-box-legend">
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#2DE4FF' }} /> Magnitude</span>
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#A855F7' }} /> Wave Height</span>
                    </div>
                </div>
                <div className="chart-box-body">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="year"
                                tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }}
                                axisLine={{ stroke: '#222' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 9, fill: '#444', fontFamily: 'DM Mono' }}
                                axisLine={false}
                                tickLine={false}
                                domain={[0, 'auto']}
                            />
                            <Tooltip content={<TsunamiTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="Magnitude"
                                stroke="#2DE4FF"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#2DE4FF', stroke: '#0a0e14', strokeWidth: 1.5 }}
                                activeDot={{ r: 5, fill: '#fff', stroke: '#2DE4FF', strokeWidth: 2 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="Wave (m)"
                                stroke="#A855F7"
                                strokeWidth={1.5}
                                strokeDasharray="5 3"
                                dot={{ r: 2, fill: '#A855F7' }}
                                activeDot={{ r: 4, fill: '#fff', stroke: '#A855F7', strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Box 3: Fatalities by Event ── */}
            <div className="chart-box">
                <div className="chart-box-header">
                    <span className="chart-box-title">FATALITIES BY EVENT</span>
                    <div className="chart-box-legend">
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#EF4444' }} /> 10k+</span>
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#F97316' }} /> 1k-10k</span>
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#EAB308' }} /> 100-1k</span>
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#10B981' }} /> {'<100'}</span>
                    </div>
                </div>
                <div className="chart-box-body">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={fatalityData} margin={{ top: 8, right: 12, left: -5, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 8, fill: '#555', fontFamily: 'DM Mono' }}
                                axisLine={{ stroke: '#222' }}
                                tickLine={false}
                                angle={-40}
                                textAnchor="end"
                                height={50}
                            />
                            <YAxis
                                tick={{ fontSize: 9, fill: '#444', fontFamily: 'DM Mono' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<TsunamiTooltip />} cursor={{ fill: 'rgba(239, 68, 68, 0.04)' }} />
                            <Bar dataKey="Fatalities" radius={[4, 4, 0, 0]}>
                                {fatalityData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
