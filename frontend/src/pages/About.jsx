import { useEffect, useRef } from 'react';
import { Cloud as CloudRain, ZapOff, Globe, Heart, ArrowRight, User, Terminal as Code, Database, Cpu, ChevronRight } from 'pixelarticons/react';

const PIPELINE = [
    { step: '01', label: 'PLANNER', desc: 'LLM-powered intent classification with typo tolerance and context extraction', color: '#3b82f6', Icon: Cpu },
    { step: '02', label: 'EXECUTOR', desc: 'Routes to correct APIs — Open-Meteo, USGS, NOAA — based on detected intent', color: '#06b6d4', Icon: Database },
    { step: '03', label: 'ML ENSEMBLE', desc: '4 models in parallel: RF, XGBoost, LightGBM, NumPy LSTM with consensus scoring', color: '#8b5cf6', Icon: ChevronRight },
    { step: '04', label: 'CRITIC', desc: 'Self-review validates data integrity and flags anomalies before output', color: '#f97316', Icon: ZapOff },
    { step: '05', label: 'GROQ LLM', desc: 'LLaMA 3.3 70B synthesizes all data into natural language intelligence reports', color: '#4ade80', Icon: Globe },
];

const TECH_STACK = [
    { category: 'Frontend', color: '#3b82f6', items: ['React', 'Vite', 'Recharts', 'TailwindCSS'] },
    { category: 'Backend', color: '#06b6d4', items: ['FastAPI', 'Python 3.10', 'Uvicorn', 'Docker'] },
    { category: 'AI / ML', color: '#8b5cf6', items: ['Groq LLaMA 3.3 70B', 'Random Forest', 'XGBoost', 'LightGBM', 'NumPy LSTM'] },
    { category: 'Data Sources', color: '#f97316', items: ['Open-Meteo API', 'USGS Earthquake', 'NOAA IBTrACS', 'NOAA Tsunami DB'] },
    { category: 'Infrastructure', color: '#4ade80', items: ['Hugging Face Spaces', 'Vercel', 'GitHub'] },
];

const SOURCES = [
    { name: 'Open-Meteo', desc: 'Real-time & historical weather for Chennai. Free, no key required.', Icon: CloudRain, color: '#3b82f6' },
    { name: 'USGS Earthquake API', desc: 'Live global seismic data with magnitude filtering and depth analysis.', Icon: ZapOff, color: '#f97316' },
    { name: 'NOAA IBTrACS', desc: 'Historical cyclone track data for Bay of Bengal — 2010 to present.', Icon: Globe, color: '#8b5cf6' },
    { name: 'NOAA Tsunami DB', desc: 'Historical Indian Ocean tsunami events with wave height records.', Icon: Database, color: '#06b6d4' },
];

const STATS = [
    { value: '5', label: 'Data Sources' },
    { value: '4', label: 'ML Models' },
    { value: '7', label: 'Intents' },
    { value: '10+', label: 'API Endpoints' },
];

export default function About() {
    const ref = useRef(null);

    useEffect(() => {
        const els = ref.current?.querySelectorAll('.about-reveal');
        if (!els) return;
        const obs = new IntersectionObserver(
            entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('about-visible'); }),
            { threshold: 0.08 }
        );
        els.forEach(el => obs.observe(el));
        return () => obs.disconnect();
    }, []);

    return (
        <div className="about-wrap" ref={ref}>
            <div className="about-grid-bg" />
            <div className="about-orb about-orb-1" />
            <div className="about-orb about-orb-2" />

            <div className="about-scroll">

                {/* HERO */}
                <section className="about-hero about-reveal">
                    <div className="about-eyebrow">CLIMAI — WEATHER INTELLIGENCE PLATFORM</div>
                    <h1 className="about-h1">
                        Disaster intelligence<br />
                        <span className="about-h1-accent">for Chennai, India</span>
                    </h1>
                    <p className="about-lead">
                        ClimAI is a real-time disaster and weather intelligence system combining
                        live meteorological APIs, machine learning ensembles, and large language models
                        to answer complex climate queries in natural language.
                    </p>
                    <div className="about-stats">
                        {STATS.map((s, i) => (
                            <div key={i} className="about-stat">
                                <div className="about-stat-val">{s.value}</div>
                                <div className="about-stat-lbl">{s.label}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* PIPELINE */}
                <section className="about-section about-reveal">
                    <div className="about-section-eye">HOW IT WORKS</div>
                    <h2 className="about-h2">The Intelligence Pipeline</h2>
                    <div className="about-pipeline">
                        {PIPELINE.map((p, i) => (
                            <div key={i} className="about-pipe-step">
                                <div className="about-pipe-icon" style={{ color: p.color }}>
                                    <p.Icon width={32} height={32} />
                                </div>
                                <div className="about-pipe-body">
                                    <div className="about-pipe-num" style={{ color: p.color }}>{p.step}</div>
                                    <div className="about-pipe-label" style={{ color: p.color }}>{p.label}</div>
                                    <div className="about-pipe-desc">{p.desc}</div>
                                </div>
                                {i < PIPELINE.length - 1 && (
                                    <div className="about-pipe-arrow">
                                        <ArrowRight width={20} height={20} style={{ color: 'rgba(255,255,255,0.15)' }} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* TECH STACK */}
                <section className="about-section about-reveal">
                    <div className="about-section-eye">TECHNOLOGY</div>
                    <h2 className="about-h2">Built With</h2>
                    <div className="about-tech-grid">
                        {TECH_STACK.map((g, i) => (
                            <div key={i} className="about-tech-card">
                                <div className="about-tech-cat" style={{ color: g.color }}>{g.category}</div>
                                <div className="about-tech-tags">
                                    {g.items.map((item, j) => (
                                        <span key={j} className="about-tech-tag" style={{ borderColor: `${g.color}22`, color: `${g.color}cc` }}>{item}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CREATOR */}
                <section className="about-section about-reveal">
                    <div className="about-section-eye">CREATOR</div>
                    <div className="about-creator">
                        <div className="about-creator-avatar">
                            <User width={28} height={28} style={{ color: '#fff' }} />
                        </div>
                        <div className="about-creator-body">
                            <div className="about-creator-name">Purushottam</div>
                            <div className="about-creator-role">Data Science Student · Content Creator · Builder</div>
                            <div className="about-creator-desc">
                                Built ClimAI as a full-stack AI project combining data science,
                                machine learning, LLM orchestration, and modern frontend engineering.
                                Chennai-focused disaster intelligence that's genuinely useful.
                            </div>
                            <a href="https://github.com/PurushottamGH/ClimAI" target="_blank" rel="noopener noreferrer" className="about-creator-link">
                                <Code width={16} height={16} />
                                View on GitHub
                            </a>
                        </div>
                    </div>
                </section>

                {/* DATA SOURCES */}
                <section className="about-section about-reveal">
                    <div className="about-section-eye">DATA INTEGRITY</div>
                    <h2 className="about-h2">Real Data, Real Intelligence</h2>
                    <div className="about-sources">
                        {SOURCES.map((s, i) => (
                            <div key={i} className="about-source-card">
                                <div className="about-source-icon" style={{ color: s.color }}>
                                    <s.Icon width={36} height={36} />
                                </div>
                                <div className="about-source-name">{s.name}</div>
                                <div className="about-source-desc">{s.desc}</div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="about-footer-line">
                    <Heart width={14} height={14} style={{ color: '#f87171' }} />
                    ClimAI v3.5 · Chennai, India · Built by Purushottam
                </div>
            </div>
        </div>
    );
}
