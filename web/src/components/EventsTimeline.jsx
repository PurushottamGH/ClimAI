import { useState, useRef, useEffect, useCallback } from 'react';
import './EventsTimeline.css';

const TIMELINE_EVENTS = [
  { id: "EVT-2004", query: "2004 Indian Ocean earthquake and tsunami", type: "earthquake", x: 100, y: 500, region: "Indian Ocean", detail: "Seismic / Tsunami" },
  { id: "EVT-2005", query: "Hurricane Katrina", type: "cyclone", x: 300, y: 200, region: "North America", detail: "Hurricane" },
  { id: "EVT-2008", query: "Cyclone Nargis", type: "cyclone", x: 450, y: 700, region: "Pacific", detail: "Super Typhoon" },
  { id: "EVT-2010-01", query: "2010 Haiti earthquake", type: "earthquake", x: 600, y: 350, region: "Caribbean", detail: "Seismic" },
  { id: "EVT-2010-02", query: "2010 Northern Hemisphere summer heat waves", type: "heatwave", x: 800, y: 150, region: "Global", detail: "Heatwave" },
  { id: "EVT-2011-01", query: "2011 Tōhoku earthquake and tsunami", type: "earthquake", x: 950, y: 650, region: "Asia", detail: "Seismic / Tsunami" },
  { id: "EVT-2011-02", query: "2011 East Africa drought", type: "heatwave", x: 1100, y: 800, region: "Africa", detail: "Drought" },
  { id: "EVT-2013", query: "Typhoon Haiyan", type: "cyclone", x: 1300, y: 400, region: "Asia", detail: "Super Typhoon" },
  { id: "EVT-2015", query: "April 2015 Nepal earthquake", type: "earthquake", x: 1450, y: 250, region: "Asia", detail: "Seismic" },
  { id: "EVT-2017", query: "Hurricane Maria", type: "cyclone", x: 1650, y: 550, region: "Caribbean", detail: "Hurricane" },
  { id: "EVT-2019-01", query: "Cyclone Idai", type: "cyclone", x: 1800, y: 850, region: "Africa", detail: "Cyclone" },
  { id: "EVT-2019-02", query: "2019–20 Australian bushfire season", type: "wildfire", x: 2000, y: 300, region: "Oceania", detail: "Bushfire" },
  { id: "EVT-2021-01", query: "2021 Western North America heat wave", type: "heatwave", x: 2200, y: 100, region: "North America", detail: "Heatwave" },
  { id: "EVT-2021-02", query: "2021 European floods", type: "flood", x: 2350, y: 600, region: "Europe", detail: "Flood" },
  { id: "EVT-2022-01", query: "2022 Hunga Tonga–Hunga Haʻapai eruption and tsunami", type: "volcano", x: 2550, y: 800, region: "Pacific", detail: "Submarine Eruption" },
  { id: "EVT-2022-02", query: "2022 Pakistan floods", type: "flood", x: 2700, y: 450, region: "Asia", detail: "Mega Flood" },
  { id: "EVT-2023-01", query: "2023 Turkey–Syria earthquake", type: "earthquake", x: 2900, y: 200, region: "Middle East", detail: "Seismic" },
  { id: "EVT-2023-02", query: "2023 Hawaii wildfires", type: "wildfire", x: 3050, y: 650, region: "Pacific", detail: "Wildfire" },
  { id: "EVT-2024-01", query: "2024 Noto earthquake", type: "earthquake", x: 3250, y: 300, region: "Asia", detail: "Seismic" },
  { id: "EVT-2024-02", query: "2024 Atlantic hurricane season", type: "cyclone", x: 3400, y: 850, region: "Atlantic", detail: "Hurricane" }
];

const TYPE_FILTERS = ["earthquake", "flood", "heatwave", "cyclone", "volcano", "wildfire"];

// Fetch Wikipedia Data
async function fetchWikiData(query) {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const title = searchData?.query?.search?.[0]?.title;
    if (!title) return null;

    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const summaryRes = await fetch(summaryUrl);
    const summaryData = await summaryRes.json();

    let hiRes = null;
    if (summaryData?.thumbnail?.source) {
      hiRes = summaryData.originalimage?.source || summaryData.thumbnail.source.replace(/\/\d+px-/, '/600px-');
    }
    
    return {
      title: summaryData.title,
      src: hiRes,
      extract: summaryData.extract,
      url: summaryData.content_urls?.desktop?.page,
    };
  } catch {
    return null;
  }
}

