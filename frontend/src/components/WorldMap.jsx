import { useState, useMemo, useEffect } from 'react';
import Map from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PathLayer, IconLayer } from '@deck.gl/layers';
import WikiCard from './WikiCard';
import 'maplibre-gl/dist/maplibre-gl.css';
import './WorldMap.css';

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const INITIAL_VIEW_STATE = {
  longitude: 0,
  latitude: 20,
  zoom: 1.5,
  pitch: 0,
  bearing: 0
};

// ═══════════════════════════════
// EARTHQUAKE helpers
// ═══════════════════════════════
function getMagColorArr(mag) {
  if (mag >= 6.5) return [252, 255, 164];
  if (mag >= 6.0) return [247, 209, 61];
  if (mag >= 5.5) return [251, 155, 6];
  if (mag >= 5.0) return [237, 105, 37];
  if (mag >= 4.8) return [188, 55, 84];
  if (mag >= 4.5) return [140, 41, 129];
  if (mag >= 4.2) return [87, 16, 110];
  return [13, 8, 135];
}

function getMagRadiusSq(mag) {
  if (mag >= 7.0) return 250000;
  if (mag >= 6.0) return 150000;
  if (mag >= 5.5) return 80000;
  if (mag >= 5.0) return 50000;
  return 30000;
}

// ═══════════════════════════════
// CYCLONE helpers
// ═══════════════════════════════
function getCycloneCatColorArr(cat) {
  if (cat.includes('Very Severe')) return [245, 183, 197];
  if (cat.includes('Severe')) return [91, 155, 213];
  return [127, 200, 248];
}

// ═══════════════════════════════
// TSUNAMI helpers
// ═══════════════════════════════
function getTsunamiMagColorArr(mag) {
  if (mag <= 0) return [136, 136, 136];
  if (mag >= 9.0) return [252, 255, 164];
  if (mag >= 8.8) return [240, 249, 33];
  if (mag >= 8.6) return [160, 218, 57];
  if (mag >= 8.4) return [74, 193, 109];
  if (mag >= 8.2) return [31, 161, 135];
  if (mag >= 8.0) return [39, 127, 142];
  if (mag >= 7.8) return [54, 92, 141];
  return [68, 1, 84];
}

