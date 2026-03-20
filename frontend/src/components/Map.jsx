export default function Map({ earthquakes }) {
    const events = earthquakes?.events || [];

    return (
        <div className="bg-[#111111] border border-[#262626] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="text-[14px] font-semibold text-white">Earthquake Activity Map</div>
                    <div className="text-[11px] text-[#9CA3AF]">Global seismic events · Last 30 days</div>
                </div>
                {earthquakes?.summary && (
                    <div className="flex gap-4">
                        <div className="text-right">
                            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Events</div>
                            <div className="text-[16px] font-bold text-white">{earthquakes.summary.total}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Max Mag</div>
                            <div className="text-[16px] font-bold text-[#EF4444]">{earthquakes.summary.max_magnitude}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Avg Depth</div>
                            <div className="text-[16px] font-bold text-[#F59E0B]">{earthquakes.summary.avg_depth} km</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Map visualization using SVG */}
            <div className="relative h-[500px] bg-[#0B0B0B] rounded-lg border border-[#262626] overflow-hidden">
                <svg viewBox="-180 -90 360 180" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                    {/* Simple world outline */}
                    <rect x="-180" y="-90" width="360" height="180" fill="#0B0B0B" />

                    {/* Grid lines */}
                    {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(x => (
                        <line key={`v${x}`} x1={x} y1="-90" x2={x} y2="90" stroke="#1a1a1a" strokeWidth="0.3" />
                    ))}
                    {[-60, -30, 0, 30, 60].map(y => (
                        <line key={`h${y}`} x1="-180" y1={y} x2="180" y2={y} stroke="#1a1a1a" strokeWidth="0.3" />
                    ))}

                    {/* Continent outlines (simplified) */}
                    {/* North America */}
                    <path d="M-160,-10 L-130,-60 L-120,-70 L-100,-55 L-80,-40 L-60,-30 L-80,-10 L-100,0 L-120,5 L-140,0 Z"
                        fill="#1a1a1a" stroke="#262626" strokeWidth="0.5" />
                    {/* South America */}
                    <path d="M-80,-10 L-60,-5 L-40,10 L-35,30 L-40,45 L-55,55 L-70,50 L-75,35 L-80,15 Z"
                        fill="#1a1a1a" stroke="#262626" strokeWidth="0.5" />
                    {/* Europe */}
                    <path d="M-10,-35 L0,-45 L10,-50 L20,-55 L30,-50 L40,-45 L30,-35 L20,-30 L10,-30 L0,-35 Z"
                        fill="#1a1a1a" stroke="#262626" strokeWidth="0.5" />
                    {/* Africa */}
                    <path d="M-10,-30 L0,-25 L10,-20 L20,-15 L25,0 L30,15 L25,30 L15,35 L5,30 L0,20 L-5,10 L-10,0 L-15,-15 Z"
                        fill="#1a1a1a" stroke="#262626" strokeWidth="0.5" />
                    {/* Asia */}
                    <path d="M30,-50 L60,-55 L80,-50 L100,-40 L120,-30 L140,-20 L150,-30 L140,-45 L120,-50 L100,-55 L80,-60 L60,-60 L40,-55 Z"
                        fill="#1a1a1a" stroke="#262626" strokeWidth="0.5" />
                    {/* India */}
                    <path d="M65,-5 L75,-10 L85,-5 L80,10 L75,15 L70,10 Z"
                        fill="#222222" stroke="#262626" strokeWidth="0.5" />
                    {/* Australia */}
                    <path d="M110,15 L130,15 L140,25 L135,35 L120,35 L110,30 L115,20 Z"
                        fill="#1a1a1a" stroke="#262626" strokeWidth="0.5" />

                    {/* Earthquake dots */}
                    {events.map((eq, i) => {
                        const x = eq.longitude;
                        const y = -eq.latitude; // SVG y is inverted
                        const r = Math.max(1.5, (eq.magnitude - 3) * 1.2);
                        const opacity = Math.min(0.9, 0.3 + (eq.magnitude - 4) * 0.15);
                        const color = eq.magnitude >= 6.5 ? '#EF4444'
                            : eq.magnitude >= 5.5 ? '#F59E0B'
                                : '#22C55E';
                        return (
                            <g key={i}>
                                <circle cx={x} cy={y} r={r * 2} fill={color} opacity={opacity * 0.2} />
                                <circle cx={x} cy={y} r={r} fill={color} opacity={opacity} />
                            </g>
                        );
                    })}
                </svg>

                {/* Legend */}
                <div className="absolute bottom-3 right-3 bg-[#111111] border border-[#262626] rounded-lg p-3">
                    <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-2">Magnitude</div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#22C55E]" /><span className="text-[10px] text-[#9CA3AF]">4.5 - 5.5</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /><span className="text-[10px] text-[#9CA3AF]">5.5 - 6.5</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#EF4444]" /><span className="text-[10px] text-[#9CA3AF]">6.5+</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Event Table */}
            {events.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-[12px]">
                        <thead>
                            <tr className="border-b border-[#262626]">
                                <th className="text-left py-2 text-[#9CA3AF] font-medium uppercase tracking-wider text-[10px]">Location</th>
                                <th className="text-right py-2 text-[#9CA3AF] font-medium uppercase tracking-wider text-[10px]">Magnitude</th>
                                <th className="text-right py-2 text-[#9CA3AF] font-medium uppercase tracking-wider text-[10px]">Depth</th>
                                <th className="text-right py-2 text-[#9CA3AF] font-medium uppercase tracking-wider text-[10px]">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.slice(0, 8).map((eq, i) => (
                                <tr key={i} className="border-b border-[#262626]/50 hover:bg-[#1a1a1a] transition-colors">
                                    <td className="py-2 text-white">{eq.place}</td>
                                    <td className="py-2 text-right">
                                        <span className={`font-semibold ${eq.magnitude >= 6 ? 'text-[#EF4444]' : eq.magnitude >= 5 ? 'text-[#F59E0B]' : 'text-[#22C55E]'}`}>
                                            {eq.magnitude?.toFixed(1)}
                                        </span>
                                    </td>
                                    <td className="py-2 text-right text-[#9CA3AF]">{eq.depth_km?.toFixed(0)} km</td>
                                    <td className="py-2 text-right text-[#9CA3AF]">
                                        {eq.time ? new Date(eq.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
