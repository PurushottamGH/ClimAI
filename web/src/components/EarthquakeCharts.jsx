import { useMemo, useState, useEffect } from 'react';
import './EarthquakeCharts.css';

// ── Custom Hook for Animated Numbers ──
function useCountUp(endValue, duration = 1500, decimals = 0) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime = null;
        let animationFrame;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            const easeOut = 1 - Math.pow(1 - percentage, 4);
            setCount(endValue * easeOut);
            if (percentage < 1) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                setCount(endValue);
            }
        };
        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [endValue, duration]);

    return count;
}

export default function EarthquakeCharts({ data = [] }) {
    // ── 1. Top Metrics Processing ──
    const totalCount = data.length;
    const maxMag = data.reduce((max, eq) => Math.max(max, eq.magnitude), 0);
    const riskFactor = useMemo(() => {
        if (!data.length) return 0;
        const highMagCount = data.filter(d => d.magnitude > 5.0).length;
        // Scale to 0-10 based on heuristic
        const score = ((highMagCount / data.length) * 10) + (maxMag);
        return Math.min(Math.max(score, 0), 10);
    }, [data, maxMag]);

    // Animated values
    const animCount = useCountUp(totalCount, 1500, 0);
    const animMaxMag = useCountUp(maxMag, 1500, 1);
    const animRisk = useCountUp(riskFactor, 1500, 1);

    // Format count to split commas (e.g. 1,247)
    const formattedCount = useMemo(() => {
        const parts = Math.floor(animCount).toLocaleString().split(',');
        if (parts.length === 1) {
            return <span className="eq-c1-big">{parts[0]}</span>;
        }
        return (
            <>
                <span className="eq-c1-big">{parts[0]}</span>
                <span className="eq-c1-sep">,</span>
                <span className="eq-c1-big">{parts[1]}</span>
            </>
        );
    }, [animCount]);

    // Format Magnitude
    const formattedMag = useMemo(() => {
        const val = animMaxMag.toFixed(1);
        const parts = val.split('.');
        return (
            <div className="eq-c2-mag">
                {parts[0]}<span className="eq-c2-mag-sub">.{parts[1]}</span>
            </div>
        );
    }, [animMaxMag]);

    // Format Risk
    const formattedRisk = animRisk.toFixed(1);

    // ── 2. Waveform Visualizer Logic ──
    const waveformElements = useMemo(() => {
        if (!data.length) return null;

        // Take up to 50 recent earthquake magnitudes to populate the waveform
        const recentMags = [...data]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 50)
            .map(eq => eq.magnitude);

        // If we don't have 50, pad with smaller numbers for visual integrity
        while (recentMags.length < 50) {
            recentMags.push(1.0 + Math.random() * 2);
        }

        const maxH = 84; // Max height in pixels from CSS
        const maxExpectedMag = 8.0; // Normalizer

        return recentMags.map((mag, i) => {
            // Map magnitude to height
            const h = Math.min((mag / maxExpectedMag) * maxH, maxH);
            const ratio = h / maxH;

            // Map to colors provided in source
            const r = Math.round(55 + ratio * 195);
            const g = Math.round(78 - ratio * 52);
            const bv = Math.round(98 - ratio * 78);
            const bgColor = `rgba(${r},${g},${bv},${0.28 + ratio * 0.70})`;

            // Apply animation only to higher spikes
            const shouldAnimate = ratio > 0.68;
            const animDu = (1.6 + Math.random() * 1.2).toFixed(2);
            const animName = shouldAnimate ? `waveSway ${animDu}s ease-in-out infinite` : 'none';
            const animDel = (i * 0.028).toFixed(3) + 's';

            return (
                <div
                    key={i}
                    className="eq-wb"
                    style={{
                        height: `${h}px`,
                        background: bgColor,
                        animation: animName,
                        animationDelay: animDel,
                    }}
                />
            );
        });
    }, [data]);

    return (
        <div className="eq-dashboard-container">
            <p className="eq-eyebrow">Global Seismic Intelligence Network · Real-Time</p>

            <div className="eq-wrap">
                {/* ══════════════════════════════════════
                    CARD 1 — TOTAL EARTHQUAKES DETECTED
               ══════════════════════════════════════ */}
                <div className="eq-card eq-c1">
                    <div className="eq-hdr">
                        <div className="eq-hdr-side">Seismic<br />Monitor</div>
                        <div className="eq-hdr-brand">QUAKE<br />WATCH</div>
                        <div className="eq-hdr-side right">V/<br />2025</div>
                    </div>
                    <div className="eq-rule"></div>

                    <div className="eq-body">
                        <p className="eq-c1-tagline">Every tremor tells a story.<br />Precision tracking across all<br />tectonic boundaries, 24 / 7.</p>

                        <div className="eq-c1-metric">
                            {formattedCount}
                        </div>

                        <div className="eq-c1-pill">DETECTED</div>

                        <div className="eq-c1-tags">
                            <span className="eq-tag">GLOBAL</span>
                            <span className="eq-tag">24-HR</span>
                            <span className="eq-tag-plus">+</span>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════
                    CARD 2 — STRONGEST MAGNITUDE
               ══════════════════════════════════════ */}
                <div className="eq-card eq-c2">
                    <div className="eq-c2-lines"></div>

                    <div className="eq-hdr">
                        <div className="eq-hdr-side">Seismic<br />Monitor</div>
                        <div className="eq-hdr-brand">QUAKE<br />WATCH</div>
                        <div className="eq-hdr-side right">V/<br />2025</div>
                    </div>
                    <div className="eq-rule"></div>

                    <div className="eq-body">
                        <div className="eq-c2-hex-wrap">
                            <div className="eq-c2-hex">
                                {formattedMag}
                            </div>
                        </div>

                        <p className="eq-c2-desc">Strongest recorded event.<br />Every decimal marks a<br />threshold of consequence.</p>

                        <div className="eq-c2-tags">
                            <span className="eq-tag eq-t-red">MAJOR</span>
                            <span className="eq-tag eq-t-green">PACIFIC</span>
                            <span className="eq-tag-plus">+</span>
                        </div>
                    </div>
                </div>

                {/* ══════════════════════════════════════
                    CARD 3 — SEISMIC RISK INDEX
               ══════════════════════════════════════ */}
                <div className="eq-card eq-c3">
                    <div className="eq-hdr">
                        <div className="eq-hdr-side"></div>
                        <div className="eq-hdr-brand"></div>
                        <div className="eq-hdr-side right"></div>
                    </div>
                    <div className="eq-rule"></div>

                    <div className="eq-body">
                        <div className="eq-c3-top">
                            <div className="eq-c3-label">Seismic risk<br />index score<br />this month</div>
                            <div className="eq-c3-bigrow">
                                <span className="eq-c3-arrow">↑</span>
                                <span className="eq-c3-num">{formattedRisk}</span>
                                <span className="eq-c3-unit">/10</span>
                            </div>
                        </div>

                        <div className="eq-waveform">
                            {waveformElements}
                        </div>

                        <div className="eq-c3-footer">
                            <div className="eq-c3-tags">
                                <span className="eq-tag eq-t-red">ALERT</span>
                                <span className="eq-tag eq-t-default">ANALYSIS</span>
                                <span className="eq-tag-plus">+</span>
                            </div>
                            <div className="eq-c3-bottom">
                                <div className="eq-c3-brand">QUAKE<br />WATCH</div>
                                <div className="eq-c3-brand-right">Seismic<br />Monitor<br />Y/25</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
