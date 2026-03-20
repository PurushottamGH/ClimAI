import { useMemo } from 'react';
import {
    ResponsiveContainer, BarChart, Bar,
    XAxis, Tooltip, Cell, ReferenceLine
} from 'recharts';
import ClimateWidget from './widgets/Common/ClimateWidget';
import ArcGauge from './widgets/Gauges/ArcGauge';
import GlowWaveform from './widgets/Charts/GlowWaveform';
import SubValue from './widgets/Values/SubValue';
import './widgets/ModularDashboard.css';

export default function TemperatureCharts({ data = [] }) {

    const { chartData, latestAnomaly, latestAvg, latestChange, latestMonth, anomalyHistory, avgHistory } = useMemo(() => {
        if (!data.length) return { chartData: [], latestAnomaly: 0, latestAvg: 0, latestChange: 0, latestMonth: '', anomalyHistory: [], avgHistory: [] };

        const withAvg = data
            .filter(d => d.avg_temp_max != null && d.avg_temp_min != null)
            .map(d => ({
                month: d.month,
                avgTemp: (d.avg_temp_max + d.avg_temp_min) / 2,
            }));

        const mean = withAvg.reduce((s, d) => s + d.avgTemp, 0) / withAvg.length;

        const result = withAvg.map((d, i) => ({
            ...d,
            anomaly: d.avgTemp - mean,
            change: i > 0 ? d.avgTemp - withAvg[i - 1].avgTemp : 0,
        }));

        const last = result[result.length - 1];

        return {
            chartData: result,
            latestMonth: last?.month || '',
            latestAnomaly: last?.anomaly || 0,
            latestAvg: last?.avgTemp || 0,
            latestChange: last?.change || 0,
            anomalyHistory: result.map(r => r.anomaly),
            avgHistory: result.map(r => r.avgTemp),
        };
    }, [data]);

    if (!chartData.length) return null;

    return (
        <div className="modular-grid">
            {/* Widget 1: Latest Anomaly */}
            <ClimateWidget 
                title="Temperature Anomaly" 
                subtitle={`LATEST: ${latestMonth}`} 
                badge={latestAnomaly > 0 ? "WARMING" : "COOLING"}
                badgeColor={latestAnomaly > 0 ? "#EF4444" : "#3B82F6"}
            >
                <SubValue 
                    value={(latestAnomaly > 0 ? "+" : "") + latestAnomaly.toFixed(2)} 
                    unit="°C" 
                    color={latestAnomaly > 0 ? "#EF4444" : "#3B82F6"} 
                />
                <div style={{ fontSize: '9px', color: '#555', fontWeight: '700' }}>DEVIATION FROM MEAN</div>
            </ClimateWidget>

            {/* Widget 2: Average Temperature */}
            <ClimateWidget 
                title="Global Avg Temp" 
                subtitle="Daily High/Low Mean" 
                badge="STABLE" 
                badgeColor="#2DE4FF"
            >
                <ArcGauge 
                    value={parseFloat(latestAvg.toFixed(1))} 
                    max={50} 
                    label="DEGREES CELSIUS" 
                    color="#2DE4FF" 
                />
            </ClimateWidget>

            {/* Widget 3: Rate of Change */}
            <ClimateWidget 
                title="Rate of Change" 
                subtitle="Monthly Variance" 
                badge="FLUX" 
                badgeColor="#A855F7"
            >
                <SubValue 
                    value={(latestChange > 0 ? "+" : "") + latestChange.toFixed(3)} 
                    unit="°C / Mo" 
                    color="#A855F7" 
                    size="28px"
                />
                <div style={{ fontSize: '9px', color: '#555', fontWeight: '700' }}>MONTH-OVER-MONTH</div>
            </ClimateWidget>

            {/* Widget 4: Anomaly Timeline */}
            <ClimateWidget 
                title="Anomaly History" 
                subtitle="5-Year Climate Trend" 
                className="span-2"
            >
                <GlowWaveform 
                    data={anomalyHistory} 
                    color={latestAnomaly > 0 ? "#EF4444" : "#3B82F6"} 
                    height={100} 
                    minVal={Math.min(...anomalyHistory)} 
                    maxVal={Math.max(...anomalyHistory)} 
                />
            </ClimateWidget>

            {/* Widget 5: Comparison Grid */}
            <ClimateWidget 
                title="Distribution" 
                subtitle="Anomaly Spread" 
                className="span-2"
            >
                <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="month" hide />
                        <ReferenceLine y={0} stroke="#444" strokeDasharray="3 3" />
                        <Bar dataKey="anomaly" radius={[2, 2, 0, 0]}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.anomaly >= 0 ? '#EF4444' : '#3B82F6'} opacity={0.6} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ClimateWidget>
        </div>
    );
}
