import { useMemo } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend,
} from 'recharts';
import '../components/EarthquakeCharts.css';   /* reuse same dark chart styles */

// ── Category → color mapping ──
function getCatColor(cat) {
    if (!cat) return '#7fc8f8';
    if (String(cat).includes('Very Severe')) return '#f5b7c5';
    if (String(cat).includes('Severe')) return '#5b9bd5';
    return '#7fc8f8';
}

function getCatLabel(cat) {
    if (!cat) return 'CS';
    if (String(cat).includes('Very Severe')) return 'VSCS';
    if (String(cat).includes('Severe')) return 'SCS';
    return 'CS';
}

// ── Custom dark tooltip ──
function DarkTooltip({ active, payload, type }) {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;

    if (type === 'damage') {
        return (
            <div className="eq-tooltip">
                <div className="eq-tooltip-label">{d.name}</div>
                <div className="eq-tooltip-value">Damage=₹{d.damage_crore} crores</div>
                <div style={{ color: '#9ca3af', fontSize: 11 }}>Category: {d.catLabel}</div>
            </div>
        );
    }
    if (type === 'rainfall') {
        return (
            <div className="eq-tooltip">
                <div className="eq-tooltip-label">{d.name}</div>
                <div className="eq-tooltip-value">Rainfall={d.rainfall_mm} mm</div>
                <div style={{ color: '#9ca3af', fontSize: 11 }}>{d.dates}</div>
            </div>
        );
    }
    if (type === 'wind') {
        return (
            <div className="eq-tooltip">
                <div className="eq-tooltip-label">{d.name}</div>
                <div className="eq-tooltip-value">Max Wind={d.max_wind_kmh} km/h</div>
                <div style={{ color: '#9ca3af', fontSize: 11 }}>Category: {d.catLabel}</div>
            </div>
        );
    }
    return null;
}

// ── Custom legend ──
function CatLegend() {
    const items = [
        { label: 'SCS', color: '#5b9bd5' },
        { label: 'CS', color: '#7fc8f8' },
        { label: 'VSCS', color: '#f5b7c5' },
    ];
    return (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginBottom: 2 }}>
            <span style={{ color: '#6b7280', fontSize: 10 }}>category</span>
            {items.map(it => (
                <span key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: it.color, display: 'inline-block' }} />
                    <span style={{ color: it.color, fontSize: 10 }}>{it.label}</span>
                </span>
            ))}
        </div>
    );
}

export default function CycloneCharts({ data = [] }) {

    // ── Prepare data ──
    const chartData = useMemo(() => {
        if (!Array.isArray(data) || !data.length) return [];
        return [...data]
            .sort((a, b) => (a.year || 0) - (b.year || 0))
            .map(c => ({
                name: c.name || 'Unknown',
                shortName: (c.name || 'Unknown').replace('Cyclone ', ''),
                damage_crore: c.damage_crore || 0,
                rainfall_mm: c.rainfall_mm || 0,
                max_wind_kmh: c.max_wind_kmh || 0,
                category: c.category || 'CS',
                catLabel: getCatLabel(c.category),
                color: getCatColor(c.category),
                year: c.year,
                dates: c.dates,
            }));
    }, [data]);

    if (!chartData || chartData.length === 0) {
        return (
            <div className="flex items-center justify-center w-full h-full text-[#555] text-[12px] italic">
                No cyclone data available at the moment.
            </div>
        );
    }

    return (
        <div className="eq-charts-row">
            {/* Chart 1: Estimated damage by cyclone */}
            <div className="eq-chart-card">
                <div className="eq-chart-title">Estimated damage by cyclone</div>
                <CatLegend />
                <ResponsiveContainer width="100%" height="78%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" vertical={false} />
                        <XAxis
                            dataKey="shortName"
                            tick={{ fill: '#5a6270', fontSize: 9 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                            angle={-20}
                            textAnchor="end"
                            height={40}
                        />
                        <YAxis
                            tick={{ fill: '#5a6270', fontSize: 10 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                            label={{ value: 'Damage (Rs. crores)', angle: -90, position: 'insideLeft', fill: '#5a6270', fontSize: 9, dx: 5 }}
                        />
                        <Tooltip content={<DarkTooltip type="damage" />} cursor={{ fill: 'rgba(127,200,248,0.06)' }} />
                        <Bar dataKey="damage_crore" radius={[2, 2, 0, 0]} maxBarSize={40}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Chart 2: Monthly rainfall series (shown as bar for each cyclone) */}
            <div className="eq-chart-card">
                <div className="eq-chart-title">Monthly rainfall series</div>
                <ResponsiveContainer width="100%" height="85%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
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
                            label={{ value: 'Rainfall (mm)', angle: -90, position: 'insideLeft', fill: '#5a6270', fontSize: 9, dx: 5 }}
                        />
                        <Tooltip content={<DarkTooltip type="rainfall" />} />
                        <Line
                            type="monotone"
                            dataKey="rainfall_mm"
                            stroke="#7fc8f8"
                            strokeWidth={1.5}
                            dot={{ r: 3, fill: '#7fc8f8', stroke: '#7fc8f8' }}
                            activeDot={{ r: 5, fill: '#7fc8f8', stroke: '#fff', strokeWidth: 1.5 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Chart 3: Cyclone wind intensity */}
            <div className="eq-chart-card">
                <div className="eq-chart-title">Cyclone wind intensity</div>
                <CatLegend />
                <ResponsiveContainer width="100%" height="78%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" vertical={false} />
                        <XAxis
                            dataKey="shortName"
                            tick={{ fill: '#5a6270', fontSize: 9 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                            angle={-20}
                            textAnchor="end"
                            height={40}
                        />
                        <YAxis
                            tick={{ fill: '#5a6270', fontSize: 10 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                            label={{ value: 'Max Wind (km/h)', angle: -90, position: 'insideLeft', fill: '#5a6270', fontSize: 9, dx: 5 }}
                        />
                        <Tooltip content={<DarkTooltip type="wind" />} cursor={{ fill: 'rgba(127,200,248,0.06)' }} />
                        <Bar dataKey="max_wind_kmh" radius={[2, 2, 0, 0]} maxBarSize={40}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
