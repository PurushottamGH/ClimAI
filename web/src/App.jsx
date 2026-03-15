import { useState, useEffect } from 'react';
import WorldMap from './components/WorldMap';

import CategoryToggle from './components/CategoryToggle';
import EarthquakeCharts from './components/EarthquakeCharts';
import TsunamiCharts from './components/TsunamiCharts';
import TemperatureCharts from './components/TemperatureCharts';
import EventsTimeline from './components/EventsTimeline';
import XaiPanel from './components/XaiPanel';
import TopNavigation from './components/TopNavigation';
import { api } from './api';
import './layout.css';

export default function App() {
  const [mainView, setMainView] = useState('overview'); // Controls top nav (Overview, Events, xAI, Lab, About)
  const [category, setCategory] = useState('earthquake'); // Controls bottom panel within Overview
  const [quakeData, setQuakeData] = useState([]);
  const [cycloneData, setCycloneData] = useState([]);
  const [tsunamiData, setTsunamiData] = useState([]);
  const [tempData, setTempData] = useState([]);
  const [tempMapData, setTempMapData] = useState([]);
  const [selectedCyclone, setSelectedCyclone] = useState('All');


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
      />

      <TopNavigation activeView={mainView} onChangeView={setMainView} />

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
        </div>
        <div className={`panel-bottom ${category === 'earthquake' ? 'eq-dashboard-active' : ''}`}>
          {category === 'earthquake' && <EarthquakeCharts data={quakeData} />}
          {category === 'cyclone' && <CycloneCharts data={cycloneData} />}
          {category === 'tsunami' && <TsunamiCharts data={tsunamiData} />}
          {category === 'temperature' && <TemperatureCharts data={tempData} />}
        </div>
      </div>
      )}

      {mainView === 'events' && <EventsTimeline />}
      
      {/* We keep the XaiPanel prop structure but adapt it to be full screen via mainView state */}
      {mainView === 'xai' && <XaiPanel open={true} onClose={() => setMainView('overview')} />}
      
      {/* Placeholders for Lab and About */}
      {(mainView === 'lab' || mainView === 'about') && (
          <div className="events-timeline-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
             <h2 className="events-title" style={{ fontSize: '32px' }}>{mainView.toUpperCase()}</h2>
             <p className="events-subtitle">This module is currently in development.</p>
          </div>
      )}

    </div>
  );
}
