import { useState, useMemo } from 'react';
import Map, { Source, Layer } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers';
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
  tempMapData = []
}) {
  const [hoverInfo, setHoverInfo] = useState(null);

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
    visible: category === 'earthquake'
  }), [earthquakes, category]);

  // ═══════════════════════════════
  // LAYER: Cyclones
  // ═══════════════════════════════
  // Build tracks
  const cycloneTracks = useMemo(() => cyclones.filter(c => c.track?.length > 1).map(c => {
    // Sort track by time to ensure path correctness
    const sortedTrack = c.track[0].time ? [...c.track].sort((a, b) => new Date(a.time) - new Date(b.time)) : c.track;
    return {
      name: c.name,
      path: sortedTrack.map(p => [p.lon, p.lat]),
      color: getCycloneCatColorArr(c.category),
      ...c,
      track: sortedTrack
    };
  }), [cyclones]);

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

  const cycloneEyeLayer = useMemo(() => new ScatterplotLayer({
    id: 'cyclone-eyes',
    data: cyclones.filter(c => c.track?.length > 0),
    pickable: true,
    opacity: 1,
    stroked: true,
    filled: true,
    radiusMinPixels: 4,
    radiusMaxPixels: 6,
    lineWidthMinPixels: 2,
    getPosition: d => {
      const sortedTrack = d.track[0].time ? [...d.track].sort((a, b) => new Date(a.time) - new Date(b.time)) : d.track;
      const latest = sortedTrack[sortedTrack.length - 1];
      return [latest.lon, latest.lat];
    },
    getRadius: d => 10000,
    getFillColor: [255, 255, 255, 255],
    getLineColor: d => getCycloneCatColorArr(d.category),
    onHover: info => setHoverInfo({ ...info, isCycloneEye: true }),
    visible: category === 'cyclone'
  }), [cyclones, category]);

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
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['get', 'temp'],
        -30, 0,
        0, 0.4,
        25, 0.8,
        50, 1.2
      ],
      'heatmap-intensity': 3,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(13,0,84,0)',
        0.1, 'rgb(59,46,192)',
        0.3, 'rgb(136,68,170)',
        0.5, 'rgb(194,59,94)',
        0.7, 'rgb(245,138,31)',
        0.9, 'rgb(250,204,21)',
        1, 'rgb(252,255,164)'
      ],
      'heatmap-radius': 60,
      'heatmap-opacity': 0.7
    }
  };

  const layers = [
    eqLayer,
    cycloneImpactLayer,
    cyclonePathLayer,
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
    </div>
  );
}