export default function EventsTimeline() {
  const [selectedProject, setSelectedProject] = useState("EVT-2021-01");
  const [activeFilters, setActiveFilters] = useState([]);
  
  const [wikiData, setWikiData] = useState({});
  const canvasRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const svgRef = useRef(null);
  
  // Preload Wikipedia Data
  useEffect(() => {
    const loadAllWikiData = async () => {
      const results = {};
      for (const evt of TIMELINE_EVENTS) {
        const data = await fetchWikiData(evt.query);
        if (data) {
          results[evt.id] = data;
        }
      }
      setWikiData(results);
    };
    loadAllWikiData();
  }, []);

  const toggleFilter = (f) => {
    setActiveFilters((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  const clearFilters = () => setActiveFilters([]);

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest(".project-card-wrapper")) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // Generate curved paths between projects
  const generatePaths = () => {
    const paths = [];
    for (let i = 0; i < TIMELINE_EVENTS.length - 1; i++) {
      const a = TIMELINE_EVENTS[i];
      const b = TIMELINE_EVENTS[i + 1];
      const ax = a.x + 60, ay = a.y + 30;
      const bx = b.x + 60, by = b.y + 30;
      // Generates smoother forward-leaping curves
      const distanceX = Math.abs(bx - ax);
      const cx1 = ax + distanceX * 0.3;
      const cy1 = ay + ((i % 2 === 0) ? -150 : 150);
      const cx2 = bx - distanceX * 0.3;
      const cy2 = by + ((i % 2 === 0) ? 150 : -150);
      paths.push(`M ${ax} ${ay} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${bx} ${by}`);
    }
    return paths;
  };

  const selected = TIMELINE_EVENTS.find((p) => p.id === selectedProject);

  return (
    <div className="events-timeline-container">
      {/* ── Top Header ── */}
      <header className="events-header">
        <div className="header-left">
          <span className="header-brand">ClimAI</span>
        </div>

        {/* ── Controls (Clear, Zoom) ── */}
        <div className="header-controls">
          <button onClick={clearFilters} className="clear-btn">
            Reset Filter
          </button>
          <div className="zoom-slider-container">
            <div className="zoom-slider-track">
              <input
                type="range"
                min={0.2}
                max={2}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="zoom-slider-input"
              />
              <div
                className="zoom-slider-thumb"
                style={{ left: `${((zoom - 0.2) / 1.8) * 100}%`, transform: "translate(-50%, -50%)" }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── Center Bottom Filters ── */}
      <div className="bottom-filters-container">
        <span className="bottom-filters-label">type:</span>
        {TYPE_FILTERS.map((item) => (
          <button
            key={String(item)}
            onClick={() => toggleFilter(String(item))}
            className={`bottom-filter-link ${activeFilters.includes(String(item)) ? "active" : ""}`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* ── Pannable Canvas ── */}
      <div
        ref={canvasRef}
        className="canvas-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="canvas-content"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: '3800px',
            height: '1400px'
          }}
        >
          {/* SVG Map Lines */}
          <svg ref={svgRef} className="svg-layer">
            {generatePaths().map((d, i) => (
              <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            ))}
          </svg>

          {/* Background Thumbnails (scattered) */}
          {TIMELINE_EVENTS.map((p, i) => {
            const img = wikiData[p.id]?.src;
            if (!img) return null;
            return (
              <div
                key={`bg-${p.id}`}
                className="background-thumbnail"
                style={{
                  left: (p.x + 300 + i * 73) % 1200,
                  top: (p.y + 200 + i * 97) % 850,
                }}
              >
                <img src={img} alt="" />
              </div>
            );
          })}

          {/* Real Project/Event Cards */}
          {TIMELINE_EVENTS.map((p) => {
             // If filters active, check if it matches
             if (activeFilters.length > 0 && !activeFilters.includes(p.type)) {
                return null;
             }

             const isSelected = selectedProject === p.id;
             const data = wikiData[p.id];
            
             return (
               <div
                 key={p.id}
                 className={`project-card-wrapper ${isSelected ? 'selected' : ''}`}
                 style={{ left: p.x, top: p.y }}
                 onClick={() => setSelectedProject(p.id)}
               >
                 <div className={`project-card ${isSelected ? 'expanded' : 'collapsed'}`}>
                   <div className="card-header">
                     <span className="card-id">{p.id}</span>
                     <div className="card-dot" />
                   </div>

                   <div className="card-image-container">
                     <img
                       src={data?.src || 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=='}
                       alt={data?.title || p.query}
                       className="card-image"
                     />
                   </div>

                   {isSelected && (
                     <div className="card-details">
                       <div className="detail-row">
                         <span className="detail-label">Event:</span>
                         <span className="detail-value">{data?.title || p.query}</span>
                       </div>
                       <div className="detail-row" style={{ marginTop: '4px' }}>
                         <span className="detail-label">Region:</span>
                         <span className="detail-value">{p.region}</span>
                       </div>
                       <div className="detail-row" style={{ marginTop: '4px' }}>
                         <span className="detail-label">Focus:</span>
                         <span className="detail-value">{p.detail}</span>
                       </div>
                       
                       <div className="card-extract">
                         {data?.extract || 'Loading summary from Wikipedia...'}
                       </div>

                       {data?.url && (
                         <a 
                           href={data.url} target="_blank" rel="noreferrer"
                           className="card-link"
                         >
                           Read more on Wikipedia ↗
                         </a>
                       )}
                     </div>
                   )}
                 </div>
               </div>
             );
          })}
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      {selected && (
        <div className="bottom-bar">
          <span className="selected-id">Selected: {selected.query}</span>
          <button className="view-btn" onClick={() => { if(wikiData[selected.id]?.url) window.open(wikiData[selected.id].url, '_blank') }}>
            Wikipedia Article
          </button>
        </div>
      )}
    </div>
  );
}
