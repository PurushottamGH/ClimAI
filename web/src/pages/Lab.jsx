import { useState, useEffect } from 'react';
import { api } from '../api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChevronRight, Reload, Checkbox as CheckBox, Cancel as Close, AudioWaveform as Pulse, Database, Cpu, Globe } from 'pixelarticons/react';

const TT = { backgroundColor: '#0d0d14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0', color: '#e5e5e5', fontSize: '12px', padding: '8px 12px', fontFamily: "'DM Mono', monospace" };

const MODELS = [
    { id: 'random_forest', label: 'Random Forest', color: '#3b82f6', Icon: Database },
    { id: 'xgboost', label: 'XGBoost', color: '#f97316', Icon: Cpu },
    { id: 'lstm', label: 'LSTM', color: '#8b5cf6', Icon: Pulse },
    { id: 'lightgbm', label: 'LightGBM', color: '#22c55e', Icon: Globe },
];

export default function Lab() {
    const [tab, setTab] = useState('models');
    const [modelResults, setModelResults] = useState({});
    const [loading, setLoading] = useState({});
    const [historical, setHistorical] = useState(null);
    const [histLoading, setHistLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    const runModel = async (modelId) => {
        setLoading(prev => ({ ...prev, [modelId]: true }));
        try {
            const data = await api.getPredict(modelId);
            setModelResults(prev => ({ ...prev, [modelId]: data }));
        } catch (e) {
            setModelResults(prev => ({ ...prev, [modelId]: { error: e.message } }));
        } finally {
            setLoading(prev => ({ ...prev, [modelId]: false }));
        }
    };

    const runEnsemble = async () => {
        setReportLoading(true);
        try {
            const data = await api.getReport(7);
            setReportData(data);
        } catch (e) {
            setReportData({ error: e.message });
        } finally {
            setReportLoading(false);
        }
    };

    useEffect(() => {
        if (tab === 'historical' && !historical) {
            setHistLoading(true);
            api.getHistorical(2)
                .then(d => setHistorical(d))
                .catch(() => { })
                .finally(() => setHistLoading(false));
        }
    }, [tab]);

    return (
        <div className="lab-wrap">
            <div className="lab-grid-bg" />

            <div className="lab-scroll">
                {/* Header */}
                <div className="lab-head">
                    <div className="lab-head-eye">CLIMAI EXPERIMENTAL LAB</div>
                    <h1 className="lab-head-h1">ML Model Playground</h1>
                    <p className="lab-head-desc">Run and compare ClimAI's 4 ML models live. Explore historical data and ensemble predictions.</p>
                </div>

                {/* Tabs */}
                <div className="lab-tabs">
                    {[
                        { id: 'models', label: 'Model Comparison' },
                        { id: 'ensemble', label: 'Ensemble Report' },
                        { id: 'historical', label: 'Historical Explorer' },
                    ].map(t => (
                        <button key={t.id} className={`lab-tab ${tab === t.id ? 'lab-tab-active' : ''}`} onClick={() => setTab(t.id)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── MODEL COMPARISON ── */}
                {tab === 'models' && (
                    <div className="lab-section">
                        <p className="lab-section-desc">Run each ML model individually and compare 7-day temperature predictions for Chennai.</p>
                        <div className="lab-models-grid">
                            {MODELS.map(m => {
                                const result = modelResults[m.id];
                                const isLoading = loading[m.id];
                                const preds = result?.predictions || [];
                                return (
                                    <div key={m.id} className="lab-model-card">
                                        <div className="lab-model-head">
                                            <m.Icon width={20} height={20} style={{ color: m.color, flexShrink: 0 }} />
                                            <span className="lab-model-name">{m.label}</span>
                                            <button className="lab-run-btn" style={{ '--c': m.color }} onClick={() => runModel(m.id)} disabled={isLoading}>
                                                {isLoading ? <Reload width={12} height={12} /> : result ? 'Re-run' : 'Run'}
                                            </button>
                                        </div>
                                        {result?.error && <div className="lab-error"><Close width={12} height={12} /> {result.error}</div>}
                                        {preds.length > 0 && (
                                            <>
                                                <div className="lab-model-meta">
                                                    <span>Training: {result.training_days}d</span>
                                                    <span>{result.training_time_ms}ms</span>
                                                </div>
                                                <ResponsiveContainer width="100%" height={130}>
                                                    <LineChart data={preds}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                                        <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} />
                                                        <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} unit="°" domain={['auto', 'auto']} />
                                                        <Tooltip contentStyle={TT} />
                                                        <Line type="monotone" dataKey="predicted_max" name="Max" stroke={m.color} strokeWidth={2} dot={false} />
                                                        <Line type="monotone" dataKey="predicted_min" name="Min" stroke={m.color} strokeWidth={1} strokeDasharray="4 2" dot={false} opacity={0.5} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </>
                                        )}
                                        {!result && !isLoading && <div className="lab-model-empty">Click Run to execute</div>}
                                        {isLoading && <div className="lab-model-loading"><div className="lab-spin" style={{ borderTopColor: m.color }} /><span>Training on 90 days...</span></div>}
                                    </div>
                                );
                            })}
                        </div>

                        {Object.keys(modelResults).length >= 2 && (
                            <div className="lab-compare-card">
                                <div className="lab-compare-title">MAX TEMP COMPARISON — DAY 1 → DAY 7</div>
                                <div className="lab-compare-row">
                                    {MODELS.filter(m => modelResults[m.id]?.predictions?.length).map(m => {
                                        const preds = modelResults[m.id].predictions;
                                        const d1 = preds[0]?.predicted_max;
                                        const d7 = preds[preds.length - 1]?.predicted_max;
                                        const diff = d7 && d1 ? (d7 - d1).toFixed(1) : null;
                                        return (
                                            <div key={m.id} className="lab-compare-item">
                                                <m.Icon width={18} height={18} style={{ color: m.color }} />
                                                <div className="lab-compare-model" style={{ color: m.color }}>{m.label}</div>
                                                <div className="lab-compare-temps">{d1}° → {d7}°</div>
                                                {diff !== null && <div className="lab-compare-diff" style={{ color: parseFloat(diff) > 0 ? '#f87171' : '#4ade80' }}>{parseFloat(diff) > 0 ? '▲' : '▼'} {Math.abs(diff)}°</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── ENSEMBLE ── */}
                {tab === 'ensemble' && (
                    <div className="lab-section">
                        <p className="lab-section-desc">Run all 4 models simultaneously and get a consensus prediction with confidence scoring.</p>
                        <button className="lab-ensemble-btn" onClick={runEnsemble} disabled={reportLoading}>
                            {reportLoading ? <><div className="lab-spin" style={{ borderTopColor: '#3b82f6', width: 14, height: 14, marginRight: 8 }} /> Running 4 models...</> : <><ChevronRight width={16} height={16} /> Run Full Ensemble</>}
                        </button>
                        {reportData?.error && <div className="lab-error"><Close width={12} height={12} /> {reportData.error}</div>}
                        {reportData && !reportData.error && (() => {
                            const report = reportData.final_report || {};
                            const preds = report.predictions || [];
                            return (
                                <div className="lab-ens-results">
                                    <div className="lab-ens-meta">
                                        {[
                                            { label: 'CONFIDENCE', val: report.overall_confidence || '—' },
                                            { label: 'AGREEMENT', val: report.agreement_score ? (report.agreement_score * 100).toFixed(1) + '%' : '—' },
                                            { label: 'MODELS', val: reportData.models_used?.length || 4 },
                                            { label: 'COMPUTE', val: (reportData.training_data?.total_compute_ms || '—') + 'ms' },
                                        ].map((s, i) => (
                                            <div key={i} className="lab-ens-stat">
                                                <div className="lab-ens-val">{s.val}</div>
                                                <div className="lab-ens-lbl">{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={preds}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                            <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} />
                                            <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} tickLine={false} unit="°" domain={['auto', 'auto']} />
                                            <Tooltip contentStyle={TT} />
                                            <Bar dataKey="predicted_max" name="Ensemble Max °C" radius={[2, 2, 0, 0]}>
                                                {preds.map((p, i) => <Cell key={i} fill={p.confidence === 'high' ? '#3b82f6' : p.confidence === 'medium' ? '#f97316' : '#f87171'} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <div className="lab-ens-legend">
                                        <span style={{ color: '#3b82f6' }}><CheckBox width={12} height={12} /> High</span>
                                        <span style={{ color: '#f97316' }}><CheckBox width={12} height={12} /> Medium</span>
                                        <span style={{ color: '#f87171' }}><CheckBox width={12} height={12} /> Low</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* ── HISTORICAL ── */}
                {tab === 'historical' && (
                    <div className="lab-section">
                        <p className="lab-section-desc">2-year monthly temperature and rainfall averages for Chennai from Open-Meteo Archive API.</p>
                        {histLoading && <div className="lab-model-loading"><div className="lab-spin" style={{ borderTopColor: '#3b82f6' }} /><span>Fetching 2 years of archive data...</span></div>}
                        {historical && !histLoading && (() => {
                            const monthly = historical.monthly || [];
                            return (
                                <>
                                    <div className="lab-hist-period">{historical.period}</div>
                                    <div className="lab-hist-charts">
                                        <div className="lab-hist-chart-card">
                                            <div className="lab-chart-title">MONTHLY AVG TEMPERATURE (°C)</div>
                                            <ResponsiveContainer width="100%" height={180}>
                                                <LineChart data={monthly}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} tickFormatter={v => v.slice(5)} />
                                                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} unit="°" domain={['auto', 'auto']} />
                                                    <Tooltip contentStyle={TT} />
                                                    <Line type="monotone" dataKey="avg_temp_max" name="Max" stroke="#f97316" strokeWidth={2} dot={false} />
                                                    <Line type="monotone" dataKey="avg_temp_min" name="Min" stroke="#06b6d4" strokeWidth={2} dot={false} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="lab-hist-chart-card">
                                            <div className="lab-chart-title">MONTHLY TOTAL RAINFALL (mm)</div>
                                            <ResponsiveContainer width="100%" height={180}>
                                                <BarChart data={monthly}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} tickFormatter={v => v.slice(5)} />
                                                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} unit="mm" />
                                                    <Tooltip contentStyle={TT} />
                                                    <Bar dataKey="total_precip" name="Rainfall mm" fill="#3b82f6" radius={[2, 2, 0, 0]} opacity={0.8} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <table className="lab-hist-table">
                                        <thead>
                                            <tr>{['Month', 'Avg Max °C', 'Avg Min °C', 'Rain mm', 'Wind km/h'].map(h => <th key={h} className="lab-th">{h}</th>)}</tr>
                                        </thead>
                                        <tbody>
                                            {monthly.slice(-12).map((m, i) => (
                                                <tr key={i} className="lab-tr">
                                                    <td className="lab-td" style={{ color: 'rgba(255,255,255,0.3)' }}>{m.month}</td>
                                                    <td className="lab-td" style={{ color: '#f97316' }}>{m.avg_temp_max ?? '—'}</td>
                                                    <td className="lab-td" style={{ color: '#06b6d4' }}>{m.avg_temp_min ?? '—'}</td>
                                                    <td className="lab-td" style={{ color: '#3b82f6' }}>{m.total_precip ?? '—'}</td>
                                                    <td className="lab-td" style={{ color: '#a855f7' }}>{m.avg_wind ?? '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
}