// ═══════════════════════════════════════════════════
// TEMPERATURE DOT-GRID helpers
// Smooth multi-stop gradient: blue → cyan → green → yellow → orange → red → darkred
// ═══════════════════════════════════════════════════
function getTempColor(temp) {
  // Color stops: [temp, R, G, B]
  const stops = [
    [-40, 20, 0, 80],      // deep indigo
    [-25, 40, 20, 170],     // dark blue
    [-10, 50, 80, 220],     // blue
    [0, 30, 160, 200],      // cyan
    [5, 20, 190, 140],      // teal
    [10, 40, 200, 80],      // green
    [15, 120, 210, 40],     // lime green
    [20, 200, 220, 30],     // yellow-green
    [25, 250, 210, 10],     // yellow
    [30, 255, 160, 0],      // orange
    [35, 250, 100, 0],      // dark orange
    [40, 230, 40, 10],      // red
    [45, 180, 10, 20],      // dark red
    [52, 120, 0, 30],       // maroon
  ];

  if (temp <= stops[0][0]) return [stops[0][1], stops[0][2], stops[0][3]];
  if (temp >= stops[stops.length - 1][0]) {
    const last = stops[stops.length - 1];
    return [last[1], last[2], last[3]];
  }

  for (let i = 0; i < stops.length - 1; i++) {
    if (temp >= stops[i][0] && temp <= stops[i + 1][0]) {
      const t = (temp - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
      return [
        Math.round(stops[i][1] + t * (stops[i + 1][1] - stops[i][1])),
        Math.round(stops[i][2] + t * (stops[i + 1][2] - stops[i][2])),
        Math.round(stops[i][3] + t * (stops[i + 1][3] - stops[i][3]))
      ];
    }
  }
  return [200, 200, 200];
}

// ═══════════════════════════════════════════════════
// Temperature Legend Bar Component
// ═══════════════════════════════════════════════════
function TempLegend() {
  const ticks = [-30, -20, -10, 0, 10, 20, 30, 40, 50];
  // Build CSS gradient from our color stops
  const gradientStops = [];
  for (let t = -35; t <= 52; t += 2) {
    const [r, g, b] = getTempColor(t);
    const pct = ((t + 35) / 87 * 100).toFixed(1);
    gradientStops.push(`rgb(${r},${g},${b}) ${pct}%`);
  }
  const gradient = `linear-gradient(to right, ${gradientStops.join(', ')})`;

  return (
    <div className="temp-legend">
      <div className="temp-legend-title">Temperature °C</div>
      <div className="temp-legend-bar" style={{ background: gradient }} />
      <div className="temp-legend-ticks">
        {ticks.map(t => (
          <span key={t} className="temp-legend-tick">{t}°</span>
        ))}
      </div>
    </div>
  );
}


export default function WorldMap({
  category = 'earthquake',
  earthquakes = [],
  cyclones = [],
  tsunamis = [],
  weather = [],
  tempMapData = [],
  isAnimating = true,
  selectedEvent = null,
  onSelectEvent = () => { }
}) {
  const [hoverInfo, setHoverInfo] = useState(null);
  const [animTime, setAnimTime] = useState(0);

  // Animation Loop for Cyclones
  useEffect(() => {
    let animationId;
    const animate = () => {
      if (isAnimating) {
        setAnimTime((t) => (t + 0.002) % 1);
      }
      animationId = window.requestAnimationFrame(animate);
    };
    if (category === 'cyclone') {
      animate();
    }
    return () => window.cancelAnimationFrame(animationId);
  }, [category, isAnimating]);

  const getInterpolatedPos = (track, timeRatio) => {
    if (!track || track.length === 0) return [0, 0];
    if (track.length === 1) return [track[0].lon, track[0].lat];
    const segment = timeRatio * (track.length - 1);
    const index = Math.floor(segment);
    const fraction = segment - index;
    if (index >= track.length - 1) return [track[track.length - 1].lon, track[track.length - 1].lat];
    const curr = track[index];
    const next = track[index + 1];
    return [
      curr.lon + (next.lon - curr.lon) * fraction,
      curr.lat + (next.lat - curr.lat) * fraction
    ];
  };

  // ═══════════════════════════════
  // LAYER: Earthquakes
  // ═══════════════════════════════
  const eqLayer = useMemo(() => new ScatterplotLayer({
    id: 'earthquakes',
    data: earthquakes,
    pickable: true,
    opacity: 0.8,
    stroked: true,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 3,
    radiusMaxPixels: 30,
    lineWidthMinPixels: 1,
    getPosition: d => [d.longitude, d.latitude],
    getRadius: d => getMagRadiusSq(d.magnitude || 0),
    getFillColor: d => [...getMagColorArr(d.magnitude || 0), 140],
    getLineColor: d => getMagColorArr(d.magnitude || 0),
    onHover: info => setHoverInfo(info),
    onClick: info => {
      if (info.object) {
        onSelectEvent({
          ...info.object,
          type: 'earthquake'
        });
      }
    },
    visible: category === 'earthquake'
  }), [earthquakes, category]);

  // ═══════════════════════════════
  // LAYER: Cyclones
  // ═══════════════════════════════
  const cycloneTracks = useMemo(() => cyclones.filter(c => c.track?.length > 1).map(c => {
    const sortedTrack = c.track[0].time ? [...c.track].sort((a, b) => new Date(a.time) - new Date(b.time)) : c.track;
    const fullPath = sortedTrack.map(p => [p.lon, p.lat]);
    const numPoints = fullPath.length;
    const limit = Math.max(2, Math.floor(animTime * (numPoints - 1)) + 1);
    const visiblePath = fullPath.slice(0, limit);
    const currentPos = getInterpolatedPos(sortedTrack, animTime);
    visiblePath.push(currentPos);
    return {
      name: c.name,
      path: visiblePath,
      color: getCycloneCatColorArr(c.category),
      ...c,
      track: sortedTrack
    };
  }), [cyclones, animTime]);

  const cyclonePathLayer = useMemo(() => new PathLayer({
    id: 'cyclone-paths',
    data: cycloneTracks,
    pickable: true,
    widthScale: 20,
    widthMinPixels: 2,
    getPath: d => d.path,
    getColor: d => [...d.color, 180],
    getWidth: d => 2,
    onHover: info => setHoverInfo({ ...info, isCycloneTrack: true }),
    visible: category === 'cyclone'
  }), [cycloneTracks, category]);

  const cycloneImpactData = useMemo(() => {
    const data = [];
    cyclones.forEach(c => {
      if (!c.track || c.track.length === 0) return;
      const sortedTrack = c.track[0].time ? [...c.track].sort((a, b) => new Date(a.time) - new Date(b.time)) : c.track;
      const latest = sortedTrack[sortedTrack.length - 1];
      data.push({ ...c, lon: latest.lon, lat: latest.lat, radius: 250000, color: [255, 255, 0, 64], impactType: 'Low' });
      data.push({ ...c, lon: latest.lon, lat: latest.lat, radius: 120000, color: [255, 165, 0, 89], impactType: 'Medium' });
      data.push({ ...c, lon: latest.lon, lat: latest.lat, radius: 50000, color: [255, 0, 0, 102], impactType: 'High' });
    });
    return data;
  }, [cyclones]);

  const cycloneImpactLayer = useMemo(() => new ScatterplotLayer({
    id: 'cyclone-impacts',
    data: cycloneImpactData,
    pickable: true,
    opacity: 1,
    stroked: false,
    filled: true,
    getPosition: d => [d.lon, d.lat],
    getRadius: d => d.radius,
    getFillColor: d => d.color,
    onHover: info => setHoverInfo({ ...info, isCycloneImpact: true }),
    visible: category === 'cyclone'
  }), [cycloneImpactData, category]);

  const currentCyclonePos = useMemo(() => {
    return cyclones.filter(c => c.track?.length > 0).map(c => {
      const sortedTrack = c.track[0].time ? [...c.track].sort((a, b) => new Date(a.time) - new Date(b.time)) : c.track;
      return {
        ...c,
        trackInfo: sortedTrack,
        currentPos: getInterpolatedPos(sortedTrack, animTime)
      };
    });
  }, [cyclones, animTime]);

  const CYCLONE_ICON_DATA = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="14" fill="white" /><path d="M50,35 C70,35 80,45 85,65" fill="none" stroke="white" stroke-width="10" stroke-linecap="round" /><path d="M50,65 C30,65 20,55 15,35" fill="none" stroke="white" stroke-width="10" stroke-linecap="round" /><path d="M65,50 C65,70 55,80 35,85" fill="none" stroke="white" stroke-width="10" stroke-linecap="round" /><path d="M35,50 C35,30 45,20 65,15" fill="none" stroke="white" stroke-width="10" stroke-linecap="round" /></svg>`);

  const cycloneEyeLayer = useMemo(() => new IconLayer({
    id: 'cyclone-eyes',
    data: currentCyclonePos,
    pickable: true,
    getIcon: d => ({
      url: CYCLONE_ICON_DATA,
      width: 100,
      height: 100,
      anchorY: 50,
      anchorX: 50,
      mask: true
    }),
    sizeScale: 1,
    sizeMinPixels: 35,
    sizeMaxPixels: 70,
    getPosition: d => d.currentPos,
    getSize: d => 60,
    getAngle: d => (animTime * 360 * 15),
    getColor: d => {
      const c = getCycloneCatColorArr(d.category);
      return [c[0], c[1], c[2], 255];
    },
    updateTriggers: {
      getPosition: [animTime],
      getAngle: [animTime]
    },
    onHover: info => setHoverInfo({ ...info, isCycloneEye: true }),
    onClick: info => {
      if (info.object) {
        const sortedTrack = info.object.trackInfo;
        const latest = sortedTrack && sortedTrack.length > 0 ? sortedTrack[sortedTrack.length - 1] : null;
        onSelectEvent({
          ...info.object,
          type: 'cyclone',
          time: latest?.time || info.object.dates || info.object.year
        });
      }
    },
    visible: category === 'cyclone'
  }), [currentCyclonePos, category, animTime]);

  const cycloneCenterPointLayer = useMemo(() => new ScatterplotLayer({
    id: 'cyclone-center-fallback',
    data: currentCyclonePos,
    pickable: false,
    opacity: 0.8,
    radiusMinPixels: 2,
    radiusMaxPixels: 4,
    getPosition: d => d.currentPos,
    getFillColor: [255, 255, 255, 200],
    visible: category === 'cyclone'
  }), [currentCyclonePos, category]);

  // ═══════════════════════════════
  // LAYER: Tsunamis
  // ═══════════════════════════════
  const tsunamiLayer = useMemo(() => new ScatterplotLayer({
    id: 'tsunamis',
    data: tsunamis,
    pickable: true,
    opacity: 0.9,
    stroked: true,
    filled: true,
    radiusMinPixels: 4,
    radiusMaxPixels: 25,
    lineWidthMinPixels: 1.5,
    getPosition: d => [d.lon, d.lat],
    getRadius: d => (d.wave_height_m || 1) * 20000 + 40000,
    getFillColor: d => [...getTsunamiMagColorArr(d.magnitude || 0), 200],
    getLineColor: [255, 255, 255],
    onHover: info => setHoverInfo(info),
    onClick: info => {
      if (info.object) {
        onSelectEvent({
          ...info.object,
          type: 'tsunami'
        });
      }
    },
    visible: category === 'tsunami'
  }), [tsunamis, category]);

  // ═══════════════════════════════════════════════════
  // LAYER: Temperature DOT-GRID (replaces old heatmap)
  // Each data point = one colored circle on the map
  // ═══════════════════════════════════════════════════
  const tempDotLayer = useMemo(() => new ScatterplotLayer({
    id: 'temperature-dots',
    data: category === 'temperature' ? tempMapData : [],
    pickable: true,
    opacity: 0.92,
    stroked: true,
    filled: true,
    radiusUnits: 'pixels',
    radiusMinPixels: 3,
    radiusMaxPixels: 14,
    lineWidthMinPixels: 0.5,
    getPosition: d => [d.lon, d.lat],
    getRadius: 6,
    getFillColor: d => {
      const temp = d.temp_c != null ? d.temp_c : (d.temp_max || 0);
      const [r, g, b] = getTempColor(temp);
      return [r, g, b, 220];
    },
    getLineColor: d => {
      const temp = d.temp_c != null ? d.temp_c : (d.temp_max || 0);
      const [r, g, b] = getTempColor(temp);
      return [r, g, b, 80];
    },
    onHover: info => setHoverInfo(info ? { ...info, isTempDot: true } : null),
    visible: category === 'temperature',
    updateTriggers: {
      getFillColor: [tempMapData],
      getLineColor: [tempMapData]
    }
  }), [tempMapData, category]);

  const layers = [
    eqLayer,
    cycloneImpactLayer,
    cyclonePathLayer,
    cycloneCenterPointLayer,
    cycloneEyeLayer,
    tsunamiLayer,
    tempDotLayer
  ];

  // Tooltip rendering
  function renderTooltip() {
    if (!hoverInfo || !hoverInfo.object || !hoverInfo.picked) return null;
    const { object, x, y } = hoverInfo;

    // Temperature dot tooltip
    if (hoverInfo.isTempDot) {
      const temp = object.temp_c != null ? object.temp_c : (object.temp_max || 0);
      const [r, g, b] = getTempColor(temp);
      return (
        <div className="deckgl-tooltip temp-tooltip" style={{ left: x, top: y }}>
          <div className="tt-content">
            <div className="tt-temp-value" style={{ color: `rgb(${r},${g},${b})` }}>
              {temp.toFixed(1)}°C
            </div>
            <div className="tt-sub">
              {object.lat.toFixed(1)}°{object.lat >= 0 ? 'N' : 'S'}, {object.lon.toFixed(1)}°{object.lon >= 0 ? 'E' : 'W'}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="deckgl-tooltip" style={{ left: x, top: y }}>
        {category === 'earthquake' && (
          <div className="tt-content">
            <div className="tt-title">{object.place}</div>
            <div className="tt-sub">Magnitude: {object.magnitude?.toFixed(1)}</div>
          </div>
        )}
        {category === 'cyclone' && (
          <div className="tt-content">
            <div className="tt-title">{object.name || object.trackName}</div>
            <div className="tt-sub">Cat: {object.category || 'Track'}</div>
            {object.impactType && <div className="tt-sub" style={{ color: '#ffaa00' }}>Impact Zone: {object.impactType}</div>}
            {object.max_wind_kmh && <div className="tt-sub">Max Wind: {object.max_wind_kmh} km/h</div>}
            {object.landfall && <div className="tt-sub">Landfall: {object.landfall}</div>}
          </div>
        )}
        {category === 'tsunami' && (
          <div className="tt-content">
            <div className="tt-title">{object.name}</div>
            <div className="tt-sub">Wave Height: {object.wave_height_m} m</div>
            <div className="tt-sub">Fatalities: {object.fatalities?.toLocaleString()}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="world-map-container" onContextMenu={e => e.preventDefault()}>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
      >
        <Map
          mapLib={maplibregl}
          mapStyle={MAP_STYLE}
          preventStyleDiffing={true}
        />
        {renderTooltip()}
      </DeckGL>

      {/* Temperature color legend bar */}
      {category === 'temperature' && <TempLegend />}

      <WikiCard
        event={selectedEvent}
        onClose={() => onSelectEvent(null)}
      />
    </div>
  );
}