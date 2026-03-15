import { useMemo } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine,
} from 'recharts';
import '../components/EarthquakeCharts.css';

// ── Dark tooltip ──
function DarkTooltip({ active, payload, type }) {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;

    if (type === 'anomaly') {
        return (
            <div className="eq-tooltip">
                <div className="eq-tooltip-label">{d.month}</div>
                <div className="eq-tooltip-value">Anomaly={d.anomaly > 0 ? '+' : ''}{d.anomaly.toFixed(2)} °C</div>
                <div style={{ color: '#9ca3af', fontSize: 11 }}>Avg: {d.avgTemp.toFixed(1)} °C</div>
            </div>
        );
    }
    if (type === 'average') {
        return (
            <div className="eq-tooltip">
                <div className="eq-tooltip-label">{d.month}</div>
                <div className="eq-tooltip-value">Avg Temp={d.avgTemp.toFixed(1)} °C</div>
                <div style={{ color: '#9ca3af', fontSize: 11 }}>Max: {d.avgMax.toFixed(1)} / Min: {d.avgMin.toFixed(1)}</div>
                {d.ma5 != null ? (
                    <div style={{ color: '#9ca3af', fontSize: 11 }}>MA5: {d.ma5.toFixed(2)} °C</div>
                ) : null}
            </div>
        );
    }
    if (type === 'change') {
        return (
            <div className="eq-tooltip">
                <div className="eq-tooltip-label">{d.month}</div>
                <div className="eq-tooltip-value">Change={d.change > 0 ? '+' : ''}{d.change.toFixed(3)} °C/mo</div>
            </div>
        );
    }
    return null; // fallback
}

