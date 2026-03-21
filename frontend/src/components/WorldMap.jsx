import { useState, useMemo, useEffect, useRef } from 'react';
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
  if (!cat) return [127, 200, 248];
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
// TEMPERATURE COLOR — 14-stop smooth gradient
// deep indigo → blue → cyan → teal → green → lime
// → yellow-green → yellow → orange → dark-orange → red → dark-red → maroon
// ═══════════════════════════════════════════════════
function getTempColor(temp) {
  const stops = [
    [-40, 20, 0, 80],
    [-25, 40, 20, 170],
    [-10, 50, 80, 220],
    [0, 30, 160, 200],
    [5, 20, 190, 140],
    [10, 40, 200, 80],
    [15, 120, 210, 40],
    [20, 200, 220, 30],
    [25, 250, 210, 10],
    [30, 255, 160, 0],
    [35, 250, 100, 0],
    [40, 230, 40, 10],
    [45, 180, 10, 20],
    [52, 120, 0, 30],
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
// GLOBAL GRID GENERATOR — 2° resolution (~16,400 pts)
// Fetches current temperature from Open-Meteo in
// parallel batches of 1000 lat/lon pairs each
// ═══════════════════════════════════════════════════
function buildGlobalGrid() {
  const pts = [];
  for (let lat = -88; lat <= 88; lat += 2) {
    for (let lon = -180; lon <= 178; lon += 2) {
      pts.push({ lat, lon });
    }
  }
  return pts;
}

const BATCH_SIZE = 1000;

async function fetchOpenMeteoTemps(points) {
  const lats = points.map(p => p.lat).join(',');
  const lons = points.map(p => p.lon).join(',');
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lats}&longitude=${lons}` +
    `&current=temperature_2m` +
    `&forecast_days=1&wind_speed_unit=kmh&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = await res.json();
  const arr = Array.isArray(data) ? data : [data];
  return arr.map((d, i) => ({
    lat: points[i].lat,
    lon: points[i].lon,
    temp_c: d?.current?.temperature_2m ?? null,
  })).filter(d => d.temp_c !== null);
}

async function fetchAllGlobalTemps(onProgress) {
  const grid = buildGlobalGrid();
  const results = [];
  const total = Math.ceil(grid.length / BATCH_SIZE);

  // Fire up to 5 concurrent batches at a time
  const CONCURRENCY = 5;
  for (let i = 0; i < grid.length; i += BATCH_SIZE * CONCURRENCY) {
    const batchGroup = [];
    for (let j = 0; j < CONCURRENCY && i + j * BATCH_SIZE < grid.length; j++) {
      const start = i + j * BATCH_SIZE;
      const slice = grid.slice(start, start + BATCH_SIZE);
      batchGroup.push(fetchOpenMeteoTemps(slice));
    }
    const batchResults = await Promise.allSettled(batchGroup);
    batchResults.forEach(r => {
      if (r.status === 'fulfilled') results.push(...r.value);
    });
    if (onProgress) {
      const done = Math.min(i + BATCH_SIZE * CONCURRENCY, grid.length);
      onProgress(Math.round((done / grid.length) * 100));
    }
  }
  return results;
}

// ═══════════════════════════════════════════════════
// Temperature Legend Bar
// ═══════════════════════════════════════════════════
function TempLegend({ loadPct }) {
  const ticks = [-30, -20, -10, 0, 10, 20, 30, 40, 50];
  const gradientStops = [];
  for (let t = -35; t <= 52; t += 2) {
    const [r, g, b] = getTempColor(t);
    const pct = ((t + 35) / 87 * 100).toFixed(1);
    gradientStops.push(`rgb(${r},${g},${b}) ${pct}%`);
  }
  const gradient = `linear-gradient(to right, ${gradientStops.join(', ')})`;

  return (
    <div className="temp-legend">
      <div className="temp-legend-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Temperature °C</span>
        {loadPct !== null && loadPct < 100 && (
          <span style={{ fontSize: 10, color: '#aaa', fontFamily: 'DM Mono, monospace' }}>
            Loading grid {loadPct}%
          </span>
        )}
      </div>
      {/* Gradient bar */}
      <div className="temp-legend-bar" style={{ background: gradient }} />
      {/* Dot swatches */}
      <div className="temp-legend-ticks">
        {ticks.map(t => {
          const [r, g, b] = getTempColor(t);
          return (
            <span key={t} className="temp-legend-tick" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: `rgb(${r},${g},${b})`,
                boxShadow: `0 0 5px rgb(${r},${g},${b})`,
                display: 'inline-block'
              }} />
              <span style={{ color: `rgb(${r},${g},${b})`, fontSize: 9 }}>{t}°</span>
            </span>
          );
        })}
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

  // ── Global temperature grid state ──────────────────
  const [globalTempGrid, setGlobalTempGrid] = useState([]);
  const [gridLoadPct, setGridLoadPct] = useState(null);
  const gridFetchedRef = useRef(false);

  // Fetch global grid once when temperature tab is first activated
  useEffect(() => {
    if (category !== 'temperature') return;
    if (gridFetchedRef.current) return;
    gridFetchedRef.current = true;

    setGridLoadPct(0);
    fetchAllGlobalTemps((pct) => setGridLoadPct(pct))
      .then(data => {
        setGlobalTempGrid(data);
        setGridLoadPct(100);
      })
      .catch(err => {
        console.error('Global grid fetch failed:', err);
        setGridLoadPct(100);
      });
  }, [category]);

  // ── Merge API data + global grid, deduplicate by rounded coord ──
  const mergedTempData = useMemo(() => {
    const seen = new Set();
    const merged = [];

    // API data takes priority (more accurate / historical)
    const apiData = tempMapData.map(d => ({
      lat: d.lat,
      lon: d.lon,
      temp_c: d.temp_c != null ? d.temp_c : (d.temp_max || 0),
      label: d.label || null,
    }));

    apiData.forEach(d => {
      const key = `${Math.round(d.lat * 2) / 2},${Math.round(d.lon * 2) / 2}`;
      if (!seen.has(key)) { seen.add(key); merged.push(d); }
    });

    // Fill gaps with Open-Meteo global grid
    globalTempGrid.forEach(d => {
      const key = `${Math.round(d.lat * 2) / 2},${Math.round(d.lon * 2) / 2}`;
      if (!seen.has(key)) { seen.add(key); merged.push(d); }
    });

    return merged;
  }, [tempMapData, globalTempGrid]);

  // ── Animation Loop for Cyclones ───────────────────
  useEffect(() => {
    let animationId;
    const animate = () => {
      if (isAnimating) setAnimTime(t => (t + 0.002) % 1);
      animationId = window.requestAnimationFrame(animate);
    };
    if (category === 'cyclone') animate();
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
    return [curr.lon + (next.lon - curr.lon) * fraction, curr.lat + (next.lat - curr.lat) * fraction];
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
    onClick: info => { if (info.object) onSelectEvent({ ...info.object, type: 'earthquake' }); },
    visible: category === 'earthquake'
  }), [earthquakes, category]);

  // ═══════════════════════════════
  // LAYER: Cyclones
  // ═══════════════════════════════
  const cycloneTracks = useMemo(() => cyclones.filter(c => c.track?.length > 1).map(c => {
    const sortedTrack = c.track[0]?.time ? [...c.track].sort((a, b) => new Date(a.time) - new Date(b.time)) : c.track;
    const fullPath = sortedTrack.map(p => [p.lon, p.lat]);
    const numPoints = fullPath.length;
    const limit = Math.max(2, Math.floor(animTime * (numPoints - 1)) + 1);
    const visiblePath = fullPath.slice(0, limit);
    const currentPos = getInterpolatedPos(sortedTrack, animTime);
    visiblePath.push(currentPos);
    return { name: c.name, path: visiblePath, color: getCycloneCatColorArr(c.category), ...c, track: sortedTrack };
  }), [cyclones, animTime]);

  const cyclonePathLayer = useMemo(() => new PathLayer({
    id: 'cyclone-paths',
    data: cycloneTracks,
    pickable: true,
    widthScale: 20,
    widthMinPixels: 2,
    getPath: d => d.path,
    getColor: d => [...d.color, 220],
    getWidth: 3,
    onHover: info => setHoverInfo(info),
    visible: category === 'cyclone'
  }), [cycloneTracks, category]);

  const cycloneImpactData = useMemo(() => {
    const data = [];
    cyclones.forEach(c => {
      if (!c.track || c.track.length === 0) return;
      const sortedTrack = c.track[0]?.time ? [...c.track].sort((a, b) => new Date(a.time) - new Date(b.time)) : c.track;
      const latest = sortedTrack[sortedTrack.length - 1];
      if (!latest) return;
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
      const sortedTrack = c.track[0]?.time ? [...c.track].sort((a, b) => new Date(a.time) - new Date(b.time)) : c.track;
      return { ...c, trackInfo: sortedTrack, currentPos: getInterpolatedPos(sortedTrack, animTime) };
    });
  }, [cyclones, animTime]);

  const CYCLONE_ICON_DATA = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="14" fill="white" /><path d="M50,35 C70,35 80,45 85,65" fill="none" stroke="white" stroke-width="10" stroke-linecap="round" /><path d="M50,65 C30,65 20,55 15,35" fill="none" stroke="white" stroke-width="10" stroke-linecap="round" /><path d="M65,50 C65,70 55,80 35,85" fill="none" stroke="white" stroke-width="10" stroke-linecap="round" /><path d="M35,50 C35,30 45,20 65,15" fill="none" stroke="white" stroke-width="10" stroke-linecap="round" /></svg>`);

  const cycloneEyeLayer = useMemo(() => new IconLayer({
    id: 'cyclone-eyes',
    data: currentCyclonePos,
    pickable: true,
    getIcon: d => ({ url: CYCLONE_ICON_DATA, width: 100, height: 100, anchorY: 50, anchorX: 50, mask: true }),
    sizeScale: 1,
    sizeMinPixels: 35,
    sizeMaxPixels: 70,
    getPosition: d => d.currentPos,
    getSize: d => 60,
    getAngle: d => (animTime * 360 * 15),
    getColor: d => { const c = getCycloneCatColorArr(d.category); return [c[0], c[1], c[2], 255]; },
    updateTriggers: { getPosition: [animTime], getAngle: [animTime] },
    onHover: info => setHoverInfo({ ...info, isCycloneEye: true }),
    onClick: info => {
      if (info.object) {
        const sortedTrack = info.object.trackInfo;
        const latest = sortedTrack?.length > 0 ? sortedTrack[sortedTrack.length - 1] : null;
        onSelectEvent({ ...info.object, type: 'cyclone', time: latest?.time || info.object.dates || info.object.year });
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
    onClick: info => { if (info.object) onSelectEvent({ ...info.object, type: 'tsunami' }); },
    visible: category === 'tsunami'
  }), [tsunamis, category]);

  // ═══════════════════════════════════════════════════════════════
  // LAYER: Temperature DOT-GRID  ←  THE FIX IS HERE
  //
  // Two-layer approach replicating the reference image:
  //   Layer 1 — GLOW ring:  larger radius, low opacity, soft bloom
  //   Layer 2 — CORE dot:   small sharp pixel dot, full brightness
  //
  // radiusUnits: 'pixels' → dots stay same size regardless of zoom
  // radiusMinPixels / radiusMaxPixels control the look precisely
  // ═══════════════════════════════════════════════════════════════
  const isTempVisible = category === 'temperature';

  // Glow layer — outer soft halo
  const tempGlowLayer = useMemo(() => new ScatterplotLayer({
    id: 'temperature-glow',
    data: isTempVisible ? mergedTempData : [],
    pickable: false,           // glow is decorative only, no picking
    opacity: 1,
    stroked: false,
    filled: true,
    radiusUnits: 'pixels',
    radiusMinPixels: 1,
    radiusMaxPixels: 11,
    getPosition: d => [d.lon, d.lat],
    getRadius: 11,             // outer glow radius in pixels
    getFillColor: d => {
      const temp = d.temp_c ?? d.temp_max ?? 0;
      const [r, g, b] = getTempColor(temp);
      return [r, g, b, 35];   // very transparent — just a soft bloom
    },
    updateTriggers: { getFillColor: [mergedTempData.length] }
  }), [mergedTempData, isTempVisible]);

  // Mid glow layer
  const tempMidGlowLayer = useMemo(() => new ScatterplotLayer({
    id: 'temperature-midglow',
    data: isTempVisible ? mergedTempData : [],
    pickable: false,
    opacity: 1,
    stroked: false,
    filled: true,
    radiusUnits: 'pixels',
    radiusMinPixels: 1,
    radiusMaxPixels: 7,
    getPosition: d => [d.lon, d.lat],
    getRadius: 7,
    getFillColor: d => {
      const temp = d.temp_c ?? d.temp_max ?? 0;
      const [r, g, b] = getTempColor(temp);
      return [r, g, b, 70];   // semi-transparent mid ring
    },
    updateTriggers: { getFillColor: [mergedTempData.length] }
  }), [mergedTempData, isTempVisible]);

  // Core dot layer — the sharp, bright center dot
  const tempCoreLayer = useMemo(() => new ScatterplotLayer({
    id: 'temperature-core',
    data: isTempVisible ? mergedTempData : [],
    pickable: true,
    opacity: 1,
    stroked: false,
    filled: true,
    radiusUnits: 'pixels',
    radiusMinPixels: 1,
    radiusMaxPixels: 4,
    getPosition: d => [d.lon, d.lat],
    getRadius: 4,              // sharp 4px core — tiny and precise
    getFillColor: d => {
      const temp = d.temp_c ?? d.temp_max ?? 0;
      const [r, g, b] = getTempColor(temp);
      return [r, g, b, 230];  // near-opaque bright dot
    },
    onHover: info => setHoverInfo(info ? { ...info, isTempDot: true } : null),
    updateTriggers: { getFillColor: [mergedTempData.length] }
  }), [mergedTempData, isTempVisible]);

  const layers = [
    eqLayer,
    cycloneImpactLayer,
    cyclonePathLayer,
    cycloneCenterPointLayer,
    cycloneEyeLayer,
    tsunamiLayer,
    // Temperature: glow first (bottom), then core on top
    tempGlowLayer,
    tempMidGlowLayer,
    tempCoreLayer,
  ];

  // ═══════════════════════════════
  // Tooltip rendering
  // ═══════════════════════════════
  function renderTooltip() {
    if (!hoverInfo || !hoverInfo.object || !hoverInfo.picked) return null;
    const { object, x, y } = hoverInfo;

    if (hoverInfo.isTempDot) {
      const temp = object.temp_c ?? object.temp_max ?? 0;
      const [r, g, b] = getTempColor(temp);
      const colorStr = `rgb(${r},${g},${b})`;
      return (
        <div className="deckgl-tooltip temp-tooltip" style={{ left: x + 14, top: y - 48 }}>
          <div className="tt-content">
            {object.label && (
              <div style={{ fontSize: 11, color: '#ccc', marginBottom: 3, fontFamily: 'DM Mono, monospace', letterSpacing: 1 }}>
                {object.label}
              </div>
            )}
            <div className="tt-temp-value" style={{ color: colorStr, fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>
              {temp.toFixed(1)}°C
            </div>
            <div className="tt-sub" style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: colorStr, boxShadow: `0 0 6px ${colorStr}`,
                display: 'inline-block', flexShrink: 0
              }} />
              <span>
                {Math.abs(object.lat).toFixed(1)}°{object.lat >= 0 ? 'N' : 'S'}&nbsp;&nbsp;
                {Math.abs(object.lon).toFixed(1)}°{object.lon >= 0 ? 'E' : 'W'}
              </span>
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

      {category === 'temperature' && (
        <TempLegend loadPct={gridLoadPct} />
      )}

      <WikiCard
        event={selectedEvent}
        onClose={() => onSelectEvent(null)}
      />
    </div>
  );
}