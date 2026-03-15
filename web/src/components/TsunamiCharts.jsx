import { useMemo } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';
import '../components/EarthquakeCharts.css';

// ── Plasma/viridis color by magnitude (matches map markers) ──
function getMagColor(mag) {
    if (mag <= 0) return '#888888';
    if (mag >= 9.0) return '#fcffa4';
    if (mag >= 8.8) return '#f0f921';
    if (mag >= 8.6) return '#a0da39';
    if (mag >= 8.4) return '#4ac16d';
    if (mag >= 8.2) return '#1fa187';
    if (mag >= 8.0) return '#277f8e';
    if (mag >= 7.8) return '#365c8d';
    return '#440154';
}

// ── Dark tooltip ──
function DarkTooltip({ active, payload, type }) {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;

    if (type === 'wave') {
        return (
            <div className="eq-tooltip">
                <div className="eq-tooltip-label">{d.name}</div>
                <div className="eq-tooltip-value">Wave Height={d.wave_height_m} m</div>
                <div style={{ color: '#9ca3af', fontSize: 11 }}>Magnitude: {d.magnitude || 'N/A'} • {d.year}</div>
            </div>
        );
    }
    if (type === 'timeline') {
        return (
            <div className="eq-tooltip">
                <div className="eq-tooltip-label">{d.name}</div>
                <div className="eq-tooltip-value">Magnitude={d.magnitude}</div>
                <div style={{ color: '#9ca3af', fontSize: 11 }}>{d.date}</div>
            </div>
        );
    }
    if (type === 'fatalities') {
        return (
            <div className="eq-tooltip">
                <div className="eq-tooltip-label">{d.name}</div>
                <div className="eq-tooltip-value">Fatalities={d.fatalities.toLocaleString()}</div>
                <div style={{ color: '#9ca3af', fontSize: 11 }}>Magnitude: {d.magnitude || 'N/A'} • {d.year}</div>
            </div>
        );
    }
    return null;
}

// ── Magnitude color legend ──
function MagLegend() {
    const items = [
        { label: '9+', color: '#fcffa4' },
        { label: '8.8', color: '#f0f921' },
        { label: '8.6', color: '#a0da39' },
        { label: '8.4', color: '#4ac16d' },
        { label: '8.0', color: '#277f8e' },
        { label: '7.8', color: '#365c8d' },
    ];
    return (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 2 }}>
            <span style={{ color: '#6b7280', fontSize: 10 }}>magnitude</span>
            {items.map(it => (
                <span key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: it.color, display: 'inline-block' }} />
                    <span style={{ color: it.color, fontSize: 9 }}>{it.label}</span>
                </span>
            ))}
        </div>
    );
}

// ── Custom dot renderer for line chart (colored by magnitude) ──
function MagDot(props) {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    return (
        <circle cx={cx} cy={cy} r={4} fill={getMagColor(payload.magnitude)} stroke="#fff" strokeWidth={1} />
    );
}

export default function TsunamiCharts({ data = [] }) {

    const chartData = useMemo(() => {
        if (!data.length) return [];
        return [...data]
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map(t => ({
                name: t.name,
                shortName: t.name.length > 18 ? t.name.slice(0, 16) + '…' : t.name,
                wave_height_m: t.wave_height_m,
                magnitude: t.magnitude || 0,
                magColor: getMagColor(t.magnitude || 0),
                fatalities: t.fatalities,
                origin: t.origin,
                date: t.date,
                year: new Date(t.date).getFullYear(),
            }));
    }, [data]);

    const timelineData = useMemo(() => chartData.filter(d => d.magnitude > 0), [chartData]);

    if (!chartData.length) return null;

    return (
        <div className="eq-charts-row">
            {/* Chart 1: Max wave height by event */}
            <div className="eq-chart-card">
                <div className="eq-chart-title">Max wave height by event</div>
                <MagLegend />
                <ResponsiveContainer width="100%" height="78%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" vertical={false} />
                        <XAxis
                            dataKey="shortName"
                            tick={{ fill: '#5a6270', fontSize: 8 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                            angle={-30}
                            textAnchor="end"
                            height={50}
                            label={{ value: 'Event', position: 'insideBottom', fill: '#5a6270', fontSize: 10, dy: 15 }}
                        />
                        <YAxis
                            tick={{ fill: '#5a6270', fontSize: 10 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                            label={{ value: 'Height (m)', angle: -90, position: 'insideLeft', fill: '#5a6270', fontSize: 9, dx: 5 }}
                        />
                        <Tooltip content={<DarkTooltip type="wave" />} cursor={{ fill: 'rgba(127,200,248,0.06)' }} />
                        <Bar dataKey="wave_height_m" radius={[2, 2, 0, 0]} maxBarSize={35}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.magColor} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Chart 2: Tsunami magnitude timeline */}
            <div className="eq-chart-card">
                <div className="eq-chart-title">Tsunami magnitude timeline</div>
                <ResponsiveContainer width="100%" height="85%">
                    <LineChart data={timelineData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" vertical={false} />
                        <XAxis
                            dataKey="year"
                            tick={{ fill: '#5a6270', fontSize: 10 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                            label={{ value: 'Year', position: 'insideBottom', fill: '#5a6270', fontSize: 10, dy: 8 }}
                        />
                        <YAxis
                            tick={{ fill: '#5a6270', fontSize: 10 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                            domain={['auto', 'auto']}
                            label={{ value: 'Magnitude', angle: -90, position: 'insideLeft', fill: '#5a6270', fontSize: 9, dx: 5 }}
                        />
                        <Tooltip content={<DarkTooltip type="timeline" />} />
                        <Line
                            type="monotone"
                            dataKey="magnitude"
                            stroke="#7fc8f8"
                            strokeWidth={1.5}
                            dot={<MagDot />}
                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Chart 3: Fatalities by event */}
            <div className="eq-chart-card">
                <div className="eq-chart-title">Fatalities by event</div>
                <MagLegend />
                <ResponsiveContainer width="100%" height="78%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" vertical={false} />
                        <XAxis
                            dataKey="shortName"
                            tick={{ fill: '#5a6270', fontSize: 8 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                            angle={-30}
                            textAnchor="end"
                            height={50}
                            label={{ value: 'Event', position: 'insideBottom', fill: '#5a6270', fontSize: 10, dy: 15 }}
                        />
                        <YAxis
                            tick={{ fill: '#5a6270', fontSize: 10 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                            label={{ value: 'Fatalities', angle: -90, position: 'insideLeft', fill: '#5a6270', fontSize: 9, dx: 5 }}
                        />
                        <Tooltip content={<DarkTooltip type="fatalities" />} cursor={{ fill: 'rgba(248,127,127,0.06)' }} />
                        <Bar dataKey="fatalities" radius={[2, 2, 0, 0]} maxBarSize={35}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.magColor} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
