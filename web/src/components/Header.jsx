export default function Header({ activePage, onToggleActivity, activityVisible }) {
    const pageNames = {
        dashboard: 'Dashboard',
        weather: 'Temperature',
        earthquakes: 'Earthquakes',
        cyclones: 'Cyclones',
        tsunamis: 'Tsunamis',
    };

    return (
        <header
            className="h-[44px] flex items-center justify-between px-4 border-b shrink-0"
            style={{ background: '#0a0a0a', borderColor: '#1e1e1e' }}
        >
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-[12px]">
                <span style={{ color: '#555' }}>ClimAI</span>
                <span style={{ color: '#333' }}>›</span>
                <span style={{ color: '#555' }}>Data</span>
                <span style={{ color: '#333' }}>›</span>
                <span style={{ color: '#e5e5e5' }}>{pageNames[activePage] || 'Dashboard'}</span>
            </div>

            {/* Center - Search */}
            <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] min-w-[280px]"
                style={{ background: '#111', border: '1px solid #1e1e1e', color: '#555' }}
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Query climate data…</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#1a1a1a', color: '#555' }}>⌘K</span>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
                <button className="btn-green btn text-[11px] py-1 px-3">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                    Run
                </button>

                <div className="flex items-center gap-1.5 ml-2">
                    {/* Mini avatars */}
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px]"
                            style={{ background: ['#3b82f6', '#a855f7', '#f97316'][i - 1] }}>
                            {['C', 'A', 'I'][i - 1]}
                        </div>
                    ))}
                </div>

                <button
                    onClick={onToggleActivity}
                    className="w-6 h-6 flex items-center justify-center rounded"
                    style={{ color: activityVisible ? '#e5e5e5' : '#555' }}
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </button>

                <div className="text-[10px] ml-1" style={{ color: '#444' }}>
                    0+148...347 ▼
                </div>
            </div>
        </header>
    );
}
