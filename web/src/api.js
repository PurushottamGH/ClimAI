import axios from 'axios';

const API_BASE = '/api';

axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

export const api = {
    getWeather: () => axios.get(`${API_BASE}/weather`).then(r => r.data),
    getForecast: () => axios.get(`${API_BASE}/forecast`).then(r => r.data),
    getHistorical: (years = 5) => axios.get(`${API_BASE}/historical?years=${years}`).then(r => r.data),
    getPredict: (model = 'random_forest') => axios.get(`${API_BASE}/predict?model=${model}`).then(r => r.data),
    getEarthquakes: (minMag = 4.5, days = 30) =>
        axios.get(`${API_BASE}/earthquakes?min_magnitude=${minMag}&days=${days}`).then(r => r.data),
    getCyclones: () => axios.get(`${API_BASE}/cyclones`).then(r => r.data),
    getTsunamis: () => axios.get(`${API_BASE}/tsunamis`).then(r => r.data),
    getTemperatureMap: () => axios.get(`${API_BASE}/temperature-map`).then(r => r.data),
    getReport: (days = 7) => axios.get(`${API_BASE}/report?days=${days}`).then(r => r.data),
    askClimAI: (query) => axios.get(`${API_BASE}/ask?q=${encodeURIComponent(query)}`).then(r => r.data),
};
