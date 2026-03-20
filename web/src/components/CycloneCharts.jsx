import { useMemo } from 'react';
import {
    ResponsiveContainer, BarChart, Bar,
    XAxis, Tooltip, Cell,
} from 'recharts';
import ClimateWidget from './widgets/Common/ClimateWidget';
import ArcGauge from './widgets/Gauges/ArcGauge';
import GlowWaveform from './widgets/Charts/GlowWaveform';
import DotMatrix from './widgets/Charts/DotMatrix';
import SubValue from './widgets/Values/SubValue';
import './widgets/ModularDashboard.css';

// ── Category → color mapping ──
function getCatColor(cat) {
    if (!cat) return '#2DE4FF';
    if (String(cat).includes('Very Severe')) return '#EF4444';
    if (String(cat).includes('Severe')) return '#F97316';
    return '#2DE4FF';
}

function getCatLabel(cat) {
    if (!cat) return 'CS';
    if (String(cat).includes('Very Severe')) return 'VSCS';
    if (String(cat).includes('Severe')) return 'SCS';
    return 'CS';
}

export default function CycloneCharts({ data = [] }) {

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

    const latest = chartData[chartData.length - 1] || {};
    const totalDamage = chartData.reduce((acc, c) => acc + c.damage_crore, 0);
    const windHistory = chartData.map(c => c.max_wind_kmh);

    if (!chartData || chartData.length === 0) {
        return (
            <div className="flex items-center justify-center w-full h-full text-[#555] text-[12px] italic">
                No cyclone data available at the moment.
            </div>
        );
    }

    return (
        <div className="modular-grid">
            {/* Widget 1: Peak Intensity */}
            <ClimateWidget 
                title="Peak Intensity" 
                subtitle={`LATEST: ${latest.shortName || 'N/A'}`} 
                badge={latest.catLabel || 'CS'} 
                badgeColor={latest.color}
            >
                <ArcGauge 
                    value={latest.max_wind_kmh || 0} 
                    max={250} 
                    label="MAX WIND km/h" 
                    color={latest.color} 
                />
            </ClimateWidget>

            {/* Widget 2: Economic Impact */}
            <ClimateWidget 
                title="Economic Impact" 
                subtitle="Cumulative Damage" 
                badge="CRITICAL" 
                badgeColor="#F97316"
            >
                <SubValue value={Math.round(totalDamage).toLocaleString()} unit="Crores" color="#F97316" />
                <div style={{ fontSize: '9px', color: '#555', marginTop: '-5px', fontWeight: '700' }}>
                    ESTIMATED TOTAL LOSS
                </div>
            </ClimateWidget>

            {/* Widget 3: Precipitation */}
            <ClimateWidget 
                title="Precipitation" 
                subtitle="Rainfall Density" 
                badge="ACTIVE" 
                badgeColor="#2DE4FF"
            >
                <DotMatrix count={Math.min(Math.floor((latest.rainfall_mm || 0) / 20), 20)} color="#2DE4FF" />
                <SubValue value={latest.rainfall_mm || 0} unit="mm" size="24px" color="#2DE4FF" />
            </ClimateWidget>

            {/* Widget 4: Wind Trend */}
            <ClimateWidget 
                title="Wind Velocity Trend" 
                subtitle="Historical Peak Speeds" 
                className="span-2"
            >
                <GlowWaveform data={windHistory} color="#A855F7" height={100} maxVal={250} />
            </ClimateWidget>

            {/* Widget 5: Comparison */}
            <ClimateWidget 
                title="Event Comparison" 
                subtitle="Damage per Cyclone" 
                className="span-2"
            >
                <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="shortName" hide />
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div style={{ background: '#000', border: '1px solid #333', padding: '8px', borderRadius: '4px', fontSize: '10px' }}>
                                      <div style={{ color: '#fff', fontWeight: 'bold' }}>{payload[0].payload.name}</div>
                                      <div style={{ color: '#F97316' }}>Damage: {payload[0].value} Crores</div>
                                    </div>
                                  );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="damage_crore" radius={[2, 2, 0, 0]}>
                            {chartData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} opacity={0.8} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ClimateWidget>
        </div>
    );
}
