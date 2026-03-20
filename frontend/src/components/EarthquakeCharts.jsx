import { useMemo } from 'react';
import {
    ResponsiveContainer, LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
    XAxis, YAxis, Tooltip, CartesianGrid, Cell, ZAxis, ReferenceLine,
} from 'recharts';
import './widgets/ModularDashboard.css';

/* ── Custom Tooltip ── */
function QuakeTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="premium-tooltip">
            <div className="premium-tooltip-title">{payload[0]?.payload?.place || payload[0]?.payload?.name || label}</div>
            {payload.map((p, i) => (
                <div key={i} className="premium-tooltip-row">
                    <span className="premium-tooltip-label">{p.name}</span>
                    <span className="premium-tooltip-value" style={{ color: p.color || '#2DE4FF' }}>
                        {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function EarthquakeCharts({ data = [] }) {

    const { timelineData, regionData, scatterData } = useMemo(() => {
        if (!data.length) return { timelineData: [], regionData: [], scatterData: [] };

        const sorted = [...data].sort((a, b) => new Date(a.time) - new Date(b.time));

        const timeline = sorted.map((eq, i) => ({
            idx: i + 1,
            'Magnitude': eq.magnitude,
            place: eq.place || 'Unknown',
            depth: eq.depth || 0,
        }));

        // Group by region (last part of place string)
        const regionMap = {};
        data.forEach(eq => {
            const region = eq.place ? eq.place.split(',').pop().trim() : 'Unknown';
            if (!regionMap[region]) regionMap[region] = { count: 0, maxMag: 0 };
            regionMap[region].count++;
            regionMap[region].maxMag = Math.max(regionMap[region].maxMag, eq.magnitude);
        });
        const region = Object.entries(regionMap)
            .map(([name, v]) => ({
                name: name.length > 15 ? name.slice(0, 13) + '…' : name,
                'Events': v.count,
                'Peak Mag': parseFloat(v.maxMag.toFixed(1)),
                color: v.maxMag > 6 ? '#EF4444' : v.maxMag > 4 ? '#F97316' : '#2DE4FF',
            }))
            .sort((a, b) => b['Events'] - a['Events'])
            .slice(0, 10);

        const scatter = sorted.map(eq => ({
            depth: eq.depth || 0,
            'Magnitude': eq.magnitude,
            place: eq.place || 'Unknown',
            size: Math.pow(eq.magnitude, 2.5) * 2,
            color: eq.magnitude > 6 ? '#EF4444' : eq.magnitude > 4 ? '#F97316' : '#2DE4FF',
        }));

        return { timelineData: timeline, regionData: region, scatterData: scatter };
    }, [data]);

    if (!data.length) return null;

    return (
        <div className="three-box-layout">
            {/* ── Box 1: Magnitude Timeline ── */}
            <div className="chart-box">
                <div className="chart-box-header">
                    <span className="chart-box-title">MAGNITUDE TIMELINE</span>
                    <div className="chart-box-legend">
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#F97316' }} /> Magnitude</span>
                    </div>
                </div>
                <div className="chart-box-body">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="idx"
                                tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }}
                                axisLine={{ stroke: '#222' }}
                                tickLine={false}
                                label={{ value: 'Event #', position: 'insideBottom', offset: -2, style: { fontSize: 8, fill: '#444' } }}
                            />
                            <YAxis
                                tick={{ fontSize: 9, fill: '#444', fontFamily: 'DM Mono' }}
                                axisLine={false}
                                tickLine={false}
                                domain={[0, 10]}
                            />
                            <Tooltip content={<QuakeTooltip />} />
                            <ReferenceLine y={5} stroke="#F97316" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: 'M5.0', position: 'right', style: { fontSize: 8, fill: '#F97316' } }} />
                            <Line
                                type="monotone"
                                dataKey="Magnitude"
                                stroke="#F97316"
                                strokeWidth={2}
                                dot={{ r: 2.5, fill: '#F97316', stroke: '#0a0e14', strokeWidth: 1 }}
                                activeDot={{ r: 5, fill: '#fff', stroke: '#F97316', strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Box 2: Activity by Region ── */}
            <div className="chart-box">
                <div className="chart-box-header">
                    <span className="chart-box-title">ACTIVITY BY REGION</span>
                    <div className="chart-box-legend">
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#2DE4FF' }} /> Events</span>
                    </div>
                </div>
                <div className="chart-box-body">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={regionData} layout="vertical" margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                            <XAxis
                                type="number"
                                tick={{ fontSize: 9, fill: '#444', fontFamily: 'DM Mono' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                dataKey="name"
                                type="category"
                                tick={{ fontSize: 9, fill: '#666', fontFamily: 'DM Mono' }}
                                axisLine={false}
                                tickLine={false}
                                width={80}
                            />
                            <Tooltip content={<QuakeTooltip />} cursor={{ fill: 'rgba(45, 228, 255, 0.04)' }} />
                            <Bar dataKey="Events" radius={[0, 4, 4, 0]}>
                                {regionData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Box 3: Depth vs Magnitude Scatter ── */}
            <div className="chart-box">
                <div className="chart-box-header">
                    <span className="chart-box-title">DEPTH vs MAGNITUDE</span>
                    <div className="chart-box-legend">
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#EF4444' }} /> M6+</span>
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#F97316' }} /> M4-6</span>
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#2DE4FF' }} /> {'<M4'}</span>
                    </div>
                </div>
                <div className="chart-box-body">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="depth"
                                name="Depth (km)"
                                tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }}
                                axisLine={{ stroke: '#222' }}
                                tickLine={false}
                                unit=" km"
                            />
                            <YAxis
                                dataKey="Magnitude"
                                name="Magnitude"
                                tick={{ fontSize: 9, fill: '#444', fontFamily: 'DM Mono' }}
                                axisLine={false}
                                tickLine={false}
                                domain={[0, 10]}
                            />
                            <ZAxis dataKey="size" range={[20, 200]} />
                            <Tooltip content={<QuakeTooltip />} />
                            <Scatter data={scatterData}>
                                {scatterData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} fillOpacity={0.7} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
