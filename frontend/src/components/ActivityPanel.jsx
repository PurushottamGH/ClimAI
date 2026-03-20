import { useState, useEffect } from 'react';
import { api } from '../api';

const activityTypes = [
    { type: 'Subtraction', color: '#999', icon: '−' },
    { type: 'Cancellation', color: '#ef4444', icon: '✕' },
    { type: 'Addition', color: '#22c55e', icon: '+' },
    { type: 'Reschedule', color: '#3b82f6', icon: '↻' },
];

export default function ActivityPanel() {
    const [activities, setActivities] = useState([]);

    useEffect(() => {
        // Generate activity feed from data sources
        const sources = ['Open-Meteo', 'USGS', 'NOAA', 'IBTrACS'];
        const actions = ['Data sync', 'Cache refresh', 'API call', 'Model update', 'Prediction run'];
        const generated = [];

        for (let i = 0; i < 15; i++) {
            const typeInfo = activityTypes[i % activityTypes.length];
            const source = sources[i % sources.length];
            const action = actions[i % actions.length];
            const minutesAgo = i * 12 + Math.floor(Math.random() * 10);
            const timeStr = minutesAgo < 60
                ? `${minutesAgo}m ago`
                : minutesAgo < 1440
                    ? `${Math.floor(minutesAgo / 60)}h ago`
                    : `${Math.floor(minutesAgo / 1440)}d ago`;

            generated.push({
                id: i,
                type: typeInfo.type,
                color: typeInfo.color,
                icon: typeInfo.icon,
                title: `#${342 - i}: ${action}`,
                source: `@${source.toLowerCase().replace('-', '_')}`,
                desc: 'data update',
                tag: source,
                time: timeStr,
            });
        }

        setActivities(generated);
    }, []);

    return (
        <aside
            className="flex flex-col h-full border-l flex-shrink-0 overflow-hidden"
            style={{ width: 260, background: '#0a0a0a', borderColor: '#1e1e1e' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: '#1e1e1e' }}>
                <span className="text-[12px] font-medium" style={{ color: '#e5e5e5' }}>Resource Activity</span>
                <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="#555" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="#555" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                    </svg>
                </div>
            </div>

            {/* Activities */}
            <div className="flex-1 overflow-y-auto px-3 py-1">
                {activities.map((a) => (
                    <div key={a.id} className="activity-item">
                        {/* Type indicator */}
                        <div className="flex flex-col items-center gap-1 pt-0.5" style={{ minWidth: 14 }}>
                            <span
                                className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold"
                                style={{ background: `${a.color}20`, color: a.color }}
                            >
                                {a.icon}
                            </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-medium" style={{ color: a.color }}>
                                {a.type}
                            </div>
                            <div className="text-[10px] mt-0.5" style={{ color: '#888' }}>
                                {a.title}
                            </div>
                            <div className="text-[10px]" style={{ color: '#555' }}>
                                {a.source} · <span style={{ color: '#666' }}>{a.desc}</span>
                            </div>
                        </div>

                        {/* Time */}
                        <div className="text-[9px] flex-shrink-0 pt-0.5" style={{ color: '#444' }}>
                            {a.time}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}
