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

export default function EarthquakeCharts({ data = [] }) {
    
    const { totalCount, maxMag, riskFactor, magHistory, chartData } = useMemo(() => {
        if (!data.length) return { totalCount: 0, maxMag: 0, riskFactor: 0, magHistory: [], chartData: [] };
        
        const sorted = [...data].sort((a, b) => new Date(a.time) - new Date(b.time));
        const max = data.reduce((m, eq) => Math.max(m, eq.magnitude), 0);
        const highMagCount = data.filter(d => d.magnitude > 5.0).length;
        const score = ((highMagCount / data.length) * 10) + (max);
        
        return {
            totalCount: data.length,
            maxMag: max,
            riskFactor: Math.min(Math.max(score, 0), 10),
            magHistory: sorted.map(eq => eq.magnitude),
            chartData: sorted.slice(-10).map(eq => ({
                name: eq.place ? eq.place.split(',').pop().trim() : 'Unknown',
                magnitude: eq.magnitude,
                color: eq.magnitude > 6 ? '#EF4444' : (eq.magnitude > 4 ? '#F97316' : '#2DE4FF')
            }))
        };
    }, [data]);

    if (!data.length) return null;

    return (
        <div className="modular-grid">
            {/* Widget 1: Strongest Event */}
            <ClimateWidget 
                title="Strongest Event" 
                subtitle="Peak Magnitude" 
                badge="MAJOR" 
                badgeColor="#EF4444"
            >
                <ArcGauge 
                    value={parseFloat(maxMag.toFixed(1))} 
                    max={10} 
                    label="RICHTER SCALE" 
                    color="#EF4444" 
                />
            </ClimateWidget>

            {/* Widget 2: Seismic Activity */}
            <ClimateWidget 
                title="Seismic Activity" 
                subtitle="Detections (24h)" 
                badge="ACTIVE" 
                badgeColor="#2DE4FF"
            >
                <SubValue value={totalCount.toLocaleString()} unit="TREMORS" color="#2DE4FF" />
                <div style={{ fontSize: '9px', color: '#555', fontWeight: '700' }}>TOTAL GLOBAL QUAKES</div>
            </ClimateWidget>

            {/* Widget 3: Risk Index */}
            <ClimateWidget 
                title="Seismic Risk" 
                subtitle="Hazard Assessment" 
                badge="INDEX" 
                badgeColor="#F97316"
            >
                <SubValue value={riskFactor.toFixed(1)} unit="/ 10" color="#F97316" />
                <div style={{ fontSize: '9px', color: '#555', fontWeight: '700' }}>REGIONAL SURGE PROBABILITY</div>
            </ClimateWidget>

            {/* Widget 4: Magnitude History */}
            <ClimateWidget 
                title="Tremor Intensity" 
                subtitle="Tectonic Pulse Stream" 
                className="span-2"
            >
                <GlowWaveform 
                    data={magHistory} 
                    color="#F97316" 
                    height={100} 
                    minVal={0} 
                    maxVal={10} 
                />
            </ClimateWidget>

            {/* Widget 5: Recent Impact */}
            <ClimateWidget 
                title="Regional Impact" 
                subtitle="Latest Significant Events" 
                className="span-2"
            >
                <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="name" hide />
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div style={{ background: '#000', border: '1px solid #333', padding: '8px', borderRadius: '4px', fontSize: '10px' }}>
                                      <div style={{ color: '#fff', fontWeight: 'bold' }}>{payload[0].payload.name}</div>
                                      <div style={{ color: '#F97316' }}>Mag: {payload[0].value}</div>
                                    </div>
                                  );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="magnitude" radius={[2, 2, 0, 0]}>
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
