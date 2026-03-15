import { useState, useEffect } from 'react';
import { api } from '../api';
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const TT = { backgroundColor: '#111', border: '1px solid #1e1e1e', borderRadius: '6px', color: '#e5e5e5', fontSize: '11px', padding: '6px 10px' };

export default function Weather() {
    const [weather, setWeather] = useState(null);
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.getWeather(), api.getForecast()])
            .then(([w, f]) => { setWeather(w); setForecast(f); })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loader />;

    const daily = forecast?.daily || [];
    const hourly = (forecast?.hourly || []).filter((_, i) => i % 3 === 0).slice(0, 24);

    return (
        <div className="space-y-3">
            <div>
                <h2 className="text-[15px] font-semibold gradient-text">Temperature Analysis</h2>
                <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>Live forecast • Hourly trend • Chennai, India</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { icon: '🌡', label: 'Temperature', value: weather?.temperature, unit: '°C', color: '#3b82f6' },
                    { icon: '🤒', label: 'Feels Like', value: weather?.feels_like, unit: '°C', color: '#f97316' },
                    { icon: '💧', label: 'Humidity', value: weather?.humidity, unit: '%', color: '#22c55e' },
                    { icon: '💨', label: 'Wind', value: weather?.wind_speed, unit: 'km/h', color: '#06b6d4' },
                    { icon: '🌬', label: 'Gusts', value: weather?.wind_gusts, unit: 'km/h', color: '#a855f7' },
                    { icon: '☁', label: 'Clouds', value: weather?.cloud_cover, unit: '%', color: '#eab308' },
                    { icon: '📊', label: 'Pressure', value: weather?.pressure, unit: 'hPa', color: '#f97316' },
                    { icon: '🧭', label: 'Direction', value: weather?.wind_direction, unit: '', color: '#3b82f6' },
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

            {/* Charts */}
            <div className="grid grid-cols-2 gap-2">
                <div className="card">
                    <div className="text-[12px] font-medium mb-0.5" style={{ color: '#e5e5e5' }}>7-Day Temperature</div>
                    <div className="text-[9px] mb-3" style={{ color: '#444' }}>HIGH / LOW RANGE</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={daily}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                            <XAxis dataKey="day" stroke="#555" fontSize={10} tickLine={false} />
                            <YAxis stroke="#555" fontSize={10} tickLine={false} unit="°" />
                            <Tooltip contentStyle={TT} />
                            <Area type="monotone" dataKey="temp_max" name="High" stroke="#f97316" fill="#f97316" fillOpacity={0.08} strokeWidth={2} />
                            <Area type="monotone" dataKey="temp_min" name="Low" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.05} strokeWidth={1.5} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <div className="text-[12px] font-medium mb-0.5" style={{ color: '#e5e5e5' }}>Wind Speed</div>
                    <div className="text-[9px] mb-3" style={{ color: '#444' }}>DAILY MAX · KM/H</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={daily}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                            <XAxis dataKey="day" stroke="#555" fontSize={10} tickLine={false} />
                            <YAxis stroke="#555" fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={TT} />
                            <Bar dataKey="wind_speed_max" name="Wind" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.8} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Hourly */}
            <div className="card">
                <div className="text-[12px] font-medium mb-0.5" style={{ color: '#e5e5e5' }}>Hourly Temperature</div>
                <div className="text-[9px] mb-3" style={{ color: '#444' }}>NEXT 72 HOURS</div>
                <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={hourly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                        <XAxis dataKey="time" stroke="#555" fontSize={9} tickLine={false}
                            tickFormatter={(v) => new Date(v).toLocaleTimeString('en', { hour: '2-digit', hour12: false })} />
                        <YAxis stroke="#555" fontSize={10} tickLine={false} unit="°" />
                        <Tooltip contentStyle={TT} labelFormatter={(v) => new Date(v).toLocaleString()} />
                        <Area type="monotone" dataKey="temperature" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.06} strokeWidth={1.5} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Table */}
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
    );
}

function Loader() {
    return (
        <div className="flex items-center justify-center h-[300px]">
            <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#1e1e1e] border-t-[#3b82f6] rounded-full animate-spin" />
                <span className="text-[10px]" style={{ color: '#555' }}>Loading weather…</span>
            </div>
        </div>
    );
}
