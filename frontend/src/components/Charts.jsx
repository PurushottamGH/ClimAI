import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const chartTooltipStyle = {
    backgroundColor: '#111111',
    border: '1px solid #262626',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '12px',
    padding: '8px 12px',
};

export function TemperatureChart({ data }) {
    if (!data || data.length === 0) {
        return <ChartPlaceholder title="7-Day Temperature Forecast" />;
    }

    return (
        <div className="bg-[#111111] border border-[#262626] rounded-xl p-5">
            <div className="text-[14px] font-semibold text-white mb-1">7-Day Temperature Forecast</div>
            <div className="text-[11px] text-[#9CA3AF] mb-4">Chennai, India · Daily High/Low</div>
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="day" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} unit="°C" />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#9CA3AF' }} />
                    <Line
                        type="monotone" dataKey="temp_max" name="High"
                        stroke="#22C55E" strokeWidth={2} dot={{ r: 4, fill: '#22C55E' }}
                    />
                    <Line
                        type="monotone" dataKey="temp_min" name="Low"
                        stroke="#3B82F6" strokeWidth={2} dot={{ r: 4, fill: '#3B82F6' }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export function WindChart({ data }) {
    if (!data || data.length === 0) {
        return <ChartPlaceholder title="Wind Speed Forecast" />;
    }

    return (
        <div className="bg-[#111111] border border-[#262626] rounded-xl p-5">
            <div className="text-[14px] font-semibold text-white mb-1">Wind Speed Forecast</div>
            <div className="text-[11px] text-[#9CA3AF] mb-4">Chennai, India · Daily Max Wind</div>
            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="day" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} unit=" km/h" />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="wind_speed_max" name="Wind Speed" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function ChartPlaceholder({ title }) {
    return (
        <div className="bg-[#111111] border border-[#262626] rounded-xl p-5">
            <div className="text-[14px] font-semibold text-white mb-1">{title}</div>
            <div className="h-[280px] flex items-center justify-center text-[#9CA3AF] text-[13px]">
                <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 animate-spin text-[#262626]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading data...
                </div>
            </div>
        </div>
    );
}
