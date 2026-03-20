import { useMemo } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
    XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend,
} from 'recharts';
import './widgets/ModularDashboard.css';

/* ── Custom Tooltip ── */
function CycloneTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="premium-tooltip">
            <div className="premium-tooltip-title">{payload[0]?.payload?.name || label}</div>
            {payload.map((p, i) => (
                <div key={i} className="premium-tooltip-row">
                    <span className="premium-tooltip-label">{p.name}</span>
                    <span className="premium-tooltip-value" style={{ color: p.color }}>
                        {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function CycloneCharts({ data = [] }) {

    const { windData, damageData, rainfallAreaData } = useMemo(() => {
        if (!Array.isArray(data) || !data.length) return { windData: [], damageData: [], rainfallAreaData: [] };

        const sorted = [...data].sort((a, b) => (a.year || 0) - (b.year || 0));

        const wind = sorted.map(c => ({
            name: (c.name || 'N/A').replace('Cyclone ', ''),
            'Max Wind (km/h)': c.max_wind_kmh || 0,
            year: c.year,
        }));

        const damage = sorted.map(c => ({
            name: (c.name || 'N/A').replace('Cyclone ', ''),
            'Damage (₹ Cr)': c.damage_crore || 0,
            category: c.category,
            color: String(c.category || '').includes('Very Severe') ? '#EF4444'
                : String(c.category || '').includes('Severe') ? '#F97316' : '#2DE4FF',
        }));

        const rainfall = sorted.map(c => ({
            name: (c.name || 'N/A').replace('Cyclone ', ''),
            'Rainfall (mm)': c.rainfall_mm || 0,
        }));

        return { windData: wind, damageData: damage, rainfallAreaData: rainfall };
    }, [data]);

    if (!data?.length) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#555', fontSize: '12px', fontStyle: 'italic' }}>
                No cyclone data available.
            </div>
        );
    }

    return (
        <div className="three-box-layout">
            {/* ── Box 1: Max Wind Speed by Event ── */}
            <div className="chart-box">
                <div className="chart-box-header">
                    <span className="chart-box-title">MAX WIND SPEED BY EVENT</span>
                    <div className="chart-box-legend">
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#A855F7' }} /> Max Wind</span>
                    </div>
                </div>
                <div className="chart-box-body">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={windData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }}
                                axisLine={{ stroke: '#222' }}
                                tickLine={false}
                                angle={-35}
                                textAnchor="end"
                                height={45}
                            />
                            <YAxis
                                tick={{ fontSize: 9, fill: '#444', fontFamily: 'DM Mono' }}
                                axisLine={false}
                                tickLine={false}
                                unit=" km/h"
                            />
                            <Tooltip content={<CycloneTooltip />} cursor={{ fill: 'rgba(168, 85, 247, 0.06)' }} />
                            <defs>
                                <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#A855F7" stopOpacity={0.9} />
                                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.5} />
                                </linearGradient>
                            </defs>
                            <Bar dataKey="Max Wind (km/h)" fill="url(#windGrad)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Box 2: Economic Impact Timeline ── */}
            <div className="chart-box">
                <div className="chart-box-header">
                    <span className="chart-box-title">ECONOMIC IMPACT TIMELINE</span>
                    <div className="chart-box-legend">
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#F97316' }} /> Damage</span>
                    </div>
                </div>
                <div className="chart-box-body">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={damageData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }}
                                axisLine={{ stroke: '#222' }}
                                tickLine={false}
                                angle={-35}
                                textAnchor="end"
                                height={45}
                            />
                            <YAxis
                                tick={{ fontSize: 9, fill: '#444', fontFamily: 'DM Mono' }}
                                axisLine={false}
                                tickLine={false}
                                unit=" Cr"
                            />
                            <Tooltip content={<CycloneTooltip />} cursor={{ fill: 'rgba(249, 115, 22, 0.06)' }} />
                            <Bar dataKey="Damage (₹ Cr)" radius={[4, 4, 0, 0]}>
                                {damageData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Box 3: Rainfall Distribution ── */}
            <div className="chart-box">
                <div className="chart-box-header">
                    <span className="chart-box-title">RAINFALL DISTRIBUTION</span>
                    <div className="chart-box-legend">
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#2DE4FF' }} /> Rainfall</span>
                    </div>
                </div>
                <div className="chart-box-body">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={rainfallAreaData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }}
                                axisLine={{ stroke: '#222' }}
                                tickLine={false}
                                angle={-35}
                                textAnchor="end"
                                height={45}
                            />
                            <YAxis
                                tick={{ fontSize: 9, fill: '#444', fontFamily: 'DM Mono' }}
                                axisLine={false}
                                tickLine={false}
                                unit=" mm"
                            />
                            <Tooltip content={<CycloneTooltip />} cursor={{ stroke: '#2DE4FF', strokeOpacity: 0.3 }} />
                            <defs>
                                <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#2DE4FF" stopOpacity={0.35} />
                                    <stop offset="100%" stopColor="#2DE4FF" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="Rainfall (mm)"
                                stroke="#2DE4FF"
                                strokeWidth={2}
                                fill="url(#rainGrad)"
                                dot={{ r: 3, fill: '#2DE4FF', stroke: '#0a0e14', strokeWidth: 1.5 }}
                                activeDot={{ r: 5, fill: '#fff', stroke: '#2DE4FF', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
