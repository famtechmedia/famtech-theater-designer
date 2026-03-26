import React, { useMemo, useState } from "react";

const ATMOS_LAYOUTS = {
  "5.1.2": { bed: 5, surrounds: 2, rear: 0, wides: 0, heights: 2, subs: 1 },
  "5.1.4": { bed: 5, surrounds: 2, rear: 0, wides: 0, heights: 4, subs: 1 },
  "7.1.2": { bed: 7, surrounds: 2, rear: 2, wides: 0, heights: 2, subs: 1 },
  "7.1.4": { bed: 7, surrounds: 2, rear: 2, wides: 0, heights: 4, subs: 1 },
  "7.2.4": { bed: 7, surrounds: 2, rear: 2, wides: 0, heights: 4, subs: 2 },
  "9.2.4": { bed: 9, surrounds: 2, rear: 2, wides: 2, heights: 4, subs: 2 },
  "9.2.6": { bed: 9, surrounds: 2, rear: 2, wides: 2, heights: 6, subs: 2 },
};

const SEATING_OPTIONS = {
  loveseat: { label: "Loveseat", width: 6.1, seats: 2 },
  row3: { label: "Row of 3", width: 8.4, seats: 3 },
  row4: { label: "Row of 4", width: 10.8, seats: 4 },
  row5: { label: "Row of 5", width: 13.4, seats: 5 },
};

