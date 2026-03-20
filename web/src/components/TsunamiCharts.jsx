import { useMemo } from 'react';
import {
    ResponsiveContainer, BarChart, Bar,
    XAxis, Tooltip, Cell,
} from 'recharts';
import ClimateWidget from './widgets/Common/ClimateWidget';
import ArcGauge from './widgets/Gauges/ArcGauge';
import GlowWaveform from './widgets/Charts/GlowWaveform';
import SubValue from './widgets/Values/SubValue';
import './widgets/ModularDashboard.css';

export default function TsunamiCharts({ data = [] }) {

    const { chartData, maxWaveHeight, totalFatalities, waveHistory, latestOrigin } = useMemo(() => {
        if (!data.length) return { chartData: [], maxWaveHeight: 0, totalFatalities: 0, waveHistory: [], latestOrigin: '' };
        
        const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
        const maxH = data.reduce((m, t) => Math.max(m, t.wave_height_m || 0), 0);
        const totalF = data.reduce((s, t) => s + (t.fatalities || 0), 0);
        
        return {
            chartData: sorted.slice(-10).map(t => ({
                name: t.name.length > 12 ? t.name.slice(0, 10) + '…' : t.name,
                fatalities: t.fatalities || 0,
                color: (t.magnitude || 0) > 8 ? '#EF4444' : '#2DE4FF'
            })),
            maxWaveHeight: maxH,
            totalFatalities: totalF,
            waveHistory: sorted.map(t => t.wave_height_m || 0),
            latestOrigin: sorted[sorted.length - 1]?.origin || 'Unknown'
        };
    }, [data]);

    if (!data.length) return null;

    return (
        <div className="modular-grid">
            {/* Widget 1: Peak Wave */}
            <ClimateWidget 
                title="Max Wave Height" 
                subtitle="Peak Surge Record" 
                badge="MAJOR" 
                badgeColor="#EF4444"
            >
                <ArcGauge 
                    value={parseFloat(maxWaveHeight.toFixed(1))} 
                    max={30} 
                    label="METERS" 
                    color="#EF4444" 
                />
            </ClimateWidget>

            {/* Widget 2: Human Impact */}
            <ClimateWidget 
                title="Human Impact" 
                subtitle="Cumulative Fatalities" 
                badge="CRITICAL" 
                badgeColor="#F97316"
            >
                <SubValue value={totalFatalities.toLocaleString()} unit="LIVES" color="#F97316" />
                <div style={{ fontSize: '9px', color: '#555', fontWeight: '700' }}>TOTAL RECORDED IMPACT</div>
            </ClimateWidget>

            {/* Widget 3: Source Origin */}
            <ClimateWidget 
                title="Primary Origin" 
                subtitle="Latest Event Source" 
                badge="DETECT" 
                badgeColor="#2DE4FF"
            >
                <div style={{ 
                    fontSize: '12px', 
                    color: '#fff', 
                    fontWeight: '800', 
                    textTransform: 'uppercase',
                    margin: '10px 0',
                    lineHeight: '1.2'
                }}>
                    {latestOrigin}
                </div>
                <div style={{ fontSize: '9px', color: '#555', fontWeight: '700' }}>SEISMIC TRIGGER ZONE</div>
            </ClimateWidget>

            {/* Widget 4: Surge Timeline */}
            <ClimateWidget 
                title="Wave Intensity" 
                subtitle="Historical Surge Stream" 
                className="span-2"
            >
                <GlowWaveform 
                    data={waveHistory} 
                    color="#2DE4FF" 
                    height={100} 
                    minVal={0} 
                    maxVal={Math.max(...waveHistory, 10)} 
                />
            </ClimateWidget>

            {/* Widget 5: Fatalities Grid */}
            <ClimateWidget 
                title="Event Comparison" 
                subtitle="Fatalities per Surge" 
                className="span-2"
            >
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" hide />
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div style={{ background: '#000', border: '1px solid #333', padding: '8px', borderRadius: '4px', fontSize: '10px' }}>
                                      <div style={{ color: '#fff', fontWeight: 'bold' }}>{payload[0].payload.name}</div>
                                      <div style={{ color: '#F97316' }}>Deaths: {payload[0].value}</div>
                                    </div>
                                  );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="fatalities" radius={[2, 2, 0, 0]}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} opacity={0.7} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ClimateWidget>
        </div>
    );
}
