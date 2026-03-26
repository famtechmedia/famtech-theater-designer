import React, { useMemo, useState } from "react";

const ATMOS_LAYOUTS = {
  "5.1.2": { surround: 2, height: 2, sub: 1 },
  "5.1.4": { surround: 2, height: 4, sub: 1 },
  "7.1.2": { surround: 4, height: 2, sub: 1 },
  "7.1.4": { surround: 4, height: 4, sub: 1 },
  "7.2.4": { surround: 4, height: 4, sub: 2 },
  "9.2.4": { surround: 6, height: 4, sub: 2 },
  "9.2.6": { surround: 6, height: 6, sub: 2 },
};

const SEATING_TYPES = {
  loveseat: { label: "Loveseat", width: 70 },
  row3: { label: "Row of 3", width: 102 },
  row4: { label: "Row of 4", width: 134 },
  row5: { label: "Row of 5", width: 166 },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function useScale(roomWidth, roomDepth) {
  const canvas = 560;
  const padding = 48;
  const scale = Math.min((canvas - padding * 2) / roomWidth, (canvas - padding * 2) / roomDepth);
  return { canvas, padding, scale };
}

function speakerDots(layout, roomWidth, roomDepth) {
  const cfg = ATMOS_LAYOUTS[layout];
  const centerX = roomWidth / 2;
  const fronts = [
    { x: centerX - 3.5, y: 2.2, label: "L" },
    { x: centerX, y: 1.7, label: "C" },
    { x: centerX + 3.5, y: 2.2, label: "R" },
  ];

  const surrounds = [];
  if (cfg.surround >= 2) {
    surrounds.push(
      { x: 2.2, y: roomDepth * 0.62, label: "SL" },
      { x: roomWidth - 2.2, y: roomDepth * 0.62, label: "SR" }
    );
  }
  if (cfg.surround >= 4) {
    surrounds.push(
      { x: 2.1, y: roomDepth * 0.85, label: "SBL" },
      { x: roomWidth - 2.1, y: roomDepth * 0.85, label: "SBR" }
    );
  }
  if (cfg.surround >= 6) {
    surrounds.push(
      { x: 1.9, y: roomDepth * 0.45, label: "FWL" },
      { x: roomWidth - 1.9, y: roomDepth * 0.45, label: "FWR" }
    );
  }

  const heights = [];
  if (cfg.height === 2) {
    heights.push(
      { x: centerX - 2, y: roomDepth * 0.45, label: "TML" },
      { x: centerX + 2, y: roomDepth * 0.45, label: "TMR" }
    );
  }
  if (cfg.height === 4) {
    heights.push(
      { x: centerX - 2.5, y: roomDepth * 0.28, label: "TFL" },
      { x: centerX + 2.5, y: roomDepth * 0.28, label: "TFR" },
      { x: centerX - 2.5, y: roomDepth * 0.68, label: "TRL" },
      { x: centerX + 2.5, y: roomDepth * 0.68, label: "TRR" }
    );
  }
  if (cfg.height === 6) {
    heights.push(
      { x: centerX - 2.5, y: roomDepth * 0.22, label: "TFL" },
      { x: centerX + 2.5, y: roomDepth * 0.22, label: "TFR" },
      { x: centerX - 2, y: roomDepth * 0.46, label: "TML" },
      { x: centerX + 2, y: roomDepth * 0.46, label: "TMR" },
      { x: centerX - 2.5, y: roomDepth * 0.74, label: "TRL" },
      { x: centerX + 2.5, y: roomDepth * 0.74, label: "TRR" }
    );
  }

  const subs = cfg.sub === 2
    ? [
        { x: centerX - 5, y: 1.2, label: "SUB" },
        { x: centerX + 5, y: 1.2, label: "SUB" },
      ]
    : [{ x: centerX, y: 1.2, label: "SUB" }];

  return { fronts, surrounds, heights, subs };
}

function exportSummary(config) {
  const lines = [
    "Fam Tech Media – Theater Designer Summary",
    `Room: ${config.roomWidth}ft W x ${config.roomDepth}ft D x ${config.roomHeight}ft H`,
    `Screen: ${config.screenSize}" ${config.displayType === "projector" ? "Projection Screen" : "TV"}`,
    `Layout: ${config.atmosLayout}`,
    `Rows: ${config.rows}`,
    `Seats Per Row: ${SEATING_TYPES[config.seatingType].label}`,
    `Riser: ${config.rows > 1 ? `${config.riserHeight}"` : "Not required"}`,
    `Viewing Distance: ${config.mainViewingDistance}ft`,
    `Project Goal: ${config.goal}`,
  ].join("\n");

  const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "famtech-theater-design.txt";
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [roomWidth, setRoomWidth] = useState(14);
  const [roomDepth, setRoomDepth] = useState(20);
  const [roomHeight, setRoomHeight] = useState(9);
  const [screenSize, setScreenSize] = useState(120);
  const [displayType, setDisplayType] = useState("projector");
  const [atmosLayout, setAtmosLayout] = useState("7.2.4");
  const [rows, setRows] = useState(2);
  const [seatingType, setSeatingType] = useState("row4");
  const [riserHeight, setRiserHeight] = useState(12);
  const [goal, setGoal] = useState("Dedicated theater");

  const mainViewingDistance = useMemo(() => {
    const diagFeet = screenSize / 12;
    return clamp(Number((diagFeet * 1.7).toFixed(1)), 8, roomDepth - 4);
  }, [screenSize, roomDepth]);

  const room = useMemo(
    () => ({ roomWidth, roomDepth, roomHeight, screenSize, displayType, atmosLayout, rows, seatingType, riserHeight, goal, mainViewingDistance }),
    [roomWidth, roomDepth, roomHeight, screenSize, displayType, atmosLayout, rows, seatingType, riserHeight, goal, mainViewingDistance]
  );

  const { canvas, padding, scale } = useScale(roomWidth, roomDepth);
  const speakerMap = speakerDots(atmosLayout, roomWidth, roomDepth);

  const seatWidthFt = SEATING_TYPES[seatingType].width / 12;
  const usableSeatWidth = Math.min(seatWidthFt, roomWidth - 2.2);
  const rowDepth = 3.2;
  const firstRowY = clamp(mainViewingDistance, 7, roomDepth - 7.5);
  const secondRowY = firstRowY + 4.5;
  const thirdRowY = Math.min(secondRowY + 4.5, roomDepth - 4.2);
  const screenWidthFt = clamp(screenSize * 0.0726, 6, roomWidth - 2);
  const px = (ft) => padding + ft * scale;

  return (
    <div className="page">
      <div className="shell">
        <aside className="panel">
          <div className="brand-row">
            <div>
              <div className="eyebrow">Fam Tech Media</div>
              <h1>Home Theater Designer</h1>
              <p className="muted">Beginner-friendly prototype for room planning, seating, screen size, and Dolby Atmos layout selection.</p>
            </div>
            <span className="pill">Version 1</span>
          </div>

          <section className="group">
            <h2>1. Room Size</h2>
            <div className="grid3">
              <label>
                <span>Width (ft)</span>
                <input type="number" value={roomWidth} min="8" max="40" onChange={(e) => setRoomWidth(Number(e.target.value || 0))} />
              </label>
              <label>
                <span>Depth (ft)</span>
                <input type="number" value={roomDepth} min="10" max="50" onChange={(e) => setRoomDepth(Number(e.target.value || 0))} />
              </label>
              <label>
                <span>Height (ft)</span>
                <input type="number" value={roomHeight} min="7" max="20" onChange={(e) => setRoomHeight(Number(e.target.value || 0))} />
              </label>
            </div>
          </section>

          <section className="group">
            <h2>2. Screen + Display</h2>
            <label>
              <span>Screen Size: {screenSize}"</span>
              <input type="range" min="75" max="180" step="1" value={screenSize} onChange={(e) => setScreenSize(Number(e.target.value))} />
            </label>
            <label>
              <span>Display Type</span>
              <select value={displayType} onChange={(e) => setDisplayType(e.target.value)}>
                <option value="projector">Projector + Screen</option>
                <option value="tv">Large Format TV</option>
              </select>
            </label>
          </section>

          <section className="group">
            <h2>3. Audio Layout</h2>
            <label>
              <span>Dolby Atmos Layout</span>
              <select value={atmosLayout} onChange={(e) => setAtmosLayout(e.target.value)}>
                {Object.keys(ATMOS_LAYOUTS).map((layout) => (
                  <option key={layout} value={layout}>{layout}</option>
                ))}
              </select>
            </label>
          </section>

          <section className="group">
            <h2>4. Seating</h2>
            <div className="grid2">
              <label>
                <span>Rows</span>
                <select value={rows} onChange={(e) => setRows(Number(e.target.value))}>
                  <option value="1">1 Row</option>
                  <option value="2">2 Rows</option>
                  <option value="3">3 Rows</option>
                </select>
              </label>
              <label>
                <span>Seats Per Row</span>
                <select value={seatingType} onChange={(e) => setSeatingType(e.target.value)}>
                  {Object.entries(SEATING_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </label>
            </div>
            {rows > 1 && (
              <label>
                <span>Riser Height: {riserHeight}"</span>
                <input type="range" min="8" max="18" step="1" value={riserHeight} onChange={(e) => setRiserHeight(Number(e.target.value))} />
              </label>
            )}
          </section>

          <section className="group">
            <h2>5. Project Goal</h2>
            <label>
              <span>Room Type</span>
              <select value={goal} onChange={(e) => setGoal(e.target.value)}>
                <option>Dedicated theater</option>
                <option>Media room</option>
                <option>Living room upgrade</option>
                <option>Gaming + cinema</option>
              </select>
            </label>
          </section>

          <section className="summary-cards">
            <div className="card"><strong>{screenSize}"</strong><span>{displayType === "projector" ? "Projection" : "TV"}</span></div>
            <div className="card"><strong>{atmosLayout}</strong><span>Dolby Atmos</span></div>
            <div className="card"><strong>{rows} row(s)</strong><span>{SEATING_TYPES[seatingType].label}</span></div>
            <div className="card"><strong>{mainViewingDistance} ft</strong><span>View Distance</span></div>
          </section>

          <div className="button-row">
            <button className="primary" onClick={() => exportSummary(room)}>Download Summary</button>
            <button
              className="secondary"
              onClick={() => {
                setRoomWidth(14);
                setRoomDepth(20);
                setRoomHeight(9);
                setScreenSize(120);
                setDisplayType("projector");
                setAtmosLayout("7.2.4");
                setRows(2);
                setSeatingType("row4");
                setRiserHeight(12);
                setGoal("Dedicated theater");
              }}
            >
              Reset
            </button>
          </div>
        </aside>

        <main className="visual">
          <div className="visual-card">
            <div className="visual-head">
              <div>
                <h2>Room Layout Preview</h2>
                <p className="muted">This is not full cinematic 3D yet. It is your Phase 1 live planner and is perfect for getting the tool online first.</p>
              </div>
              <span className="pill dark">{roomWidth}' × {roomDepth}'</span>
            </div>

            <div className="canvas-wrap">
              <svg width={canvas} height={canvas} viewBox={`0 0 ${canvas} ${canvas}`} className="room-svg">
                <rect x={padding} y={padding} width={roomWidth * scale} height={roomDepth * scale} rx="24" fill="#141418" stroke="#3f3f46" strokeWidth="2" />

                <rect
                  x={px((roomWidth - screenWidthFt) / 2)}
                  y={px(0.45)}
                  width={screenWidthFt * scale}
                  height="12"
                  rx="6"
                  fill="#d4d4d8"
                />
                <text x={canvas / 2} y={px(0.32)} textAnchor="middle" fontSize="11" fill="#a1a1aa">
                  {displayType === "projector" ? "Projection Screen" : "Display Wall"}
                </text>

                {speakerMap.fronts.map((sp, i) => (
                  <g key={`f-${i}`}>
                    <circle cx={px(sp.x)} cy={px(sp.y)} r="9" fill="#f59e0b" />
                    <text x={px(sp.x)} y={px(sp.y) + 3} textAnchor="middle" fontSize="8" fill="#111827">{sp.label}</text>
                  </g>
                ))}

                {speakerMap.surrounds.map((sp, i) => (
                  <g key={`s-${i}`}>
                    <circle cx={px(sp.x)} cy={px(sp.y)} r="8" fill="#38bdf8" />
                    <text x={px(sp.x)} y={px(sp.y) + 3} textAnchor="middle" fontSize="7" fill="#082f49">{sp.label}</text>
                  </g>
                ))}

                {speakerMap.heights.map((sp, i) => (
                  <g key={`h-${i}`}>
                    <circle cx={px(sp.x)} cy={px(sp.y)} r="7" fill="#a78bfa" />
                    <text x={px(sp.x)} y={px(sp.y) + 3} textAnchor="middle" fontSize="6.5" fill="#1e1b4b">{sp.label}</text>
                  </g>
                ))}

                {speakerMap.subs.map((sp, i) => (
                  <g key={`sub-${i}`}>
                    <rect x={px(sp.x) - 10} y={px(sp.y) - 8} width="20" height="16" rx="4" fill="#34d399" />
                    <text x={px(sp.x)} y={px(sp.y) + 3} textAnchor="middle" fontSize="6.5" fill="#022c22">{sp.label}</text>
                  </g>
                ))}

                <rect
                  x={px((roomWidth - usableSeatWidth) / 2)}
                  y={px(firstRowY)}
                  width={usableSeatWidth * scale}
                  height={rowDepth * scale}
                  rx="18"
                  fill="#27272a"
                  stroke="#71717a"
                />
                <text x={canvas / 2} y={px(firstRowY + 1.9)} textAnchor="middle" fontSize="12" fill="#e4e4e7">Row 1</text>

                {rows > 1 && (
                  <>
                    <rect
                      x={px((roomWidth - usableSeatWidth) / 2)}
                      y={px(secondRowY)}
                      width={usableSeatWidth * scale}
                      height={rowDepth * scale}
                      rx="18"
                      fill="#3f3f46"
                      stroke="#a1a1aa"
                    />
                    <text x={canvas / 2} y={px(secondRowY + 1.9)} textAnchor="middle" fontSize="12" fill="#fafafa">Row 2 · {riserHeight}" riser</text>
                  </>
                )}

                {rows > 2 && (
                  <>
                    <rect
                      x={px((roomWidth - usableSeatWidth) / 2)}
                      y={px(thirdRowY)}
                      width={usableSeatWidth * scale}
                      height={rowDepth * scale}
                      rx="18"
                      fill="#52525b"
                      stroke="#d4d4d8"
                    />
                    <text x={canvas / 2} y={px(thirdRowY + 1.9)} textAnchor="middle" fontSize="12" fill="#fafafa">Row 3</text>
                  </>
                )}

                <line x1={canvas / 2} y1={px(0.8)} x2={canvas / 2} y2={px(firstRowY)} stroke="#fbbf24" strokeDasharray="6 5" />
                <text x={canvas / 2 + 10} y={px(firstRowY / 2)} fontSize="11" fill="#fcd34d">{mainViewingDistance} ft viewing distance</text>
              </svg>
            </div>

            <div className="next-steps">
              <div className="mini-card">
                <h3>What this does now</h3>
                <p>Lets visitors choose room size, seating, screen, and Dolby Atmos layout.</p>
              </div>
              <div className="mini-card">
                <h3>What comes next</h3>
                <p>Lead form, scheduling button, then a more advanced 3D room scene.</p>
              </div>
              <div className="mini-card">
                <h3>Why this is good</h3>
                <p>It gets a real interactive tool on your site fast instead of waiting for a giant perfect version.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