const SPEAKER_TYPES = {
  inwall: "In-Wall",
  inceiling: "In-Ceiling",
  floorstanding: "Floorstanding",
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function useScale(roomWidth, roomDepth) {
  const canvas = 880;
  const padding = 52;
  const scale = Math.min((canvas - padding * 2) / roomWidth, (canvas - padding * 2) / roomDepth);
  return { canvas, padding, scale };
}

function px(ft, padding, scale) {
  return padding + ft * scale;
}

function recommendedScreenRange(roomWidth, viewDistance) {
  const maxByWidth = Math.floor((roomWidth - 2) / 0.0726);
  const ideal = Math.round((viewDistance / 1.7) * 12);
  const min = clamp(Math.round(ideal * 0.9), 75, 160);
  const max = clamp(Math.min(Math.round(ideal * 1.1), maxByWidth), min, 180);
  return { min, max };
}

function calcLayout({ roomWidth, roomDepth, screenSize, layoutKey, rows, seatingType }) {
  const layout = ATMOS_LAYOUTS[layoutKey];
  const seating = SEATING_OPTIONS[seatingType];

  const frontStageDepth = 3.5;
  const frontWalkway = 2.0;
  const rowDepth = 3.25;
  const rowGap = 1.6;
  const rearClearance = layout.rear > 0 ? 3.6 : 2.2;
  const sideClearance = 1.4;
  const widesClearance = layout.wides > 0 ? 0.8 : 0;
  const minimumSeatWidth = seating.width + sideClearance * 2;

  const diagFeet = screenSize / 12;
  const suggestedViewingDistance = clamp(Number((diagFeet * 1.7).toFixed(1)), 8, roomDepth - 6.5);
  const firstRowFront = suggestedViewingDistance - 1.7;
  const totalRowsDepth = rows * rowDepth + Math.max(0, rows - 1) * rowGap;
  const lastRowBack = firstRowFront + totalRowsDepth;
  const roomDepthNeeded = frontStageDepth + frontWalkway + totalRowsDepth + rearClearance + 4.2;
  const roomWidthNeeded = minimumSeatWidth + widesClearance;

  const screenWidthFeet = clamp(screenSize * 0.0726, 6, roomWidth - 2);
  const screenRecommendation = recommendedScreenRange(roomWidth, clamp(roomDepth * 0.58, 8, roomDepth - 6));

  const issues = [];
  if (roomWidth < roomWidthNeeded) {
    issues.push(`Room width is too small for ${seating.label}. Increase width to at least ${roomWidthNeeded.toFixed(1)} ft or reduce seating width.`);
  }
  if (roomDepth < roomDepthNeeded) {
    issues.push(`Room depth is too small for ${rows} row(s) with ${layoutKey}. Increase depth to at least ${roomDepthNeeded.toFixed(1)} ft or reduce rows.`);
  }
  if (rows >= 3 && roomDepth < roomDepthNeeded + 1.5) {
    issues.push("Three rows need more depth for safe spacing and rear speaker clearance.");
  }
  if (layout.rear > 0 && roomDepth - lastRowBack < 3.0) {
    issues.push("There is not enough rear clearance for surround back speakers behind the last row.");
  }
  if (layout.wides > 0 && roomWidth < seating.width + 3.4) {
    issues.push("This room is too narrow for front wide speakers with the selected seating size.");
  }
  if (screenSize > screenRecommendation.max) {
    issues.push(`This screen size is too large for the room. Recommended screen size: ${screenRecommendation.min}"-${screenRecommendation.max}".`);
  }
  if (screenSize < screenRecommendation.min - 10) {
    issues.push(`This screen size is smaller than ideal for the room. Recommended screen size: ${screenRecommendation.min}"-${screenRecommendation.max}".`);
  }

  const isValid = issues.length === 0;

  const rowsData = [];
  for (let i = 0; i < rows; i++) {
    rowsData.push({
      y: firstRowFront + i * (rowDepth + rowGap),
      width: Math.min(seating.width, roomWidth - 2.2),
      depth: rowDepth,
      label: `Row ${i + 1}`,
    });
  }

  const centerX = roomWidth / 2;
  const riser = rows >= 2
    ? {
        x: (roomWidth - Math.min(seating.width + 0.8, roomWidth - 1.4)) / 2,
        y: rowsData[1].y - 0.45,
        width: Math.min(seating.width + 0.8, roomWidth - 1.4),
        depth: rowsData[rowsData.length - 1].y + rowDepth - rowsData[1].y + 0.8,
        height: rows === 2 ? 12 : 14,
      }
    : null;

  const projectorThrow = clamp((screenSize / 12) * 1.35, 9, roomDepth - 2.5);
  const projector = {
    x: centerX,
    y: clamp(projectorThrow, 9, roomDepth - 2),
    label: "Projector",
  };

  const mlpY = rowsData[0] ? rowsData[0].y + 1.6 : roomDepth * 0.58;
  const rearY = rowsData.length ? clamp(rowsData[rowsData.length - 1].y + rowDepth + 1.2, roomDepth - 2.4, roomDepth - 1.8) : roomDepth - 2;

  const speakers = {
    screen: { x: centerX, y: 0.7, width: screenWidthFeet },
    fronts: [
      { x: centerX - 3.4, y: 2.2, label: "L" },
      { x: centerX, y: 1.8, label: "C" },
      { x: centerX + 3.4, y: 2.2, label: "R" },
    ],
    subs: layout.subs === 2
      ? [
          { x: centerX - 5.2, y: 1.4, label: "SUB" },
          { x: centerX + 5.2, y: 1.4, label: "SUB" },
        ]
      : [{ x: centerX, y: 1.4, label: "SUB" }],
    wides: layout.wides === 2
      ? [
          { x: 1.7, y: roomDepth * 0.34, label: "FWL" },
          { x: roomWidth - 1.7, y: roomDepth * 0.34, label: "FWR" },
        ]
      : [],
    surrounds: [
      { x: 1.8, y: clamp(mlpY, roomDepth * 0.46, roomDepth * 0.72), label: "SL" },
      { x: roomWidth - 1.8, y: clamp(mlpY, roomDepth * 0.46, roomDepth * 0.72), label: "SR" },
    ],
    rears: layout.rear === 2
      ? [
          { x: 2.0, y: rearY, label: "SBL" },
          { x: roomWidth - 2.0, y: rearY, label: "SBR" },
        ]
      : [],
    heights:
      layout.heights === 2
        ? [
            { x: centerX - 2.2, y: mlpY - 1.8, label: "TML" },
            { x: centerX + 2.2, y: mlpY - 1.8, label: "TMR" },
          ]
        : layout.heights === 4
        ? [
            { x: centerX - 2.7, y: Math.max(4.4, mlpY - 4.2), label: "TFL" },
            { x: centerX + 2.7, y: Math.max(4.4, mlpY - 4.2), label: "TFR" },
            { x: centerX - 2.7, y: Math.min(roomDepth - 4.2, mlpY + 3.2), label: "TRL" },
            { x: centerX + 2.7, y: Math.min(roomDepth - 4.2, mlpY + 3.2), label: "TRR" },
          ]
        : [
            { x: centerX - 2.7, y: Math.max(3.8, mlpY - 5), label: "TFL" },
            { x: centerX + 2.7, y: Math.max(3.8, mlpY - 5), label: "TFR" },
            { x: centerX - 2.2, y: mlpY - 1.6, label: "TML" },
            { x: centerX + 2.2, y: mlpY - 1.6, label: "TMR" },
            { x: centerX - 2.7, y: Math.min(roomDepth - 3.8, mlpY + 3.6), label: "TRL" },
            { x: centerX + 2.7, y: Math.min(roomDepth - 3.8, mlpY + 3.6), label: "TRR" },
          ],
  };

  const acousticPanels = {
    sides: [
      { x: 0.6, y: mlpY - 1.6, width: 0.28, height: 3.1 },
      { x: roomWidth - 0.88, y: mlpY - 1.6, width: 0.28, height: 3.1 },
    ],
    rear: [
      { x: centerX - 2.5, y: roomDepth - 0.75, width: 1.6, height: 0.25 },
      { x: centerX + 0.9, y: roomDepth - 0.75, width: 1.6, height: 0.25 },
    ],
  };

  return {
    isValid,
    issues,
    suggestedViewingDistance,
    rowsData,
    speakers,
    riser,
    projector,
    acousticPanels,
    screenRecommendation,
  };
}

function TheaterSeatRow({ x, y, width, depth, seats, label, padding, scale }) {
  const seatGap = 0.14;
  const innerWidth = width - 0.34;
  const seatWidth = (innerWidth - seatGap * (seats - 1)) / seats;
  const seatDepth = depth - 0.42;
  const baseX = x + 0.17;
  const baseY = y + 0.18;

  return (
    <g>
      <rect x={px(x, padding, scale)} y={px(y, padding, scale)} width={width * scale} height={depth * scale} rx={18} fill="#1f1f23" stroke="#62626b" strokeWidth="1.5" />
      {Array.from({ length: seats }).map((_, i) => {
        const sx = baseX + i * (seatWidth + seatGap);
        return (
          <g key={i}>
            <rect x={px(sx, padding, scale)} y={px(baseY + 0.68, padding, scale)} width={seatWidth * scale} height={(seatDepth - 0.72) * scale} rx={12} fill="#4b4b54" stroke="#8f8f98" />
            <rect x={px(sx + 0.08, padding, scale)} y={px(baseY + 0.2, padding, scale)} width={(seatWidth - 0.16) * scale} height={0.64 * scale} rx={10} fill="#6f6f79" />
            <rect x={px(sx - 0.05, padding, scale)} y={px(baseY + 0.78, padding, scale)} width={0.08 * scale} height={(seatDepth - 0.9) * scale} rx={4} fill="#82828c" />
            <rect x={px(sx + seatWidth - 0.03, padding, scale)} y={px(baseY + 0.78, padding, scale)} width={0.08 * scale} height={(seatDepth - 0.9) * scale} rx={4} fill="#82828c" />
          </g>
        );
      })}
      <text x={px(x + width / 2, padding, scale)} y={px(y + depth / 2 + 0.1, padding, scale)} textAnchor="middle" fontSize="11" fill="#f4f4f5">{label}</text>
    </g>
  );
}

function SpeakerIcon({ x, y, label, kind = "inwall", padding, scale }) {
  const cx = px(x, padding, scale);
  const cy = px(y, padding, scale);

  if (kind === "sub") {
    return (
      <g>
        <rect x={cx - 12} y={cy - 9} width="24" height="18" rx="4" fill="#2dd4bf" stroke="#99f6e4" />
        <circle cx={cx} cy={cy} r="4" fill="#134e4a" />
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize="9" fill="#d1fae5">{label}</text>
      </g>
    );
  }

  if (kind === "inceiling") {
    return (
      <g>
        <circle cx={cx} cy={cy} r="10" fill="#ddd6fe" stroke="#a78bfa" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="4.2" fill="#7c3aed" />
        <text x={cx} y={cy + 19} textAnchor="middle" fontSize="8" fill="#ddd6fe">{label}</text>
      </g>
    );
  }

  if (kind === "floorstanding") {
    return (
      <g>
        <rect x={cx - 7} y={cy - 14} width="14" height="28" rx="3" fill="#f5deb3" stroke="#f59e0b" />
        <circle cx={cx} cy={cy - 5} r="3" fill="#3f3f46" />
        <circle cx={cx} cy={cy + 5} r="4" fill="#27272a" />
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize="8" fill="#fde68a">{label}</text>
      </g>
    );
  }

  return (
    <g>
      <rect x={cx - 9} y={cy - 12} width="18" height="24" rx="4" fill="#f5deb3" stroke="#d4a24c" />
      <circle cx={cx} cy={cy - 3.2} r="3.1" fill="#3f3f46" />
      <circle cx={cx} cy={cy + 5.1} r="4.6" fill="#27272a" />
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="8" fill="#fde68a">{label}</text>
    </g>
  );
}

function ProjectorIcon({ x, y, padding, scale }) {
  const cx = px(x, padding, scale);
  const cy = px(y, padding, scale);
  return (
    <g>
      <rect x={cx - 16} y={cy - 8} width="32" height="16" rx="4" fill="#cbd5e1" stroke="#94a3b8" />
      <circle cx={cx + 8} cy={cy} r="4" fill="#0f172a" />
      <rect x={cx - 10} y={cy + 8} width="20" height="3" rx="1.5" fill="#64748b" />
      <text x={cx} y={cy - 14} textAnchor="middle" fontSize="9" fill="#e2e8f0">Projector</text>
    </g>
  );
}

export default function App() {
  const [roomWidth, setRoomWidth] = useState(15);
  const [roomDepth, setRoomDepth] = useState(22);
  const [roomHeight, setRoomHeight] = useState(9);
  const [screenSize, setScreenSize] = useState(120);
  const [displayType, setDisplayType] = useState("projector");
  const [layoutKey, setLayoutKey] = useState("7.2.4");
  const [rows, setRows] = useState(2);
  const [seatingType, setSeatingType] = useState("row4");
  const [bedSpeakerType, setBedSpeakerType] = useState("inwall");
  const [heightSpeakerType, setHeightSpeakerType] = useState("inceiling");
  const [goal, setGoal] = useState("Dedicated theater");
  const [showAcoustic, setShowAcoustic] = useState(false);

  const layoutResult = useMemo(
    () => calcLayout({ roomWidth, roomDepth, screenSize, layoutKey, rows, seatingType }),
    [roomWidth, roomDepth, screenSize, layoutKey, rows, seatingType]
  );

  const { canvas, padding, scale } = useScale(roomWidth, roomDepth);
  const seating = SEATING_OPTIONS[seatingType];
  const canUseThreeRows = calcLayout({ roomWidth, roomDepth, screenSize, layoutKey, rows: 3, seatingType }).isValid;

  const setRowsSafe = (newRows) => {
    const test = calcLayout({ roomWidth, roomDepth, screenSize, layoutKey, rows: newRows, seatingType });
    if (test.isValid) setRows(newRows);
  };

  const setScreenSizeSafe = (newScreenSize) => {
    const test = calcLayout({ roomWidth, roomDepth, screenSize: newScreenSize, layoutKey, rows, seatingType });
    if (newScreenSize <= test.screenRecommendation.max && newScreenSize >= 75) {
      setScreenSize(newScreenSize);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[400px_1fr] gap-6">
        <aside className="rounded-3xl border border-zinc-800 bg-zinc-900/90 shadow-2xl p-6 sticky top-4 h-fit">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-amber-400">Fam Tech Media</div>
              <h1 className="text-3xl font-semibold leading-tight mt-1">Premium Theater Designer</h1>
              <p className="text-sm text-zinc-400 mt-2">Version 3 focuses on realistic graphics, projector-first planning, acoustic treatment toggle, smart screen recommendations, and blocked invalid layouts.</p>
            </div>
            <div className="rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs px-3 py-1">V3 Build</div>
          </div>

          <div className="mt-6 space-y-5">
            <section className="border-t border-zinc-800 pt-5">
              <h2 className="text-base font-medium mb-3">1. Room Size</h2>
              <div className="grid grid-cols-3 gap-3">
                <label className="text-sm"><span className="block text-zinc-400 mb-1">Width</span><input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" type="number" value={roomWidth} min={8} max={40} onChange={(e) => setRoomWidth(Number(e.target.value || 0))} /></label>
                <label className="text-sm"><span className="block text-zinc-400 mb-1">Depth</span><input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" type="number" value={roomDepth} min={10} max={50} onChange={(e) => setRoomDepth(Number(e.target.value || 0))} /></label>
                <label className="text-sm"><span className="block text-zinc-400 mb-1">Height</span><input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" type="number" value={roomHeight} min={7} max={20} onChange={(e) => setRoomHeight(Number(e.target.value || 0))} /></label>
              </div>
            </section>

            <section className="border-t border-zinc-800 pt-5">
              <h2 className="text-base font-medium mb-3">2. Screen + Display</h2>
              <label className="text-sm block">
                <span className="block text-zinc-400 mb-1">Screen Size: {screenSize}"</span>
                <input className="w-full" type="range" min={75} max={180} step={1} value={screenSize} onChange={(e) => setScreenSizeSafe(Number(e.target.value))} />
              </label>
              <div className="text-xs text-zinc-500 mt-2">Recommended size for this room: {layoutResult.screenRecommendation.min}"-{layoutResult.screenRecommendation.max}"</div>
              <label className="text-sm block mt-3">
                <span className="block text-zinc-400 mb-1">Display Type</span>
                <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" value={displayType} onChange={(e) => setDisplayType(e.target.value)}>
                  <option value="projector">Projector + Screen</option>
                  <option value="tv">Large Format TV</option>
                </select>
              </label>
            </section>

            <section className="border-t border-zinc-800 pt-5">
              <h2 className="text-base font-medium mb-3">3. Audio Layout</h2>
              <label className="text-sm block">
                <span className="block text-zinc-400 mb-1">Dolby Atmos Layout</span>
                <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" value={layoutKey} onChange={(e) => setLayoutKey(e.target.value)}>
                  {Object.keys(ATMOS_LAYOUTS).map((key) => <option key={key} value={key}>{key}</option>)}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <label className="text-sm block">
                  <span className="block text-zinc-400 mb-1">Bed Speakers</span>
                  <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" value={bedSpeakerType} onChange={(e) => setBedSpeakerType(e.target.value)}>
                    {Object.entries(SPEAKER_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="text-sm block">
                  <span className="block text-zinc-400 mb-1">Height Speakers</span>
                  <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" value={heightSpeakerType} onChange={(e) => setHeightSpeakerType(e.target.value)}>
                    <option value="inceiling">In-Ceiling</option>
                    <option value="inwall">On-Ceiling / Surface</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="border-t border-zinc-800 pt-5">
              <h2 className="text-base font-medium mb-3">4. Seating</h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm block">
                  <span className="block text-zinc-400 mb-1">Rows</span>
                  <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" value={rows} onChange={(e) => setRowsSafe(Number(e.target.value))}>
                    <option value={1}>1 Row</option>
                    <option value={2}>2 Rows</option>
                    <option value={3} disabled={!canUseThreeRows}>3 Rows {!canUseThreeRows ? "(not available)" : ""}</option>
                  </select>
                </label>
                <label className="text-sm block">
                  <span className="block text-zinc-400 mb-1">Seats Per Row</span>
                  <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" value={seatingType} onChange={(e) => setSeatingType(e.target.value)}>
                    {Object.entries(SEATING_OPTIONS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
                  </select>
                </label>
              </div>
            </section>

            <section className="border-t border-zinc-800 pt-5">
              <h2 className="text-base font-medium mb-3">5. Project Goal</h2>
              <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" value={goal} onChange={(e) => setGoal(e.target.value)}>
                <option>Dedicated theater</option>
                <option>Media room</option>
                <option>Living room upgrade</option>
                <option>Gaming + cinema</option>
              </select>
              <button className="w-full mt-3 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800" onClick={() => setShowAcoustic(!showAcoustic)}>
                {showAcoustic ? "Hide Acoustic Panels" : "Show Acoustic Panels"}
              </button>
            </section>
          </div>

          {!layoutResult.isValid && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="font-medium text-red-300">This layout is blocked</div>
              <ul className="mt-2 space-y-1 text-sm text-red-200 list-disc pl-5">
                {layoutResult.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
              </ul>
            </div>
          )}
        </aside>

        <main className="space-y-6">
          <section className="rounded-3xl border border-zinc-800 bg-zinc-900/90 shadow-2xl p-6 overflow-hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-medium">Top View Theater Layout</h2>
                <p className="text-sm text-zinc-400 mt-1">Projector-first planning with smarter placement, realistic seating, riser auto-add, optional acoustic treatment, and blocked invalid layouts.</p>
              </div>
              <div className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">{roomWidth}' × {roomDepth}'</div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_45%),linear-gradient(to_bottom,rgba(24,24,27,1),rgba(9,9,11,1))] p-4 mt-5 overflow-auto">
              <svg width={canvas} height={canvas} viewBox={`0 0 ${canvas} ${canvas}`} className="mx-auto block max-w-full h-auto">
                <rect x={padding} y={padding} width={roomWidth * scale} height={roomDepth * scale} rx="28" fill="#141418" stroke="#3f3f46" strokeWidth="2" />

                {showAcoustic && layoutResult.acousticPanels.sides.map((panel, idx) => (
                  <rect key={`sp-${idx}`} x={px(panel.x, padding, scale)} y={px(panel.y, padding, scale)} width={panel.width * scale} height={panel.height * scale} rx="6" fill="#1d4ed8" opacity="0.6" />
                ))}
                {showAcoustic && layoutResult.acousticPanels.rear.map((panel, idx) => (
                  <rect key={`rp-${idx}`} x={px(panel.x, padding, scale)} y={px(panel.y, padding, scale)} width={panel.width * scale} height={panel.height * scale} rx="5" fill="#1d4ed8" opacity="0.6" />
                ))}

                <rect x={px(layoutResult.speakers.screen.x - layoutResult.speakers.screen.width / 2, padding, scale)} y={px(0.45, padding, scale)} width={layoutResult.speakers.screen.width * scale} height="14" rx="7" fill="#d4d4d8" />
                <text x={canvas / 2} y={px(0.3, padding, scale)} textAnchor="middle" fontSize="11" fill="#a1a1aa">{displayType === "projector" ? "Projection Screen" : "Display Wall"}</text>

                <ProjectorIcon x={layoutResult.projector.x} y={layoutResult.projector.y} padding={padding} scale={scale} />

                {layoutResult.speakers.fronts.map((sp, i) => <SpeakerIcon key={`f-${i}`} x={sp.x} y={sp.y} label={sp.label} kind={bedSpeakerType} padding={padding} scale={scale} />)}
                {layoutResult.speakers.wides.map((sp, i) => <SpeakerIcon key={`w-${i}`} x={sp.x} y={sp.y} label={sp.label} kind={bedSpeakerType} padding={padding} scale={scale} />)}
                {layoutResult.speakers.surrounds.map((sp, i) => <SpeakerIcon key={`s-${i}`} x={sp.x} y={sp.y} label={sp.label} kind={bedSpeakerType} padding={padding} scale={scale} />)}
                {layoutResult.speakers.rears.map((sp, i) => <SpeakerIcon key={`r-${i}`} x={sp.x} y={sp.y} label={sp.label} kind={bedSpeakerType} padding={padding} scale={scale} />)}
                {layoutResult.speakers.heights.map((sp, i) => <SpeakerIcon key={`h-${i}`} x={sp.x} y={sp.y} label={sp.label} kind={heightSpeakerType === "inceiling" ? "inceiling" : "inwall"} padding={padding} scale={scale} />)}
                {layoutResult.speakers.subs.map((sp, i) => <SpeakerIcon key={`sub-${i}`} x={sp.x} y={sp.y} label={sp.label} kind="sub" padding={padding} scale={scale} />)}

                {layoutResult.riser && (
                  <g>
                    <rect x={px(layoutResult.riser.x, padding, scale)} y={px(layoutResult.riser.y, padding, scale)} width={layoutResult.riser.width * scale} height={layoutResult.riser.depth * scale} rx="20" fill="#27272a" stroke="#52525b" strokeDasharray="6 4" />
                    <text x={px(layoutResult.riser.x + layoutResult.riser.width / 2, padding, scale)} y={px(layoutResult.riser.y + layoutResult.riser.depth - 0.2, padding, scale)} textAnchor="middle" fontSize="10" fill="#d4d4d8">Riser · {layoutResult.riser.height}"</text>
                  </g>
                )}

                {layoutResult.rowsData.map((row, i) => (
                  <TheaterSeatRow key={i} x={(roomWidth - row.width) / 2} y={row.y} width={row.width} depth={row.depth} seats={seating.seats} label={row.label} padding={padding} scale={scale} />
                ))}

                <line x1={canvas / 2} y1={px(0.9, padding, scale)} x2={canvas / 2} y2={px(layoutResult.rowsData[0]?.y || 8, padding, scale)} stroke="#fbbf24" strokeDasharray="6 5" />
                <text x={canvas / 2 + 10} y={px((layoutResult.rowsData[0]?.y || 8) / 2, padding, scale)} fontSize="11" fill="#fcd34d">{layoutResult.suggestedViewingDistance} ft viewing distance</text>
              </svg>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
