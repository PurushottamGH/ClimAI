import { useState, useEffect } from 'react';
import WorldMap from './components/WorldMap';
import CategoryToggle from './components/CategoryToggle';
import EarthquakeCharts from './components/EarthquakeCharts';
import CycloneCharts from './components/CycloneCharts';
import TsunamiCharts from './components/TsunamiCharts';
import TemperatureCharts from './components/TemperatureCharts';
import Weather from './pages/Weather';
import EventsTimeline from './components/EventsTimeline';
import XaiPanel from './components/XaiPanel';
import TopNavigation from './components/TopNavigation';
import About from './pages/About';
import Lab from './pages/Lab';
import { api } from './api';
import './layout.css';

export default function App() {
  const [mainView, setMainView] = useState('overview');
  const [category, setCategory] = useState('earthquake');
  const [quakeData, setQuakeData] = useState([]);
  const [cycloneData, setCycloneData] = useState([]);
  const [tsunamiData, setTsunamiData] = useState([]);
  const [tempData, setTempData] = useState([]);
  const [tempMapData, setTempMapData] = useState([]);
  const [selectedCyclone, setSelectedCyclone] = useState('All');
  const [weatherTab, setWeatherTab] = useState('Overview');
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    api.getEarthquakes()
      .then(data => { if (data && data.events) setQuakeData(data.events); })
      .catch(() => setQuakeData([]));

    api.getCyclones()
      .then(data => { if (data && data.cyclones) setCycloneData(data.cyclones); })
      .catch(() => setCycloneData([]));

    api.getTsunamis()
      .then(data => { if (data && data.events) setTsunamiData(data.events); })
      .catch(() => setTsunamiData([]));

    api.getHistorical(5)
      .then(data => { if (data && data.monthly) setTempData(data.monthly); })
      .catch(() => setTempData([]));

    api.getTemperatureMap()
      .then(data => { if (data && data.points) setTempMapData(data.points); })
      .catch(() => setTempMapData([]));
  }, []);

  const filteredCyclones = selectedCyclone === 'All'
    ? cycloneData
    : cycloneData.filter(c => c.name === selectedCyclone);

  return (
    <div className="app-layout">
      <WorldMap
        category={category}
        earthquakes={quakeData}
        cyclones={filteredCyclones}
        tsunamis={tsunamiData}
        tempMapData={tempMapData}
        isAnimating={isAnimating}
      />

      <TopNavigation activeView={mainView} onChangeView={setMainView} />

      {/* ── OVERVIEW ── */}
      {mainView === 'overview' && (
        <div className="panel-bottom-wrapper">
          <div className="toggle-row">
            <CategoryToggle active={category} onChange={(cat) => { setCategory(cat); setSelectedCyclone('All'); }} />
            {category === 'cyclone' && (
              <div className="cyclone-select-wrapper" style={{ position: 'relative' }}>
                <select
                  value={selectedCyclone}
                  onChange={(e) => setSelectedCyclone(e.target.value)}
                  className="cyclone-select"
                >
                  <option value="All">All Cyclones</option>
                  {cycloneData.map(c => (
                    <option key={c.name} value={c.name}>{c.name} ({c.year})</option>
                  ))}
                </select>
                <svg className="cyclone-select-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            {category === 'cyclone' && (
              <button 
                className="anim-control-btn" 
                onClick={() => setIsAnimating(!isAnimating)}
                title={isAnimating ? "Pause Animation" : "Play Animation"}
              >
                {isAnimating ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            )}
            {category === 'weather' && (
              <div className="cyclone-select-wrapper" style={{ position: 'relative' }}>
                <select
                  value={weatherTab}
                  onChange={(e) => setWeatherTab(e.target.value)}
                  className="cyclone-select"
                >
                  {['Overview', 'Temperature', 'Air Quality', 'Flood Risk', 'Wind', 'Seasonal'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <svg className="cyclone-select-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <div className={`panel-bottom ${category === 'earthquake' ? 'eq-dashboard-active' : ''} ${category === 'weather' ? 'weather-active' : ''}`}>
            {category === 'earthquake' && <EarthquakeCharts data={quakeData} />}
            {category === 'cyclone' && <CycloneCharts data={cycloneData} />}
            {category === 'tsunami' && <TsunamiCharts data={tsunamiData} />}
            {category === 'weather' && <Weather activeTab={weatherTab} />}
            {category === 'temperature' && <TemperatureCharts data={tempData} />}
          </div>
        </div>
      )}

      {/* ── EVENTS ── */}
      {mainView === 'events' && <EventsTimeline />}

      {/* ── XAI ── */}
      {mainView === 'xai' && <XaiPanel open={true} onClose={() => setMainView('overview')} />}

      {/* ── ABOUT ── */}
      {mainView === 'about' && <About />}

      {/* ── LAB ── */}
      {mainView === 'lab' && <Lab />}
    </div>
  );
}