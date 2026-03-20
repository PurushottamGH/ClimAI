import { useState, useMemo, useEffect } from 'react';
import Map, { Source, Layer } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PathLayer, IconLayer } from '@deck.gl/layers';
import WikiCard from './WikiCard';
import 'maplibre-gl/dist/maplibre-gl.css';
import './WorldMap.css';

// Using Carto's free dark matter basemap cleanly with maplibre-gl
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
  if (cat.includes('Very Severe')) return [245, 183, 197]; // Pink
  if (cat.includes('Severe')) return [91, 155, 213];      // Blue
  return [127, 200, 248];                                 // Light blue
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
    // We update animTime from 0 to 1 over a few seconds
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
  // Build tracks
  const cycloneTracks = useMemo(() => cyclones.filter(c => c.track?.length > 1).map(c => {
    // Sort track by time to ensure path correctness
    const sortedTrack = c.track[0].time ? [...c.track].sort((a, b) => new Date(a.time) - new Date(b.time)) : c.track;
    const fullPath = sortedTrack.map(p => [p.lon, p.lat]);

    // Partially reveal path based on animTime
    const numPoints = fullPath.length;
    const limit = Math.max(2, Math.floor(animTime * (numPoints - 1)) + 1);
    const visiblePath = fullPath.slice(0, limit);

    // Append interpolated current position for smoothness
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

      // Low: 250km, Yellow
      data.push({
        ...c,
        lon: latest.lon,
        lat: latest.lat,
        radius: 250000,
        color: [255, 255, 0, 64],
        impactType: 'Low'
      });
      // Medium: 120km, Orange
      data.push({
        ...c,
        lon: latest.lon,
        lat: latest.lat,
        radius: 120000,
        color: [255, 165, 0, 89],
        impactType: 'Medium'
      });
      // High: 50km, Red
      data.push({
        ...c,
        lon: latest.lon,
        lat: latest.lat,
        radius: 50000,
        color: [255, 0, 0, 102],
        impactType: 'High'
      });
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

  // ═══════════════════════════════
  // LAYER: Temperature Heatmap (Native Maplibre)
  // ═══════════════════════════════
  const temperatureGeoJSON = useMemo(() => {
    if (category !== 'temperature' || !tempMapData) return null;
    return {
      type: 'FeatureCollection',
      features: tempMapData.map(d => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [d.lon, d.lat]
        },
        properties: {
          temp: d.temp_max != null ? d.temp_max : (d.temp_c || 0)
        }
      }))
    };
  }, [tempMapData, category]);

  const heatmapLayerProps = {
    id: 'temperature-heat-native',
    type: 'heatmap',
    paint: {
      // Weight by temperature value — hotter regions contribute more to density
      'heatmap-weight': [
        'interpolate', ['linear'], ['get', 'temp'],
        -30, 0.1,
        0, 0.3,
        15, 0.6,
        25, 0.85,
        35, 1.0,
        45, 1.3
      ],
      // High intensity so nearby points fully blend into continuous coverage
      'heatmap-intensity': [
        'interpolate', ['linear'], ['zoom'],
        0, 2.5,
        2, 3.5,
        4, 5.0,
        6, 7.0
      ],
      // Weather-radar color ramp: transparent → deep blue → purple → red → orange → yellow → white
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0, 'rgba(0,0,0,0)',
        0.04, 'rgba(0,10,60,0.5)',
        0.12, 'rgba(20,40,160,0.8)',
        0.25, 'rgba(80,10,130,0.88)',
        0.40, 'rgba(160,20,50,0.92)',
        0.55, 'rgba(210,70,10,0.95)',
        0.70, 'rgba(240,150,0,0.97)',
        0.85, 'rgba(252,220,20,1)',
        1.0, 'rgba(255,255,220,1)'
      ],
      // Large zoom-responsive radius — this is the key fix for smooth blending
      'heatmap-radius': [
        'interpolate', ['linear'], ['zoom'],
        0, 55,
        1, 70,
        2, 90,
        3, 110,
        4, 140,
        5, 180,
        6, 240
      ],
      // Slight fade at high zoom so individual data points are readable
      'heatmap-opacity': [
        'interpolate', ['linear'], ['zoom'],
        0, 0.92,
        3, 0.88,
        5, 0.80,
        7, 0.65
      ]
    }
  };

  const layers = [
    eqLayer,
    cycloneImpactLayer,
    cyclonePathLayer,
    cycloneCenterPointLayer,
    cycloneEyeLayer,
    tsunamiLayer
  ];

  // Tooltip rendering
  function renderTooltip() {
    if (!hoverInfo || !hoverInfo.object || !hoverInfo.picked) return null;
    const { object, x, y } = hoverInfo;

    return (
      <div className="deckgl-tooltip" style={{ left: x, top: y }}>
        {category === 'temperature' && hoverInfo.isHeatmap && (
          <div className="tt-content">
            <div className="tt-title">Temperature</div>
            <div className="tt-value">{object.temp_c.toFixed(1)}°C</div>
            <div className="tt-sub">Lat: {object.lat.toFixed(1)} / Lon: {object.lon.toFixed(1)}</div>
          </div>
        )}
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
        >
          {category === 'temperature' && temperatureGeoJSON && (
            <Source id="temperature-source" type="geojson" data={temperatureGeoJSON}>
              <Layer {...heatmapLayerProps} />
            </Source>
          )}
        </Map>
        {renderTooltip()}
      </DeckGL>

      <WikiCard
        event={selectedEvent}
        onClose={() => onSelectEvent(null)}
      />
    </div>
  );
}