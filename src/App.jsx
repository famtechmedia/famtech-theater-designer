import React, { useMemo, useState } from "react";
import "./styles.css";

const LAYOUTS = {
  "5.1.2": { surrounds: 2, rears: 0, heights: 2, subs: 1 },
  "5.1.4": { surrounds: 2, rears: 0, heights: 4, subs: 1 },
  "7.1.2": { surrounds: 2, rears: 2, heights: 2, subs: 1 },
  "7.1.4": { surrounds: 2, rears: 2, heights: 4, subs: 1 },
  "7.2.4": { surrounds: 2, rears: 2, heights: 4, subs: 2 },
  "9.2.4": { surrounds: 2, rears: 2, heights: 4, subs: 2, wides: 2 },
};

const SEATING = {
  loveseat: { label: "Loveseat", seats: 2, width: 6.2 },
  row3: { label: "Row of 3", seats: 3, width: 8.6 },
  row4: { label: "Row of 4", seats: 4, width: 11.0 },
  row5: { label: "Row of 5", seats: 5, width: 13.5 },
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function feetToPx(feet, pad, scale) {
  return pad + feet * scale;
}

function useRoomScale(width, depth) {
  const canvas = 920;
  const pad = 56;
  const scale = Math.min((canvas - pad * 2) / width, (canvas - pad * 2) / depth);
  return { canvas, pad, scale };
}

function recommendedScreen(roomWidth, roomDepth) {
  const usableWidth = Math.max(roomWidth - 2.4, 8);
  const maxByWall = Math.floor(usableWidth / 0.0726);
  const idealDistance = clamp(roomDepth * 0.56, 8, roomDepth - 6);
  const idealDiag = Math.round((idealDistance / 1.7) * 12);
  const min = clamp(Math.round(idealDiag * 0.9), 80, 160);
  const max = clamp(Math.min(Math.round(idealDiag * 1.1), maxByWall), min, 180);
  return { min, max };
}

function buildLayout({ roomWidth, roomDepth, screenSize, layoutKey, rows, seatingKey }) {
  const layout = LAYOUTS[layoutKey];
  const seating = SEATING[seatingKey];

  const stageDepth = 3.6;
  const frontWalk = 1.8;
  const rowDepth = 3.2;
  const rowGap = 1.5;
  const rearClearance = layout.rears ? 3.4 : 2.2;
  const sideClearance = layout.wides ? 1.8 : 1.2;

  const seatingWidthNeeded = seating.width + sideClearance * 2;
  const rowsDepthNeeded = rows * rowDepth + (rows - 1) * rowGap;
  const depthNeeded = stageDepth + frontWalk + rowsDepthNeeded + rearClearance + 3.4;

  const screenRange = recommendedScreen(roomWidth, roomDepth);
  const issues = [];

  if (roomWidth < seatingWidthNeeded) {
    issues.push(`Room width is too small for ${seating.label}. Increase room width or choose a smaller seating row.`);
  }
  if (roomDepth < depthNeeded) {
    issues.push(`Room depth is too small for ${rows} row(s). Increase room depth or reduce the number of rows.`);
  }
  if (screenSize > screenRange.max) {
    issues.push(`Selected screen is too large. Recommended screen size for this room is ${screenRange.min}"-${screenRange.max}".`);
  }

  const isValid = issues.length === 0;
  const viewingDistance = clamp(Number(((screenSize / 12) * 1.7).toFixed(1)), 8, roomDepth - 6.5);
  const firstRowY = viewingDistance - 1.6;

  const rowsData = Array.from({ length: rows }).map((_, i) => ({
    x: (roomWidth - Math.min(seating.width, roomWidth - 2.0)) / 2,
    y: firstRowY + i * (rowDepth + rowGap),
    width: Math.min(seating.width, roomWidth - 2.0),
    depth: rowDepth,
    seats: seating.seats,
    label: `Row ${i + 1}`,
  }));

  const centerX = roomWidth / 2;
  const screenWidth = clamp(screenSize * 0.0726, 6, roomWidth - 2.4);

  const mlpY = rowsData[0] ? rowsData[0].y + rowDepth / 2 : roomDepth * 0.6;
  const rearY = rowsData.length ? clamp(rowsData[rowsData.length - 1].y + rowDepth + 1.1, roomDepth - 2.5, roomDepth - 1.9) : roomDepth - 2.1;

  const riser = rows > 1
    ? {
        x: rowsData[1].x - 0.35,
        y: rowsData[1].y - 0.55,
        width: rowsData[1].width + 0.7,
        depth: rowsData[rowsData.length - 1].y + rowDepth - rowsData[1].y + 0.85,
        height: rows === 2 ? 12 : 14,
      }
    : null;

  return {
    isValid,
    issues,
    viewingDistance,
    screenRange,
    rowsData,
    riser,
    projector: { x: centerX, y: clamp((screenSize / 12) * 1.35, 9, roomDepth - 2.1) },
    screen: { x: centerX, width: screenWidth },
    speakers: {
      fronts: [
        { x: centerX - 3.5, y: 2.0, label: "L" },
        { x: centerX, y: 1.65, label: "C" },
        { x: centerX + 3.5, y: 2.0, label: "R" },
      ],
      wides: layout.wides
        ? [
            { x: 1.7, y: roomDepth * 0.34, label: "FWL" },
            { x: roomWidth - 1.7, y: roomDepth * 0.34, label: "FWR" },
          ]
        : [],
      surrounds: [
        { x: 1.55, y: clamp(mlpY, roomDepth * 0.48, roomDepth * 0.72), label: "SL" },
        { x: roomWidth - 1.55, y: clamp(mlpY, roomDepth * 0.48, roomDepth * 0.72), label: "SR" },
      ],
      rears: layout.rears
        ? [
            { x: 1.9, y: rearY, label: "SBL" },
            { x: roomWidth - 1.9, y: rearY, label: "SBR" },
          ]
        : [],
      heights:
        layout.heights === 2
          ? [
              { x: centerX - 2.2, y: mlpY - 1.8, label: "TML" },
              { x: centerX + 2.2, y: mlpY - 1.8, label: "TMR" },
            ]
          : [
              { x: centerX - 2.8, y: Math.max(4.2, mlpY - 4.0), label: "TFL" },
              { x: centerX + 2.8, y: Math.max(4.2, mlpY - 4.0), label: "TFR" },
              { x: centerX - 2.8, y: Math.min(roomDepth - 4.0, mlpY + 3.0), label: "TRL" },
              { x: centerX + 2.8, y: Math.min(roomDepth - 4.0, mlpY + 3.0), label: "TRR" },
            ],
      subs:
        layout.subs === 2
          ? [
              { x: centerX - 5.1, y: 1.25, label: "SUB" },
              { x: centerX + 5.1, y: 1.25, label: "SUB" },
            ]
          : [{ x: centerX, y: 1.25, label: "SUB" }],
    },
    acoustic: {
      side: [
        { x: 0.6, y: mlpY - 1.6, width: 0.22, height: 3.0 },
        { x: roomWidth - 0.82, y: mlpY - 1.6, width: 0.22, height: 3.0 },
      ],
      rear: [
        { x: centerX - 2.2, y: roomDepth - 0.75, width: 1.45, height: 0.2 },
        { x: centerX + 0.75, y: roomDepth - 0.75, width: 1.45, height: 0.2 },
      ],
    },
  };
}

function Speaker({ x, y, label, type, pad, scale }) {
  const cx = feetToPx(x, pad, scale);
  const cy = feetToPx(y, pad, scale);

  if (type === "sub") {
    return (
      <g>
        <rect x={cx - 13} y={cy - 10} width="26" height="20" rx="5" fill="#16b8a0" stroke="#7ce8d5" />
        <circle cx={cx} cy={cy} r="4.5" fill="#073b37" />
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize="9" fill="#ccfbf1">{label}</text>
      </g>
    );
  }

  if (type === "height") {
    return (
      <g>
        <circle cx={cx} cy={cy} r="10.5" fill="#ece8ff" stroke="#a78bfa" strokeWidth="1.4" />
        <circle cx={cx} cy={cy} r="4.1" fill="#7c3aed" />
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize="8" fill="#ddd6fe">{label}</text>
      </g>
    );
  }

  if (type === "tower") {
    return (
      <g>
        <rect x={cx - 8} y={cy - 15} width="16" height="30" rx="4" fill="#f5deb3" stroke="#d4a24c" />
        <circle cx={cx} cy={cy - 5} r="3" fill="#35353b" />
        <circle cx={cx} cy={cy + 5} r="4.1" fill="#26262b" />
        <text x={cx} y={cy + 24} textAnchor="middle" fontSize="8" fill="#f8e6bf">{label}</text>
      </g>
    );
  }

  return (
    <g>
      <rect x={cx - 10} y={cy - 12} width="20" height="24" rx="4" fill="#efd8af" stroke="#c7902c" />
      <circle cx={cx} cy={cy - 3.2} r="3" fill="#3b3b42" />
      <circle cx={cx} cy={cy + 5.0} r="4.8" fill="#27272d" />
      <text x={cx} y={cy + 23} textAnchor="middle" fontSize="8" fill="#f8e6bf">{label}</text>
    </g>
  );
}

function Projector({ x, y, pad, scale }) {
  const cx = feetToPx(x, pad, scale);
  const cy = feetToPx(y, pad, scale);
  return (
    <g>
      <rect x={cx - 18} y={cy - 9} width="36" height="18" rx="4" fill="#cfd8e5" stroke="#94a3b8" />
      <circle cx={cx + 9} cy={cy} r="4" fill="#0f172a" />
      <rect x={cx - 12} y={cy + 9} width="24" height="3" rx="1.5" fill="#64748b" />
      <text x={cx} y={cy - 14} textAnchor="middle" fontSize="9" fill="#e2e8f0">Projector</text>
    </g>
  );
}

function SeatRow({ row, pad, scale }) {
  const gap = 0.14;
  const innerWidth = row.width - 0.34;
  const seatWidth = (innerWidth - gap * (row.seats - 1)) / row.seats;
  const baseX = row.x + 0.17;
  const baseY = row.y + 0.18;
  const seatDepth = row.depth - 0.44;

  return (
    <g>
      <rect x={feetToPx(row.x, pad, scale)} y={feetToPx(row.y, pad, scale)} width={row.width * scale} height={row.depth * scale} rx="18" fill="#212127" stroke="#5b5b65" />
      {Array.from({ length: row.seats }).map((_, i) => {
        const sx = baseX + i * (seatWidth + gap);
        return (
          <g key={i}>
            <rect x={feetToPx(sx, pad, scale)} y={feetToPx(baseY + 0.66, pad, scale)} width={seatWidth * scale} height={(seatDepth - 0.72) * scale} rx="12" fill="#4d4d58" stroke="#858590" />
            <rect x={feetToPx(sx + 0.08, pad, scale)} y={feetToPx(baseY + 0.18, pad, scale)} width={(seatWidth - 0.16) * scale} height={0.65 * scale} rx="10" fill="#6b6b77" />
            <rect x={feetToPx(sx - 0.05, pad, scale)} y={feetToPx(baseY + 0.76, pad, scale)} width={0.08 * scale} height={(seatDepth - 0.9) * scale} rx="4" fill="#8a8a95" />
            <rect x={feetToPx(sx + seatWidth - 0.03, pad, scale)} y={feetToPx(baseY + 0.76, pad, scale)} width={0.08 * scale} height={(seatDepth - 0.9) * scale} rx="4" fill="#8a8a95" />
          </g>
        );
      })}
      <text x={feetToPx(row.x + row.width / 2, pad, scale)} y={feetToPx(row.y + row.depth / 2 + 0.08, pad, scale)} textAnchor="middle" fontSize="10.5" fill="#f5f5f5">
        {row.label}
      </text>
    </g>
  );
}

export default function App() {
  const [roomWidth, setRoomWidth] = useState(15);
  const [roomDepth, setRoomDepth] = useState(22);
  const [roomHeight, setRoomHeight] = useState(9);
  const [screenSize, setScreenSize] = useState(120);
  const [layoutKey, setLayoutKey] = useState("7.2.4");
  const [rows, setRows] = useState(2);
  const [seatingKey, setSeatingKey] = useState("row4");
  const [bedType, setBedType] = useState("inwall");
  const [showAcoustic, setShowAcoustic] = useState(false);

  const layout = useMemo(
    () => buildLayout({ roomWidth, roomDepth, screenSize, layoutKey, rows, seatingKey }),
    [roomWidth, roomDepth, screenSize, layoutKey, rows, seatingKey]
  );

  const { canvas, pad, scale } = useRoomScale(roomWidth, roomDepth);
  const canUseThreeRows = buildLayout({ roomWidth, roomDepth, screenSize, layoutKey, rows: 3, seatingKey }).isValid;

  const onRowsChange = (value) => {
    const next = Number(value);
    const test = buildLayout({ roomWidth, roomDepth, screenSize, layoutKey, rows: next, seatingKey });
    if (test.isValid) setRows(next);
  };

  const onScreenChange = (value) => {
    const next = Number(value);
    const test = buildLayout({ roomWidth, roomDepth, screenSize: next, layoutKey, rows, seatingKey });
    if (next <= test.screenRange.max) setScreenSize(next);
  };

  return (
    <div className="premium-page">
      <div className="premium-shell">
        <aside className="controls-card">
          <div className="controls-head">
            <div>
              <div className="eyebrow">Fam Tech Media</div>
              <h1>Premium Theater Designer</h1>
              <p>Cleaner visuals, projector-first planning, blocked invalid layouts, and a more premium top-view presentation.</p>
            </div>
            <div className="badge">Premium V1</div>
          </div>

          <section className="control-section">
            <h2>1. Room Size</h2>
            <div className="grid-three">
              <label><span>Width</span><input type="number" value={roomWidth} onChange={(e) => setRoomWidth(Number(e.target.value || 0))} /></label>
              <label><span>Depth</span><input type="number" value={roomDepth} onChange={(e) => setRoomDepth(Number(e.target.value || 0))} /></label>
              <label><span>Height</span><input type="number" value={roomHeight} onChange={(e) => setRoomHeight(Number(e.target.value || 0))} /></label>
            </div>
          </section>

          <section className="control-section">
            <h2>2. Screen</h2>
            <label><span>Screen Size: {screenSize}"</span><input type="range" min="80" max="180" value={screenSize} onChange={(e) => onScreenChange(e.target.value)} /></label>
            <div className="support-text">Recommended size for this room: {layout.screenRange.min}"-{layout.screenRange.max}"</div>
          </section>

          <section className="control-section">
            <h2>3. Audio Layout</h2>
            <label><span>Dolby Atmos Layout</span><select value={layoutKey} onChange={(e) => setLayoutKey(e.target.value)}>{Object.keys(LAYOUTS).map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Speaker Style</span><select value={bedType} onChange={(e) => setBedType(e.target.value)}><option value="inwall">In-Wall</option><option value="tower">Floorstanding</option></select></label>
          </section>

          <section className="control-section">
            <h2>4. Seating</h2>
            <div className="grid-two">
              <label><span>Rows</span><select value={rows} onChange={(e) => onRowsChange(e.target.value)}><option value={1}>1 Row</option><option value={2}>2 Rows</option><option value={3} disabled={!canUseThreeRows}>3 Rows {!canUseThreeRows ? "(blocked)" : ""}</option></select></label>
              <label><span>Seats Per Row</span><select value={seatingKey} onChange={(e) => setSeatingKey(e.target.value)}>{Object.entries(SEATING).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
            </div>
          </section>

          <section className="control-section">
            <h2>5. Room Enhancements</h2>
            <button className="toggle-button" onClick={() => setShowAcoustic((v) => !v)}>
              {showAcoustic ? "Hide Acoustic Panels" : "Show Acoustic Panels"}
            </button>
          </section>

          <div className="stats-grid">
            <div className="stat"><div className="stat-label">Viewing Distance</div><div className="stat-value">{layout.viewingDistance} ft</div></div>
            <div className="stat"><div className="stat-label">Layout</div><div className="stat-value">{layoutKey}</div></div>
            <div className="stat"><div className="stat-label">Projector Throw</div><div className="stat-value">{layout.projector.y.toFixed(1)} ft</div></div>
            <div className="stat"><div className="stat-label">Room Size</div><div className="stat-value">{roomWidth}' × {roomDepth}'</div></div>
          </div>

          {!layout.isValid && (
            <div className="warning-card">
              <div className="warning-title">Layout blocked</div>
              <ul>
                {layout.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
              </ul>
            </div>
          )}
        </aside>

        <main className="canvas-card">
          <div className="canvas-top">
            <div>
              <h2>Top View Theater Layout</h2>
              <p>This version is focused on a much cleaner premium look while keeping the room-planning logic intact.</p>
            </div>
            <div className="room-tag">{roomWidth}' × {roomDepth}'</div>
          </div>

          <div className="room-stage">
            <svg width={canvas} height={canvas} viewBox={`0 0 ${canvas} ${canvas}`} className="room-svg">
              <defs>
                <radialGradient id="roomGlow" cx="50%" cy="0%" r="80%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </radialGradient>
                <linearGradient id="roomFill" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#17171c" />
                  <stop offset="100%" stopColor="#0d0d11" />
                </linearGradient>
              </defs>

              <rect x={pad} y={pad} width={roomWidth * scale} height={roomDepth * scale} rx="30" fill="url(#roomFill)" stroke="#41414a" strokeWidth="2" />
              <rect x={pad} y={pad} width={roomWidth * scale} height={roomDepth * scale} rx="30" fill="url(#roomGlow)" />

              {showAcoustic && layout.acoustic.side.map((panel, i) => (
                <rect key={`side-${i}`} x={feetToPx(panel.x, pad, scale)} y={feetToPx(panel.y, pad, scale)} width={panel.width * scale} height={panel.height * scale} rx="6" fill="#204ea7" opacity="0.58" />
              ))}
              {showAcoustic && layout.acoustic.rear.map((panel, i) => (
                <rect key={`rear-${i}`} x={feetToPx(panel.x, pad, scale)} y={feetToPx(panel.y, pad, scale)} width={panel.width * scale} height={panel.height * scale} rx="5" fill="#204ea7" opacity="0.58" />
              ))}

              <rect x={feetToPx(layout.screen.x - layout.screen.width / 2, pad, scale)} y={feetToPx(0.48, pad, scale)} width={layout.screen.width * scale} height="15" rx="7" fill="#ececec" />
              <text x={canvas / 2} y={feetToPx(0.28, pad, scale)} textAnchor="middle" fontSize="11" fill="#bfc1c7">Projection Screen</text>

              <Projector x={layout.projector.x} y={layout.projector.y} pad={pad} scale={scale} />

              {layout.speakers.fronts.map((item, i) => <Speaker key={`f-${i}`} x={item.x} y={item.y} label={item.label} type={bedType} pad={pad} scale={scale} />)}
              {layout.speakers.wides.map((item, i) => <Speaker key={`w-${i}`} x={item.x} y={item.y} label={item.label} type={bedType} pad={pad} scale={scale} />)}
              {layout.speakers.surrounds.map((item, i) => <Speaker key={`s-${i}`} x={item.x} y={item.y} label={item.label} type={bedType} pad={pad} scale={scale} />)}
              {layout.speakers.rears.map((item, i) => <Speaker key={`r-${i}`} x={item.x} y={item.y} label={item.label} type={bedType} pad={pad} scale={scale} />)}
              {layout.speakers.heights.map((item, i) => <Speaker key={`h-${i}`} x={item.x} y={item.y} label={item.label} type="height" pad={pad} scale={scale} />)}
              {layout.speakers.subs.map((item, i) => <Speaker key={`sub-${i}`} x={item.x} y={item.y} label={item.label} type="sub" pad={pad} scale={scale} />)}

              {layout.riser && (
                <g>
                  <rect x={feetToPx(layout.riser.x, pad, scale)} y={feetToPx(layout.riser.y, pad, scale)} width={layout.riser.width * scale} height={layout.riser.depth * scale} rx="22" fill="#232329" stroke="#5b5b65" strokeDasharray="7 5" />
                  <text x={feetToPx(layout.riser.x + layout.riser.width / 2, pad, scale)} y={feetToPx(layout.riser.y + layout.riser.depth - 0.2, pad, scale)} textAnchor="middle" fontSize="10" fill="#e4e4e7">Riser · {layout.riser.height}"</text>
                </g>
              )}

              {layout.rowsData.map((row, i) => <SeatRow key={`row-${i}`} row={row} pad={pad} scale={scale} />)}

              <line x1={canvas / 2} y1={feetToPx(0.9, pad, scale)} x2={canvas / 2} y2={feetToPx(layout.rowsData[0]?.y || 8, pad, scale)} stroke="#efc161" strokeDasharray="6 5" />
              <text x={canvas / 2 + 10} y={feetToPx((layout.rowsData[0]?.y || 8) / 2, pad, scale)} fontSize="11" fill="#efc161">{layout.viewingDistance} ft viewing distance</text>
            </svg>
          </div>
        </main>
      </div>
    </div>
  );
}
