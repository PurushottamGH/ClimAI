import { useMemo } from 'react';
import {
    ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
    XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine,
} from 'recharts';
import './widgets/ModularDashboard.css';

/* ── Custom Tooltip ── */
function TempTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="premium-tooltip">
            <div className="premium-tooltip-title">{label}</div>
            {payload.map((p, i) => (
                <div key={i} className="premium-tooltip-row">
                    <span className="premium-tooltip-label">{p.name}</span>
                    <span className="premium-tooltip-value" style={{ color: p.color }}>
                        {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function TemperatureCharts({ data = [] }) {

    const { trendData, anomalyBarData, varianceData } = useMemo(() => {
        if (!data.length) return { trendData: [], anomalyBarData: [], varianceData: [] };

        const withAvg = data
            .filter(d => d.avg_temp_max != null && d.avg_temp_min != null)
            .map(d => ({
                month: d.month,
                avgTemp: (d.avg_temp_max + d.avg_temp_min) / 2,
                high: d.avg_temp_max,
                low: d.avg_temp_min,
            }));

        const mean = withAvg.reduce((s, d) => s + d.avgTemp, 0) / withAvg.length;

        const trend = withAvg.map(d => ({
            month: d.month,
            'Avg Temp (°C)': parseFloat(d.avgTemp.toFixed(2)),
            'High (°C)': parseFloat(d.high.toFixed(2)),
            'Low (°C)': parseFloat(d.low.toFixed(2)),
        }));

        const anomaly = withAvg.map(d => ({
            month: d.month,
            'Anomaly (°C)': parseFloat((d.avgTemp - mean).toFixed(3)),
        }));

        const variance = withAvg.map((d, i) => ({
            month: d.month,
            'Change (°C)': i > 0 ? parseFloat((d.avgTemp - withAvg[i - 1].avgTemp).toFixed(3)) : 0,
            'Range (°C)': parseFloat((d.high - d.low).toFixed(2)),
        }));

        return { trendData: trend, anomalyBarData: anomaly, varianceData: variance };
    }, [data]);

    if (!trendData.length) return null;

    return (
        <div className="three-box-layout">
            {/* ── Box 1: Global Temperature Trend ── */}
            <div className="chart-box">
                <div className="chart-box-header">
                    <span className="chart-box-title">GLOBAL TEMPERATURE TREND</span>
                    <div className="chart-box-legend">
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#2DE4FF' }} /> Avg</span>
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#EF4444' }} /> High</span>
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#3B82F6' }} /> Low</span>
                    </div>
                </div>
                <div className="chart-box-body">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }}
                                axisLine={{ stroke: '#222' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 9, fill: '#444', fontFamily: 'DM Mono' }}
                                axisLine={false}
                                tickLine={false}
                                unit="°"
                                domain={['auto', 'auto']}
                            />
                            <Tooltip content={<TempTooltip />} />
                            <Line type="monotone" dataKey="High (°C)" stroke="#EF4444" strokeWidth={1.5} dot={false} strokeOpacity={0.6} />
                            <Line type="monotone" dataKey="Low (°C)" stroke="#3B82F6" strokeWidth={1.5} dot={false} strokeOpacity={0.6} />
                            <Line
                                type="monotone"
                                dataKey="Avg Temp (°C)"
                                stroke="#2DE4FF"
                                strokeWidth={2}
                                dot={{ r: 2.5, fill: '#2DE4FF', stroke: '#0a0e14', strokeWidth: 1 }}
                                activeDot={{ r: 5, fill: '#fff', stroke: '#2DE4FF', strokeWidth: 2 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Box 2: Anomaly Heatmap ── */}
            <div className="chart-box">
                <div className="chart-box-header">
                    <span className="chart-box-title">TEMPERATURE ANOMALY</span>
                    <div className="chart-box-legend">
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#EF4444' }} /> Warm</span>
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#3B82F6' }} /> Cool</span>
                    </div>
                </div>
                <div className="chart-box-body">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={anomalyBarData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }}
                                axisLine={{ stroke: '#222' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 9, fill: '#444', fontFamily: 'DM Mono' }}
                                axisLine={false}
                                tickLine={false}
                                unit="°"
                            />
                            <Tooltip content={<TempTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                            <ReferenceLine y={0} stroke="#444" strokeDasharray="4 4" />
                            <Bar dataKey="Anomaly (°C)" radius={[3, 3, 0, 0]}>
                                {anomalyBarData.map((entry, i) => (
                                    <Cell key={i} fill={entry['Anomaly (°C)'] >= 0 ? '#EF4444' : '#3B82F6'} fillOpacity={0.75} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Box 3: Variance & Range ── */}
            <div className="chart-box">
                <div className="chart-box-header">
                    <span className="chart-box-title">VARIANCE & DAILY RANGE</span>
                    <div className="chart-box-legend">
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#A855F7' }} /> Change</span>
                        <span className="chart-box-legend-item"><span className="dot" style={{ background: '#10B981' }} /> Range</span>
                    </div>
                </div>
                <div className="chart-box-body">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={varianceData} margin={{ top: 8, right: 12, left: -10, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 9, fill: '#555', fontFamily: 'DM Mono' }}
                                axisLine={{ stroke: '#222' }}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 9, fill: '#444', fontFamily: 'DM Mono' }}
                                axisLine={false}
                                tickLine={false}
                                unit="°"
                            />
                            <Tooltip content={<TempTooltip />} />
                            <defs>
                                <linearGradient id="rangeGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="Range (°C)" stroke="#10B981" strokeWidth={1.5} fill="url(#rangeGrad)" dot={false} />
                            <Line type="monotone" dataKey="Change (°C)" stroke="#A855F7" strokeWidth={2} dot={{ r: 2, fill: '#A855F7' }} activeDot={{ r: 5, fill: '#fff', stroke: '#A855F7', strokeWidth: 2 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
