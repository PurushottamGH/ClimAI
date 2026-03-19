import { useState, useRef, useEffect, useCallback } from 'react';
import './EventsTimeline.css';

const TIMELINE_EVENTS = [
  {
    id: "EVT-2021-01",
    query: "2021 Western North America heat wave",
    category: "Extreme Heat",
    type: "heatwave",
    x: 240, y: 440,
    region: "North America",
    detail: "Category: Heatwave",
  },
  {
    id: "EVT-2021-02",
    query: "2021 European floods",
    category: "Flood",
    type: "flood",
    x: 620, y: 250,
    region: "Europe",
    detail: "Category: Catastrophic Flooding",
  },
  {
    id: "EVT-2022-01",
    query: "2022 Pakistan floods",
    category: "Flood",
    type: "flood",
    x: 700, y: 590,
    region: "Asia",
    detail: "Category: Mega Flood",
  },
  {
    id: "EVT-2022-02",
    query: "2022 Hunga Tonga–Hunga Haʻapai eruption",
    category: "Volcano / Tsunami",
    type: "volcano",
    x: 100, y: 130,
    region: "Pacific",
    detail: "Category: Submarine Eruption",
  },
  {
    id: "EVT-2023-01",
    query: "2023 Turkey–Syria earthquake",
    category: "Earthquake",
    type: "earthquake",
    x: 950, y: 100,
    region: "Middle East",
    detail: "Category: Seismic",
  },
  {
    id: "EVT-2023-02",
    query: "2023 Hawaii wildfires",
    category: "Wildfire",
    type: "wildfire",
    x: 1100, y: 400,
    region: "Pacific",
    detail: "Category: Wildfire",
  },
  {
    id: "EVT-2024-01",
    query: "2024 Noto earthquake",
    category: "Earthquake",
    type: "earthquake",
    x: 50, y: 700,
    region: "Asia",
    detail: "Category: Seismic",
  },
  {
    id: "EVT-2024-02",
    query: "2024 Atlantic hurricane season",
    category: "Cyclone",
    type: "cyclone",
    x: 400, y: 780,
    region: "Atlantic Basin",
    detail: "Category: Hurricane",
  }
];

const FILTERS = {
  type: ["earthquake", "flood", "heatwave", "cyclone", "volcano", "wildfire"],
  region: ["North America", "Europe", "Asia", "Pacific", "Middle East", "Atlantic Basin"]
};

const NAV_ITEMS = ["Events Timeline", "Index", "About", "Contact"];

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
      const cx1 = ax + (bx - ax) * 0.5 + (Math.sin(i * 2) * 120);
      const cy1 = ay - 80 + (Math.cos(i * 3) * 60);
      const cx2 = bx - (bx - ax) * 0.5 + (Math.cos(i * 2) * 120);
      const cy2 = by + 80 + (Math.sin(i * 3) * 60);
      paths.push(`M ${ax} ${ay} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${bx} ${by}`);
    }
    if (TIMELINE_EVENTS.length > 3) {
      const a = TIMELINE_EVENTS[0], b = TIMELINE_EVENTS[3];
      paths.push(`M ${a.x+60} ${a.y+30} C ${a.x+200} ${a.y-100}, ${b.x-200} ${b.y+200}, ${b.x+60} ${b.y+30}`);
    }
    if (TIMELINE_EVENTS.length > 5) {
      const a = TIMELINE_EVENTS[2], b = TIMELINE_EVENTS[5];
      paths.push(`M ${a.x+60} ${a.y+30} C ${a.x+300} ${a.y+300}, ${b.x-200} ${b.y-100}, ${b.x+60} ${b.y+30}`);
    }
    return paths;
  };

  const selected = TIMELINE_EVENTS.find((p) => p.id === selectedProject);

  return (
    <div className="events-timeline-container">
      {/* ── Top Nav Header ── */}
      <header className="events-header">
        <div className="header-left">
          <span className="header-brand">ClimAI</span>
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              className={`nav-btn ${item === "Events Timeline" ? "active" : ""}`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="header-filters-group">
          {Object.entries(FILTERS).map(([group, items]) => (
            <div key={group} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: '#555', minWidth: '50px' }}>{group}:</span>
              {items.map((item) => (
                <button
                  key={String(item)}
                  onClick={() => toggleFilter(String(item))}
                  className={`filter-item-btn ${activeFilters.includes(String(item)) ? "active" : ""}`}
                >
                  {item}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* ── Controls (Clear, Zoom) ── */}
        <div className="header-controls">
          <button onClick={clearFilters} className="clear-btn">
            Clear Filters
          </button>
          <div className="zoom-slider-container">
            <div className="zoom-slider-track">
              <input
                type="range"
                min={0.3}
                max={2}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="zoom-slider-input"
              />
              <div
                className="zoom-slider-thumb"
                style={{ left: `${((zoom - 0.3) / 1.7) * 100}%`, transform: "translate(-50%, -50%)" }}
              />
            </div>
          </div>
        </div>
      </header>

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
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
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
             if (activeFilters.length > 0 && !activeFilters.includes(p.type) && !activeFilters.includes(p.region)) {
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