// ── Latest stat display ──
function LatestStat({ label, value, unit }) {
    return (
        <div style={{ position: 'absolute', top: 8, right: 14, textAlign: 'right' }}>
            <div style={{ color: '#6b7280', fontSize: 9, letterSpacing: 0.3 }}>{label}</div>
            <div style={{ color: '#e0e4ea', fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
            <div style={{ color: '#5a6270', fontSize: 9 }}>{unit}</div>
        </div>
    );
}

export default function TemperatureCharts({ data = [] }) {

    // Compute overall mean for anomaly baseline
    const { chartData, overallMean, latestMonth, latestAnomaly, latestAvg, latestChange } = useMemo(() => {
        if (!data.length) return { chartData: [], overallMean: 0, latestMonth: '', latestAnomaly: 0, latestAvg: 0, latestChange: 0 };

        // Compute avg temp per month
        const withAvg = data
            .filter(d => d.avg_temp_max != null && d.avg_temp_min != null)
            .map(d => ({
                month: d.month,
                avgMax: d.avg_temp_max,
                avgMin: d.avg_temp_min,
                avgTemp: (d.avg_temp_max + d.avg_temp_min) / 2,
            }));

        // Overall mean (the baseline for anomaly)
        const mean = withAvg.reduce((s, d) => s + d.avgTemp, 0) / withAvg.length;

        // Build chart data with anomaly, rate of change, and 5-year moving average (ma5)
        const result = withAvg.map((d, i) => ({
            ...d,
            anomaly: d.avgTemp - mean,
            change: i > 0 ? d.avgTemp - withAvg[i - 1].avgTemp : 0,
            ma5: (i >= 4) ? (withAvg.slice(i - 4, i + 1).reduce((s, x) => s + x.avgTemp, 0) / 5) : null,
        }));

        const last = result[result.length - 1];

        return {
            chartData: result,
            overallMean: mean,
            latestMonth: last?.month || '',
            latestAnomaly: last?.anomaly || 0,
            latestAvg: last?.avgTemp || 0,
            latestChange: last?.change || 0,
        };
    }, [data]);

    if (!chartData.length) return null;

    return (
        <div className="eq-charts-row">
            {/* Chart 1: Yearly Average Temperature Anomaly */}
            <div className="eq-chart-card" style={{ position: 'relative' }}>
                <div className="eq-chart-title">Temperature Anomaly</div>
                <LatestStat label={latestMonth} value={latestAnomaly > 0 ? `+${latestAnomaly.toFixed(2)}` : latestAnomaly.toFixed(2)} unit="°C" />
                <ResponsiveContainer width="100%" height="82%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" vertical={false} />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: '#5a6270', fontSize: 8 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                            interval={Math.max(1, Math.floor(chartData.length / 8))}
                        />
                        <YAxis
                            tick={{ fill: '#5a6270', fontSize: 10 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                        />
                        <ReferenceLine y={0} stroke="#3a3f4e" strokeDasharray="3 3" />
                        <Tooltip content={<DarkTooltip type="anomaly" />} cursor={{ fill: 'rgba(255,180,60,0.06)' }} />
                        <Bar dataKey="anomaly" radius={[1, 1, 0, 0]} maxBarSize={8}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.anomaly >= 0 ? '#f5a623' : '#4a9eda'} fillOpacity={0.85} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Chart 2: Yearly Average Temperature */}
            <div className="eq-chart-card" style={{ position: 'relative' }}>
                <div className="eq-chart-title">Average Temperature</div>
                <LatestStat label={latestMonth} value={latestAvg.toFixed(1)} unit="°C" />
                <ResponsiveContainer width="100%" height="82%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" vertical={false} />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: '#5a6270', fontSize: 8 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                            interval={Math.max(1, Math.floor(chartData.length / 8))}
                        />
                        <YAxis
                            tick={{ fill: '#5a6270', fontSize: 10 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                            domain={['auto', 'auto']}
                            label={{ value: '°C', angle: -90, position: 'insideLeft', fill: '#5a6270', fontSize: 10, dx: 10 }}
                        />
                        <ReferenceLine y={overallMean} stroke="#3a5a7a" strokeDasharray="4 4" label="" />
                        <Tooltip content={<DarkTooltip type="average" />} />
                        <Line
                            type="monotone"
                            dataKey="avgTemp"
                            stroke="#e0e0e0"
                            strokeWidth={1.2}
                            dot={false}
                            activeDot={{ r: 3, fill: '#fff', stroke: '#fff' }}
                        />
                        {/* 5-year Moving Average line (MA5) */}
                        <Line
                            type="monotone"
                            dataKey="ma5"
                            stroke="#4ade80"
                            strokeWidth={1.6}
                            dot={false}
                            activeDot={{ r: 3, fill: '#fff', stroke: '#fff' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Chart 3: Rate of Temperature Change */}
            <div className="eq-chart-card" style={{ position: 'relative' }}>
                <div className="eq-chart-title">Rate of Temperature Change</div>
                <LatestStat label={latestMonth} value={latestChange > 0 ? `+${latestChange.toFixed(3)}` : latestChange.toFixed(3)} unit="°C / Month" />
                <ResponsiveContainer width="100%" height="82%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" vertical={false} />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: '#5a6270', fontSize: 8 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                            interval={Math.max(1, Math.floor(chartData.length / 8))}
                        />
                        <YAxis
                            tick={{ fill: '#5a6270', fontSize: 10 }}
                            axisLine={{ stroke: '#1a1f2e' }}
                            tickLine={false}
                        />
                        <ReferenceLine y={0} stroke="#3a3f4e" strokeDasharray="3 3" />
                        <Tooltip content={<DarkTooltip type="change" />} />
                        <Line
                            type="monotone"
                            dataKey="change"
                            stroke="url(#changeGradient)"
                            strokeWidth={1.2}
                            dot={false}
                            activeDot={{ r: 3, fill: '#fff', stroke: '#fff' }}
                        />
                        <defs>
                            <linearGradient id="changeGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#4a9eda" />
                                <stop offset="50%" stopColor="#e0e0e0" />
                                <stop offset="100%" stopColor="#e74c3c" />
                            </linearGradient>
                        </defs>
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
