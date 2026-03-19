import { useState, useEffect } from 'react';
import { api } from '../api';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const TT = { backgroundColor: '#111', border: '1px solid #1e1e1e', borderRadius: '6px', color: '#e5e5e5', fontSize: '11px', padding: '6px 10px' };

export default function Weather({ activeTab = 'Overview' }) {
    const [weather,  setWeather]  = useState(null);
    const [forecast, setForecast] = useState(null);
    const [aqi,      setAqi]      = useState(null);
    const [flood,    setFlood]    = useState(null);
    const [seasonal, setSeasonal] = useState(null);
    const [loading,  setLoading]  = useState(true);

    useEffect(() => {
        Promise.all([
            api.getWeather(),
            api.getForecast(),
            api.getAQI(),
            api.getFloodRisk(),
            api.getSeasonal(),
        ])
        .then(([w, f, a, fl, s]) => {
            setWeather(w);
            setForecast(f);
            setAqi(a?.error ? null : a);
            setFlood(fl?.error ? null : fl);
            setSeasonal(s?.error ? null : s);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loader />;

    const daily = forecast?.daily || [];
    const hourly = (forecast?.hourly || []).filter((_, i) => i % 3 === 0).slice(0, 24);



    // Helpers for Radial Gauges
    const aqiLevel = Math.min(aqi ? aqi.aqi : 0, 500);
    const aqiData = [{ value: aqiLevel, fill: aqi?.color || '#333' }, { value: 500 - aqiLevel, fill: '#1a1a2e' }];

    const floodLevel = Math.min(flood ? flood.score : 0, 100);
    const floodData = [{ value: floodLevel, fill: flood?.color || '#333' }, { value: 100 - floodLevel, fill: '#1a1a2e' }];

    return (
        <div className="space-y-4">
            {/* ── HEADER ── */}
            <div>
                <h2 className="text-[15px] font-semibold gradient-text">ClimAI Weather Hub</h2>
                <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>Live telemetry • Chennai, India</p>
            </div>

            {/* ── DYNAMIC VIEWS ── */}
            {activeTab === 'Overview' && (
                <div className="space-y-3 animation-fade-in">
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { icon: '🌡', label: 'Temperature', value: weather?.temperature,  unit: '°C',  color: '#3b82f6' },
                            { icon: '🤒', label: 'Feels Like',  value: weather?.feels_like,   unit: '°C',  color: '#f97316' },
                            { icon: '💧', label: 'Humidity',    value: weather?.humidity,      unit: '%',   color: '#22c55e' },
                            { icon: '💨', label: 'Wind',        value: weather?.wind_speed,    unit: 'km/h',color: '#06b6d4' },
                            { icon: '🌬', label: 'Gusts',       value: weather?.wind_gusts,    unit: 'km/h',color: '#a855f7' },
                            { icon: '☁',  label: 'Clouds',      value: weather?.cloud_cover,   unit: '%',   color: '#eab308' },
                            { icon: '📊', label: 'Pressure',    value: weather?.pressure,      unit: 'hPa', color: '#f97316' },
                            { icon: '🧭', label: 'Direction',   value: weather?.wind_direction,unit: '',    color: '#3b82f6' },
                        ].map((m, i) => (
                            <div key={i} className="card flex flex-col justify-center h-[72px]">
                                <div className="text-[10px] mb-0.5" style={{ color: '#555' }}>{m.icon} {m.label}</div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-[20px] font-bold" style={{ color: m.color }}>{m.value ?? '--'}</span>
                                    {m.unit && <span className="text-[10px]" style={{ color: '#555' }}>{m.unit}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Simple Forecast Table for Overview */}
                    <div className="card" style={{ padding: '12px 0' }}>
                        <div className="text-[12px] font-medium mb-2 px-4" style={{ color: '#e5e5e5' }}>7-Day Forecast</div>
                        <table className="w-full text-[11px]">
                            <thead>
                                <tr style={{ borderBottom: '1px solid #1e1e1e' }}>
                                    {['Day', 'High', 'Low', 'Wind', 'Precip %', 'UV'].map(h => (
                                        <th key={h} className={`py-1.5 px-4 font-medium text-[9px] uppercase tracking-wider ${h === 'Day' ? 'text-left' : 'text-right'}`} style={{ color: '#555' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {daily.map((d, i) => (
                                    <tr key={i} className="hover:bg-[#111] transition-colors" style={{ borderBottom: '1px solid #1e1e1e20' }}>
                                        <td className="py-1.5 px-4 font-medium" style={{ color: '#e5e5e5' }}>{d.day} <span style={{ color: '#444' }}>{d.date}</span></td>
                                        <td className="py-1.5 px-4 text-right font-medium" style={{ color: '#f97316' }}>{d.temp_max}°</td>
                                        <td className="py-1.5 px-4 text-right" style={{ color: '#06b6d4' }}>{d.temp_min}°</td>
                                        <td className="py-1.5 px-4 text-right" style={{ color: '#e5e5e5' }}>{d.wind_speed_max} km/h</td>
                                        <td className="py-1.5 px-4 text-right" style={{ color: '#3b82f6' }}>{d.precip_prob}%</td>
                                        <td className="py-1.5 px-4 text-right" style={{ color: '#555' }}>{d.uv_index}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'Temperature' && (
                <div className="space-y-3 animation-fade-in">
                    <div className="card">
                        <div className="text-[12px] font-medium mb-0.5" style={{ color: '#e5e5e5' }}>7-Day Temperature Range</div>
                        <div className="text-[9px] mb-3" style={{ color: '#444' }}>HIGH / LOW SPREAD</div>
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                                <XAxis dataKey="day" stroke="#555" fontSize={10} tickLine={false} />
                                <YAxis stroke="#555" fontSize={10} tickLine={false} unit="°" />
                                <Tooltip contentStyle={TT} />
                                <Area type="monotone" dataKey="temp_max" name="High" stroke="#f97316" fill="#f97316" fillOpacity={0.1} strokeWidth={2} />
                                <Area type="monotone" dataKey="temp_min" name="Low" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.05} strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="card">
                        <div className="text-[12px] font-medium mb-0.5" style={{ color: '#e5e5e5' }}>Hourly Trajectory</div>
                        <div className="text-[9px] mb-3" style={{ color: '#444' }}>NEXT 72 HOURS</div>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                                <XAxis dataKey="time" stroke="#555" fontSize={9} tickLine={false} tickFormatter={(v) => new Date(v).toLocaleTimeString('en', { hour: '2-digit', hour12: false })} />
                                <YAxis stroke="#555" fontSize={10} tickLine={false} unit="°" />
                                <Tooltip contentStyle={TT} labelFormatter={(v) => new Date(v).toLocaleString()} />
                                <Area type="monotone" dataKey="temperature" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.08} strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {activeTab === 'Air Quality' && (
                <div className="space-y-3 animation-fade-in">
                    <div className="card" style={{ padding: '20px' }}>
                        <div className="text-[14px] font-medium mb-1 text-center" style={{ color: '#e5e5e5' }}>Air Quality Index</div>
                        <div className="text-[9px] mb-6 text-center" style={{ color: '#444' }}>EUROPEAN AQI · OPEN-METEO</div>
                        {aqi ? (
                            <>
                                {/* Radial Half-Donut Gauge */}
                                <div className="relative h-[160px] w-full flex items-center justify-center overflow-hidden mb-6">
                                    <ResponsiveContainer width="100%" height={320} style={{ position: 'absolute', top: 0 }}>
                                        <PieChart>
                                            <Pie data={aqiData} cx="50%" cy="50%" startAngle={180} endAngle={0} innerRadius={100} outerRadius={130} dataKey="value" stroke="none" cornerRadius={4} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute top-[70px] flex flex-col items-center">
                                        <span className="text-[54px] font-bold leading-none" style={{ color: aqi.color }}>{aqi.aqi}</span>
                                        <span className="text-[13px] font-semibold tracking-wider uppercase mt-2" style={{ color: aqi.color }}>{aqi.category}</span>
                                    </div>
                                </div>
                                
                                <div className="bg-[#0a0a0f] border border-[#1e1e1e] rounded-lg p-4 mb-4 text-center text-[12px]" style={{ color: '#ccc' }}>
                                    {aqi.advice}
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { label: 'PM2.5', value: aqi.pm2_5, unit: 'μg/m³', color: '#f97316' },
                                        { label: 'PM10',  value: aqi.pm10,  unit: 'μg/m³', color: '#eab308' },
                                        { label: 'NO₂',   value: aqi.nitrogen_dioxide, unit: 'μg/m³', color: '#a855f7' },
                                        { label: 'O₃',    value: aqi.ozone, unit: 'μg/m³', color: '#06b6d4' },
                                    ].map((p, i) => (
                                        <div key={i} className="rounded-lg p-3 text-center" style={{ background: '#111' }}>
                                            <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: '#555' }}>{p.label}</div>
                                            <div className="text-[18px] font-bold mt-1" style={{ color: p.color }}>
                                                {p.value != null ? Math.round(p.value) : '--'}
                                            </div>
                                            <div className="text-[8px] mt-0.5" style={{ color: '#444' }}>{p.unit}</div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="text-[11px] italic text-center" style={{ color: '#555' }}>AQI data unavailable</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'Flood Risk' && (
                <div className="space-y-3 animation-fade-in">
                     <div className="card" style={{ padding: '20px' }}>
                        <div className="text-[14px] font-medium mb-1 text-center" style={{ color: '#e5e5e5' }}>Flood Risk Score</div>
                        <div className="text-[9px] mb-6 text-center" style={{ color: '#444' }}>REAL-TIME RISK · CHENNAI (6M ASL)</div>
                        {flood ? (
                            <>
                                {/* Radial Half-Donut Gauge */}
                                <div className="relative h-[160px] w-full flex items-center justify-center overflow-hidden mb-6">
                                    <ResponsiveContainer width="100%" height={320} style={{ position: 'absolute', top: 0 }}>
                                        <PieChart>
                                            <Pie data={floodData} cx="50%" cy="50%" startAngle={180} endAngle={0} innerRadius={100} outerRadius={130} dataKey="value" stroke="none" cornerRadius={4} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute top-[70px] flex flex-col items-center">
                                        <span className="text-[54px] font-bold leading-none" style={{ color: flood.color }}>{flood.score}</span>
                                        <span className="text-[13px] font-semibold tracking-wider uppercase mt-2 flex items-center gap-1" style={{ color: flood.color }}>{flood.icon} {flood.level}</span>
                                    </div>
                                </div>
                                
                                <div className="bg-[#0a0a0f] border border-[#1e1e1e] rounded-lg p-4 mb-4 text-center text-[12px]" style={{ color: '#ccc' }}>
                                    {flood.advice}
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { label: 'Curr Rain', value: flood.factors?.current_rainfall_mm, unit: 'mm', color: '#06b6d4' },
                                        { label: 'Humidity',  value: flood.factors?.humidity_pct,         unit: '%',  color: '#3b82f6' },
                                        { label: '3-Day Rain',value: flood.factors?.forecast_3day_mm,     unit: 'mm', color: '#a855f7' },
                                        { label: 'Prec Prob', value: flood.factors?.max_precip_probability,unit: '%', color: '#eab308' },
                                    ].map((p, i) => (
                                        <div key={i} className="rounded-lg p-3 text-center" style={{ background: '#111' }}>
                                            <div className="text-[10px] uppercase font-bold tracking-wider" style={{ color: '#555' }}>{p.label}</div>
                                            <div className="text-[18px] font-bold mt-1" style={{ color: p.color }}>
                                                {p.value != null ? p.value : '--'}
                                            </div>
                                            <div className="text-[8px] mt-0.5" style={{ color: '#444' }}>{p.unit}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-[9px] mt-4 text-center italic" style={{ color: '#444' }}>{flood.chennai_note}</div>
                            </>
                        ) : (
                            <div className="text-[11px] italic text-center" style={{ color: '#555' }}>Flood data unavailable</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'Wind' && (
                <div className="space-y-3 animation-fade-in">
                    <div className="card">
                        <div className="text-[12px] font-medium mb-0.5" style={{ color: '#e5e5e5' }}>Wind Speed Projections</div>
                        <div className="text-[9px] mb-3" style={{ color: '#444' }}>DAILY MAX · KM/H</div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                                <XAxis dataKey="day" stroke="#555" fontSize={10} tickLine={false} />
                                <YAxis stroke="#555" fontSize={10} tickLine={false} />
                                <Tooltip contentStyle={TT} />
                                <Bar dataKey="wind_speed_max" name="Wind Speed" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.85}>
                                    {daily.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.wind_speed_max > 25 ? '#ef4444' : entry.wind_speed_max > 15 ? '#eab308' : '#3b82f6'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {activeTab === 'Seasonal' && seasonal && (
                <div className="space-y-3 animation-fade-in">
                    <div className="card" style={{ padding: '20px' }}>
                        <div className="text-[14px] font-medium mb-1" style={{ color: '#e5e5e5' }}>Seasonal Comparison</div>
                        <div className="text-[10px] mb-4" style={{ color: '#555' }}>
                            {seasonal.month?.toUpperCase()} {seasonal.year} vs {seasonal.historical_avg?.based_on_years}-YEAR AVERAGE
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[
                                {
                                    label: 'This Month Avg Max',
                                    value: seasonal.current_month?.avg_max,
                                    unit: '°C',
                                    color: '#f97316',
                                    sub: `Avg: ${seasonal.historical_avg?.avg_max}°C`,
                                    diff: seasonal.comparison?.temp_diff,
                                },
                                {
                                    label: 'This Month Avg Min',
                                    value: seasonal.current_month?.avg_min,
                                    unit: '°C',
                                    color: '#06b6d4',
                                    sub: `Avg: ${seasonal.historical_avg?.avg_min}°C`,
                                    diff: null,
                                },
                                {
                                    label: 'Total Rainfall',
                                    value: seasonal.current_month?.total_precip,
                                    unit: 'mm',
                                    color: '#3b82f6',
                                    sub: `Avg: ${seasonal.historical_avg?.avg_precip}mm`,
                                    diff: seasonal.comparison?.precip_diff,
                                },
                            ].map((s, i) => (
                                <div key={i} className="rounded-lg p-4 border border-[#1e1e1e]" style={{ background: '#0a0a0f' }}>
                                    <div className="text-[9px] mb-2 font-bold tracking-wider" style={{ color: '#555' }}>{s.label.toUpperCase()}</div>
                                    <div className="text-[24px] font-bold" style={{ color: s.color }}>
                                        {s.value ?? '--'}<span className="text-[11px] ml-1" style={{ color: '#444' }}>{s.unit}</span>
                                    </div>
                                    <div className="text-[10px] mt-1" style={{ color: '#555' }}>{s.sub}</div>
                                    {s.diff != null && (
                                        <div className="text-[10px] font-medium mt-1" style={{ color: s.diff > 0 ? '#ef4444' : '#22c55e' }}>
                                            {s.diff > 0 ? '▲' : '▼'} {Math.abs(s.diff)}{s.unit} vs historical
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="text-[10px] mb-2 font-bold tracking-wider" style={{ color: '#555' }}>YEAR-BY-YEAR MAX TEMPERATURE (°C)</div>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={[
                                ...(seasonal.yearly_breakdown || []).map(y => ({
                                    year: y.year,
                                    temp: y.avg_max,
                                    precip: y.total_precip,
                                })),
                                ...(seasonal.current_month?.avg_max ? [{
                                    year: seasonal.year,
                                    temp: seasonal.current_month.avg_max,
                                    precip: seasonal.current_month.total_precip,
                                    current: true,
                                }] : [])
                            ].sort((a, b) => a.year - b.year)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
                                <XAxis dataKey="year" stroke="#555" fontSize={10} tickLine={false} />
                                <YAxis stroke="#555" fontSize={10} tickLine={false} unit="°" />
                                <Tooltip contentStyle={TT} />
                                <Bar dataKey="temp" name="Avg Max °C" radius={[3, 3, 0, 0]}>
                                    {[...(seasonal.yearly_breakdown || []), seasonal.current_month?.avg_max ? { year: seasonal.year } : null]
                                        .filter(Boolean)
                                        .sort((a, b) => a.year - b.year)
                                        .map((entry, i) => (
                                            <Cell key={i} fill={entry.year === seasonal.year ? '#f97316' : '#3b82f6'} opacity={entry.year === seasonal.year ? 1 : 0.6} />
                                        ))
                                    }
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}

function Loader() {
    return (
        <div className="flex items-center justify-center h-[300px]">
            <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#1e1e1e] border-t-[#3b82f6] rounded-full animate-spin" />
                <span className="text-[10px]" style={{ color: '#555' }}>Loading weather platform…</span>
            </div>
        </div>
    );
}