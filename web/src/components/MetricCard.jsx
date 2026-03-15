export default function MetricCard({ label, value, unit, icon }) {
    return (
        <div className="clim-card flex flex-col justify-center h-[95px]">
            <div className="text-[12px] font-medium mb-1" style={{ color: '#8b949e' }}>
                {icon && <span className="mr-1">{icon}</span>}{label}
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-[1.8rem] font-bold text-white leading-none">{value}</span>
                {unit && <span className="text-[13px]" style={{ color: '#8b949e' }}>{unit}</span>}
            </div>
        </div>
    );
}
