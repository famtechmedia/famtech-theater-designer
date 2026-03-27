import React, { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox, Text, Html } from "@react-three/drei";
import "./styles.css";

const DISPLAY_MODES = [
  { value: "projector_16_9", label: "Projector — 16:9" },
  { value: "projector_scope", label: "Projector — Cinemascope (2.35–2.40:1)" },
  { value: "tv", label: "TV" },
];

const PROJECTORS = [
  { id: "sony_xw5000es", name: "Sony VPL-XW5000ES", allowedModes: ["projector_16_9"], throwRatio: [1.38, 2.21] },
  { id: "sony_xw6000es", name: "Sony VPL-XW6000ES", allowedModes: ["projector_16_9", "projector_scope"], throwRatio: [1.35, 2.84] },
  { id: "epson_ls12000", name: "Epson LS12000", allowedModes: ["projector_16_9", "projector_scope"], throwRatio: [1.35, 2.84] },
  { id: "jvc_nz7", name: "JVC NZ7", allowedModes: ["projector_16_9", "projector_scope"], throwRatio: [1.40, 2.80] },
];

const LAYOUTS = {
  "5.1.2": { surrounds: 2, rears: 0, heights: 2, subs: 1, wides: 0 },
  "5.1.4": { surrounds: 2, rears: 0, heights: 4, subs: 1, wides: 0 },
  "7.1.2": { surrounds: 2, rears: 2, heights: 2, subs: 1, wides: 0 },
  "7.1.4": { surrounds: 2, rears: 2, heights: 4, subs: 1, wides: 0 },
  "7.2.4": { surrounds: 2, rears: 2, heights: 4, subs: 2, wides: 0 },
  "9.2.4": { surrounds: 2, rears: 2, heights: 4, subs: 2, wides: 2 },
};

const FRONT_SPEAKERS = [
  { value: "inwall", label: "Front LCR — KEF In-Wall" },
  { value: "tower", label: "Front LCR — KEF Floorstanding" },
];

const SURROUND_SPEAKERS = [
  { value: "inwall", label: "Surround/Rear — KEF In-Wall" },
  { value: "onwall", label: "Surround/Rear — KEF On-Wall" },
];

const ATMOS_SPEAKERS = [
  { value: "inceiling", label: "Atmos — KEF In-Ceiling" },
  { value: "onceiling", label: "Atmos — On-Ceiling" },
];

const SEATING = {
  loveseat: { label: "Loveseat", seats: 2, widthM: 2.1 },
  row3: { label: "Row of 3", seats: 3, widthM: 2.9 },
  row4: { label: "Row of 4", seats: 4, widthM: 3.7 },
  row5: { label: "Row of 5", seats: 5, widthM: 4.5 },
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function ftToM(ft) { return ft * 0.3048; }
function mToFt(m) { return m / 0.3048; }

function recommendedScreen(widthFt, depthFt, displayMode) {
  const wallMargin = displayMode === "tv" ? 1.4 : 2.4;
  const maxByWall = Math.floor((widthFt - wallMargin) / 0.0726);
  const idealDistance = clamp(depthFt * 0.56, 8, depthFt - 6);
  const idealDiag = Math.round((idealDistance / 1.7) * 12);
  const min = clamp(Math.round(idealDiag * 0.9), displayMode === "tv" ? 65 : 80, 160);
  const max = clamp(Math.min(Math.round(idealDiag * 1.1), maxByWall), min, displayMode === "tv" ? 115 : 180);
  return { min, max };
}

function getAllowedProjectors(displayMode) { return PROJECTORS.filter((p) => p.allowedModes.includes(displayMode)); }
function ensureProjectorId(displayMode, currentId) {
  const allowed = getAllowedProjectors(displayMode);
  if (!allowed.length) return "";
  if (allowed.some((p) => p.id === currentId)) return currentId;
  return allowed[0].id;
}

function calcScreenGeometry(displayMode, screenSize) {
  let aspectW = 16, aspectH = 9;
  if (displayMode === "projector_scope") { aspectW = 2.4; aspectH = 1; }
  const diagonalM = ftToM(screenSize / 12);
  const ratio = Math.sqrt(aspectW * aspectW + aspectH * aspectH);
  return { widthM: diagonalM * (aspectW / ratio), heightM: diagonalM * (aspectH / ratio) };
}

function buildLayout({ roomWidthFt, roomDepthFt, roomHeightFt, screenSize, displayMode, projectorId, throwPosition, layoutKey, rows, seatingKey, rowSpacingFt, acoustic }) {
  const layout = LAYOUTS[layoutKey];
  const seating = SEATING[seatingKey];
  const roomW = ftToM(roomWidthFt), roomD = ftToM(roomDepthFt), roomH = ftToM(roomHeightFt);
  const screenRange = recommendedScreen(roomWidthFt, roomDepthFt, displayMode);
  const screenGeo = calcScreenGeometry(displayMode, screenSize);
  const issues = [];

  const sideClearance = layout.wides ? 0.75 : 0.45;
  const rowDepth = 1.15;
  const rowGap = ftToM(rowSpacingFt);
  const stageDepth = displayMode === "tv" ? 0.7 : 1.0;
  const frontWalk = 0.65;
  const rearClearance = layout.rears ? 1.1 : 0.75;
  const neededWidth = seating.widthM + sideClearance * 2;
  const neededDepth = stageDepth + frontWalk + rows * rowDepth + (rows - 1) * rowGap + rearClearance + 1.0;

  if (roomW < neededWidth) issues.push(`Room too narrow for ${seating.label}. Increase width or reduce seating size.`);
  if (roomD < neededDepth) issues.push(`Room too shallow for ${rows} row(s). Increase depth, reduce rows, or reduce row spacing.`);
  if (screenSize > screenRange.max) issues.push(`Screen too large. Recommended range is ${screenRange.min}"-${screenRange.max}".`);

  const viewingDistanceFt = clamp(Number(((screenSize / 12) * 1.7).toFixed(1)), 8, roomDepthFt - 6.5);
  const firstRowZ = -ftToM(viewingDistanceFt) + 0.5;

  const rowsData = [];
  for (let i = 0; i < rows; i++) {
    const z = firstRowZ - i * (rowDepth + rowGap);
    const backEdge = z - rowDepth / 2;
    if (backEdge < -roomD / 2 + 0.7) break;
    rowsData.push({ z, seats: seating.seats, widthM: seating.widthM, label: `Row ${i + 1}` });
  }
  if (rowsData.length < rows) issues.push(`Only ${rowsData.length} row(s) fit in the current room with the selected spacing.`);

  const validRows = rowsData.length;
  const effectiveRows = validRows || 1;
  const screenBottomBase = displayMode === "tv" ? 0.92 : 0.62;
  const screenBottom = clamp(screenBottomBase + Math.max(0, effectiveRows - 1) * 0.18, 0.55, roomH - screenGeo.heightM - 0.35);
  const screenCenterY = screenBottom + screenGeo.heightM / 2;
  const mainListenZ = rowsData[0]?.z ?? -roomD * 0.35;
  const rearZ = rowsData[rowsData.length - 1]?.z - 1.0 ?? -roomD / 2 + 0.8;

  const allowedProjectors = getAllowedProjectors(displayMode);
  const safeProjectorId = ensureProjectorId(displayMode, projectorId);
  const projector = allowedProjectors.find((p) => p.id === safeProjectorId);
  let throwZone = null;
  let projectorPosition = null;

  if (displayMode !== "tv" && projector) {
    const throwMin = screenGeo.widthM * projector.throwRatio[0];
    const throwMax = screenGeo.widthM * projector.throwRatio[1];
    const roomAvailableMin = 1.4;
    const roomAvailableMax = roomD - 1.1;
    const usableMin = Math.max(throwMin, roomAvailableMin);
    const usableMax = Math.min(throwMax, roomAvailableMax);
    if (usableMin > usableMax) {
      issues.push(`${projector.name} cannot throw this image size in the current room depth.`);
    } else {
      const t = clamp(throwPosition, 0, 1);
      const throwDistance = usableMin + (usableMax - usableMin) * t;
      throwZone = { min: usableMin, max: usableMax, current: throwDistance };
      projectorPosition = { x: 0, y: roomH - 0.35, z: roomD / 2 - throwDistance };
    }
  }

  const riser = validRows > 1 ? {
    width: seating.widthM + 0.5,
    depth: Math.abs((rowsData[rowsData.length - 1]?.z ?? 0) - (rowsData[1]?.z ?? 0)) + 1.2,
    z: (rowsData[1]?.z ?? 0) - 0.15,
    height: validRows === 2 ? 0.18 : 0.24,
  } : null;

  const frontSpread = displayMode === "projector_scope" ? 0.48 : displayMode === "tv" ? 0.34 : 0.43;
  const lcrZ = displayMode === "tv" ? roomD / 2 - 0.92 : roomD / 2 - 0.85;
  const centerZ = displayMode === "tv" ? roomD / 2 - 0.98 : roomD / 2 - 0.7;
  const lcrCenterY = displayMode === "tv" ? 0.32 : 0.55;

  return {
    isValid: issues.length === 0,
    issues,
    validRows,
    viewingDistanceFt,
    screenRange,
    roomW,
    roomD,
    roomH,
    screenGeo,
    screenCenterY,
    rowsData,
    riser,
    projector,
    projectorPosition,
    throwZone,
    acoustic,
    speakers: {
      fronts: [
        { x: -screenGeo.widthM * frontSpread, y: lcrCenterY, z: lcrZ, label: "L" },
        { x: 0, y: displayMode === "tv" ? 0.18 : 0.42, z: centerZ, label: "C" },
        { x: screenGeo.widthM * frontSpread, y: lcrCenterY, z: lcrZ, label: "R" },
      ],
      wides: layout.wides ? [
        { x: -roomW / 2 + 0.32, y: 0.8, z: roomD * 0.12, label: "FWL" },
        { x: roomW / 2 - 0.32, y: 0.8, z: roomD * 0.12, label: "FWR" },
      ] : [],
      surrounds: [
        { x: -roomW / 2 + 0.24, y: 1.15, z: mainListenZ, label: "SL" },
        { x: roomW / 2 - 0.24, y: 1.15, z: mainListenZ, label: "SR" },
      ],
      rears: layout.rears ? [
        { x: -roomW / 2 + 0.28, y: 1.15, z: rearZ, label: "SBL" },
        { x: roomW / 2 - 0.28, y: 1.15, z: rearZ, label: "SBR" },
      ] : [],
      heights: layout.heights === 2 ? [
        { x: -0.65, y: roomH - 0.18, z: mainListenZ + 0.15, label: "TML" },
        { x: 0.65, y: roomH - 0.18, z: mainListenZ + 0.15, label: "TMR" },
      ] : [
        { x: -0.85, y: roomH - 0.18, z: 1.0, label: "TFL" },
        { x: 0.85, y: roomH - 0.18, z: 1.0, label: "TFR" },
        { x: -0.85, y: roomH - 0.18, z: -1.9, label: "TRL" },
        { x: 0.85, y: roomH - 0.18, z: -1.9, label: "TRR" },
      ],
      subs: layout.subs === 2 ? [
        { x: -1.35, y: 0.2, z: roomD / 2 - 0.7, label: "SUB" },
        { x: 1.35, y: 0.2, z: roomD / 2 - 0.7, label: "SUB" },
      ] : [{ x: 0, y: 0.2, z: roomD / 2 - 0.7, label: "SUB" }],
    },
  };
}

function RoomShell({ width, depth, height }) {
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial color="#151519" roughness={0.95} metalness={0.03} />
    </mesh>
    <mesh position={[0, height / 2, depth / 2]}><boxGeometry args={[width, height, 0.05]} /><meshStandardMaterial color="#111115" /></mesh>
    <mesh position={[0, height / 2, -depth / 2]}><boxGeometry args={[width, height, 0.05]} /><meshStandardMaterial color="#101014" /></mesh>
    <mesh position={[-width / 2, height / 2, 0]}><boxGeometry args={[0.05, height, depth]} /><meshStandardMaterial color="#121218" /></mesh>
    <mesh position={[width / 2, height / 2, 0]}><boxGeometry args={[0.05, height, depth]} /><meshStandardMaterial color="#121218" /></mesh>
  </group>;
}

function DisplayWall({ mode, width, height, roomDepth, centerY }) {
  return <group position={[0, centerY, roomDepth / 2 - 0.08]}>
    <RoundedBox args={[width, height, 0.03]} radius={0.03} smoothness={4} castShadow>
      <meshStandardMaterial color={mode === "tv" ? "#0d0d10" : "#f1f1f1"} emissive={mode === "tv" ? "#111827" : "#ffffff"} emissiveIntensity={mode === "tv" ? 0.12 : 0.08} />
    </RoundedBox>
    <Text position={[0, height / 2 + 0.18, 0]} fontSize={0.11} color="#bfc1c7" anchorX="center" anchorY="middle">{mode === "tv" ? "TV Display" : "Projection Screen"}</Text>
  </group>;
}

function ProjectorModel({ position }) {
  return <group position={position} castShadow>
    <RoundedBox args={[0.42, 0.12, 0.28]} radius={0.03} smoothness={4}><meshStandardMaterial color="#d7dde5" metalness={0.2} roughness={0.45} /></RoundedBox>
    <mesh position={[0.13, 0, 0.1]}><cylinderGeometry args={[0.045, 0.045, 0.02, 24]} /><meshStandardMaterial color="#0b1220" metalness={0.45} roughness={0.2} /></mesh>
  </group>;
}

function SpeakerModel({ position, label, type = "inwall" }) {
  return <group position={position}>
    {type === "height" ? <mesh castShadow><cylinderGeometry args={[0.1, 0.1, 0.04, 28]} /><meshStandardMaterial color="#ece8ff" /></mesh>
    : type === "sub" ? <RoundedBox args={[0.28, 0.28, 0.28]} radius={0.03} smoothness={4} castShadow><meshStandardMaterial color="#18b7a0" /></RoundedBox>
    : type === "tower" ? <RoundedBox args={[0.16, 0.72, 0.16]} radius={0.03} smoothness={4} castShadow><meshStandardMaterial color="#efd8af" /></RoundedBox>
    : type === "onwall" ? <RoundedBox args={[0.16, 0.26, 0.09]} radius={0.02} smoothness={4} castShadow><meshStandardMaterial color="#efd8af" /></RoundedBox>
    : <RoundedBox args={[0.18, 0.42, 0.12]} radius={0.025} smoothness={4} castShadow><meshStandardMaterial color="#efd8af" /></RoundedBox>}
    <Html distanceFactor={12} position={[0, type === "tower" ? 0.48 : 0.22, 0]} center><div className="speaker-label">{label}</div></Html>
  </group>;
}

function Chair({ position }) {
  return <group position={position} castShadow>
    <RoundedBox args={[0.68, 0.22, 0.88]} radius={0.06} smoothness={4} position={[0, 0.18, 0]}><meshStandardMaterial color="#4f4f59" roughness={0.82} /></RoundedBox>
    <RoundedBox args={[0.62, 0.54, 0.18]} radius={0.05} smoothness={4} position={[0, 0.46, 0.33]}><meshStandardMaterial color="#6c6c77" roughness={0.72} /></RoundedBox>
    <RoundedBox args={[0.08, 0.26, 0.68]} radius={0.03} smoothness={4} position={[-0.34, 0.24, 0]}><meshStandardMaterial color="#878792" /></RoundedBox>
    <RoundedBox args={[0.08, 0.26, 0.68]} radius={0.03} smoothness={4} position={[0.34, 0.24, 0]}><meshStandardMaterial color="#878792" /></RoundedBox>
  </group>;
}

function SeatRow3D({ row }) {
  const spacing = 0.75; const totalWidth = (row.seats - 1) * spacing;
  return <group>
    {Array.from({ length: row.seats }).map((_, i) => <Chair key={i} position={[-totalWidth / 2 + i * spacing, 0, row.z]} />)}
    <Html distanceFactor={12} position={[0, 0.95, row.z]} center><div className="row-label">{row.label}</div></Html>
  </group>;
}

function Riser({ riser }) {
  return <group position={[0, riser.height / 2 - 0.01, riser.z]}>
    <RoundedBox args={[riser.width, riser.height, riser.depth]} radius={0.05} smoothness={4} receiveShadow><meshStandardMaterial color="#232329" roughness={0.96} /></RoundedBox>
  </group>;
}

function AcousticPanels({ layout }) {
  return <group>
    {layout.acoustic.side && <><mesh position={[-layout.roomW / 2 + 0.06, 1.45, 0]}><boxGeometry args={[0.06, 0.95, 1.6]} /><meshStandardMaterial color="#234da0" roughness={0.9} /></mesh><mesh position={[layout.roomW / 2 - 0.06, 1.45, 0]}><boxGeometry args={[0.06, 0.95, 1.6]} /><meshStandardMaterial color="#234da0" roughness={0.9} /></mesh></>}
    {layout.acoustic.rear && <><mesh position={[-1.1, 1.45, -layout.roomD / 2 + 0.06]}><boxGeometry args={[0.9, 0.95, 0.08]} /><meshStandardMaterial color="#234da0" roughness={0.9} /></mesh><mesh position={[1.1, 1.45, -layout.roomD / 2 + 0.06]}><boxGeometry args={[0.9, 0.95, 0.08]} /><meshStandardMaterial color="#234da0" roughness={0.9} /></mesh></>}
    {layout.acoustic.front && <><mesh position={[-1.1, 1.45, layout.roomD / 2 - 0.06]}><boxGeometry args={[0.9, 0.95, 0.08]} /><meshStandardMaterial color="#234da0" roughness={0.9} /></mesh><mesh position={[1.1, 1.45, layout.roomD / 2 - 0.06]}><boxGeometry args={[0.9, 0.95, 0.08]} /><meshStandardMaterial color="#234da0" roughness={0.9} /></mesh></>}
  </group>;
}

function ThrowZone({ layout }) {
  if (!layout.throwZone) return null;
  const centerZ = layout.roomD / 2 - (layout.throwZone.min + layout.throwZone.max) / 2;
  const depth = layout.throwZone.max - layout.throwZone.min;
  return <mesh position={[0, layout.roomH - 0.45, centerZ]}><boxGeometry args={[0.35, 0.02, depth]} /><meshStandardMaterial color="#f59e0b" transparent opacity={0.35} /></mesh>;
}

function TheaterScene({ layout, frontSpeakerType, surroundSpeakerType, atmosSpeakerType, displayMode }) {
  return <>
    <ambientLight intensity={0.78} />
    <directionalLight position={[2.5, 5.5, 2.5]} intensity={1.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
    <spotLight position={[0, 2.7, layout.roomD / 2 - 0.8]} angle={0.52} intensity={18} penumbra={0.85} color="#e5d0a5" />
    <RoomShell width={layout.roomW} depth={layout.roomD} height={layout.roomH} />
    <DisplayWall mode={displayMode} width={layout.screenGeo.widthM} height={layout.screenGeo.heightM} roomDepth={layout.roomD} centerY={layout.screenCenterY} />
    {displayMode !== "tv" && layout.projectorPosition && <ProjectorModel position={[layout.projectorPosition.x, layout.projectorPosition.y, layout.projectorPosition.z]} />}
    {displayMode !== "tv" && <ThrowZone layout={layout} />}
    {(layout.acoustic.side || layout.acoustic.rear || layout.acoustic.front) && <AcousticPanels layout={layout} />}
    {layout.riser && <Riser riser={layout.riser} />}
    {layout.rowsData.map((row, i) => <SeatRow3D key={i} row={row} />)}
    {layout.speakers.fronts.map((s, i) => <SpeakerModel key={`f-${i}`} position={[s.x, s.y, s.z]} label={s.label} type={frontSpeakerType} />)}
    {layout.speakers.wides.map((s, i) => <SpeakerModel key={`w-${i}`} position={[s.x, s.y, s.z]} label={s.label} type={frontSpeakerType} />)}
    {layout.speakers.surrounds.map((s, i) => <SpeakerModel key={`s-${i}`} position={[s.x, s.y, s.z]} label={s.label} type={surroundSpeakerType} />)}
    {layout.speakers.rears.map((s, i) => <SpeakerModel key={`r-${i}`} position={[s.x, s.y, s.z]} label={s.label} type={surroundSpeakerType} />)}
    {layout.speakers.heights.map((s, i) => <SpeakerModel key={`h-${i}`} position={[s.x, s.y, s.z]} label={s.label} type={atmosSpeakerType === "inceiling" ? "height" : "onwall"} />)}
    {layout.speakers.subs.map((s, i) => <SpeakerModel key={`sub-${i}`} position={[s.x, s.y, s.z]} label={s.label} type="sub" />)}
    <OrbitControls makeDefault target={[0, 0.9, 0]} minDistance={5} maxDistance={16} maxPolarAngle={Math.PI / 2.05} />
    <Environment preset="warehouse" />
  </>;
}

export default function App() {
  const [roomWidth, setRoomWidth] = useState(15);
  const [roomDepth, setRoomDepth] = useState(22);
  const [roomHeight, setRoomHeight] = useState(9);
  const [displayMode, setDisplayMode] = useState("projector_16_9");
  const [projectorId, setProjectorId] = useState("sony_xw5000es");
  const [throwPosition, setThrowPosition] = useState(0.5);
  const [screenSize, setScreenSize] = useState(120);
  const [layoutKey, setLayoutKey] = useState("7.2.4");
  const [rows, setRows] = useState(2);
  const [seatingKey, setSeatingKey] = useState("row4");
  const [rowSpacing, setRowSpacing] = useState(2.5);
  const [frontSpeakerType, setFrontSpeakerType] = useState("inwall");
  const [surroundSpeakerType, setSurroundSpeakerType] = useState("inwall");
  const [atmosSpeakerType, setAtmosSpeakerType] = useState("inceiling");
  const [acousticSide, setAcousticSide] = useState(true);
  const [acousticRear, setAcousticRear] = useState(true);
  const [acousticFront, setAcousticFront] = useState(false);

  const safeProjectorId = ensureProjectorId(displayMode, projectorId);
  const layout = useMemo(() => buildLayout({ roomWidthFt: roomWidth, roomDepthFt: roomDepth, roomHeightFt: roomHeight, screenSize, displayMode, projectorId: safeProjectorId, throwPosition, layoutKey, rows, seatingKey, rowSpacingFt: rowSpacing, acoustic: { side: acousticSide, rear: acousticRear, front: acousticFront } }), [roomWidth, roomDepth, roomHeight, screenSize, displayMode, safeProjectorId, throwPosition, layoutKey, rows, seatingKey, rowSpacing, acousticSide, acousticRear, acousticFront]);
  const allowedProjectors = getAllowedProjectors(displayMode);
  const canUseThreeRows = buildLayout({ roomWidthFt: roomWidth, roomDepthFt: roomDepth, roomHeightFt: roomHeight, screenSize, displayMode, projectorId: safeProjectorId, throwPosition, layoutKey, rows: 3, seatingKey, rowSpacingFt: rowSpacing, acoustic: { side: acousticSide, rear: acousticRear, front: acousticFront } }).validRows >= 3;

  const onRowsChange = (value) => {
    const next = Number(value);
    const test = buildLayout({ roomWidthFt: roomWidth, roomDepthFt: roomDepth, roomHeightFt: roomHeight, screenSize, displayMode, projectorId: safeProjectorId, throwPosition, layoutKey, rows: next, seatingKey, rowSpacingFt: rowSpacing, acoustic: { side: acousticSide, rear: acousticRear, front: acousticFront } });
    if (test.validRows >= next) setRows(next);
  };

  const onScreenChange = (value) => {
    const next = Number(value);
    const test = buildLayout({ roomWidthFt: roomWidth, roomDepthFt: roomDepth, roomHeightFt: roomHeight, screenSize: next, displayMode, projectorId: safeProjectorId, throwPosition, layoutKey, rows, seatingKey, rowSpacingFt: rowSpacing, acoustic: { side: acousticSide, rear: acousticRear, front: acousticFront } });
    if (next <= test.screenRange.max) setScreenSize(next);
  };

  const onDisplayModeChange = (value) => {
    const nextProjectorId = ensureProjectorId(value, safeProjectorId);
    setDisplayMode(value); setProjectorId(nextProjectorId);
  };

  return <div className="page"><div className="shell">
    <aside className="sidebar">
      <div className="sidebar-top"><div><div className="eyebrow">Fam Tech Media</div><h1 className="title">3D Beta 2</h1><p className="subtitle">Display modes, projector filtering, throw slider, dynamic speaker movement, screen elevation logic, and acoustic wall options.</p></div><div className="badge">KEF + Prime</div></div>

      <section className="section"><h2>1. Room Size</h2><div className="grid3">
        <label><span>Width</span><input type="number" value={roomWidth} onChange={(e) => setRoomWidth(Number(e.target.value || 0))} /></label>
        <label><span>Depth</span><input type="number" value={roomDepth} onChange={(e) => setRoomDepth(Number(e.target.value || 0))} /></label>
        <label><span>Height</span><input type="number" value={roomHeight} onChange={(e) => setRoomHeight(Number(e.target.value || 0))} /></label>
      </div></section>

      <section className="section"><h2>2. Display</h2>
        <label><span>Display Type</span><select value={displayMode} onChange={(e) => onDisplayModeChange(e.target.value)}>{DISPLAY_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label>
        {displayMode !== "tv" && <>
          <label><span>Projector Model</span><select value={safeProjectorId} onChange={(e) => setProjectorId(e.target.value)}>{allowedProjectors.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          {layout.throwZone && <label><span>Projector Throw Position: {mToFt(layout.throwZone.current).toFixed(1)} ft ({mToFt(layout.throwZone.min).toFixed(1)}–{mToFt(layout.throwZone.max).toFixed(1)} ft allowed)</span><input type="range" min={0} max={100} value={Math.round(throwPosition * 100)} onChange={(e) => setThrowPosition(Number(e.target.value) / 100)} /></label>}
        </>}
        <label><span>Screen Size: {screenSize}"</span><input type="range" min={displayMode === "tv" ? 65 : 80} max={displayMode === "tv" ? 115 : 180} value={screenSize} onChange={(e) => onScreenChange(e.target.value)} /></label>
        <div className="helper">Recommended size for this room: {layout.screenRange.min}"-{layout.screenRange.max}"</div>
      </section>

      <section className="section"><h2>3. Audio Layout</h2>
        <label><span>Dolby Atmos Layout</span><select value={layoutKey} onChange={(e) => setLayoutKey(e.target.value)}>{Object.keys(LAYOUTS).map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>Front LCR</span><select value={frontSpeakerType} onChange={(e) => setFrontSpeakerType(e.target.value)}>{FRONT_SPEAKERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label><span>Surround / Rear</span><select value={surroundSpeakerType} onChange={(e) => setSurroundSpeakerType(e.target.value)}>{SURROUND_SPEAKERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label><span>Atmos</span><select value={atmosSpeakerType} onChange={(e) => setAtmosSpeakerType(e.target.value)}>{ATMOS_SPEAKERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      </section>

      <section className="section"><h2>4. Seating</h2><div className="grid2">
        <label><span>Rows</span><select value={rows} onChange={(e) => onRowsChange(e.target.value)}><option value={1}>1 Row</option><option value={2}>2 Rows</option><option value={3} disabled={!canUseThreeRows}>3 Rows {!canUseThreeRows ? "(blocked)" : ""}</option></select></label>
        <label><span>Seats Per Row</span><select value={seatingKey} onChange={(e) => setSeatingKey(e.target.value)}>{Object.entries(SEATING).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
      </div><label><span>Row Spacing: {rowSpacing.toFixed(1)} ft</span><input type="range" min={2.0} max={5.0} step={0.1} value={rowSpacing} onChange={(e) => setRowSpacing(Number(e.target.value))} /></label></section>

      <section className="section"><h2>5. Prime Acoustics</h2><div className="checks">
        <label className="check"><input type="checkbox" checked={acousticSide} onChange={(e) => setAcousticSide(e.target.checked)} /><span>Side Panels</span></label>
        <label className="check"><input type="checkbox" checked={acousticRear} onChange={(e) => setAcousticRear(e.target.checked)} /><span>Rear Panels</span></label>
        <label className="check"><input type="checkbox" checked={acousticFront} onChange={(e) => setAcousticFront(e.target.checked)} /><span>Front Wall Treatment</span></label>
      </div></section>

      <div className="stats">
        <div className="stat"><div className="stat-label">Viewing Distance</div><div className="stat-value">{layout.viewingDistanceFt} ft</div></div>
        <div className="stat"><div className="stat-label">Valid Rows</div><div className="stat-value">{layout.validRows}</div></div>
        <div className="stat"><div className="stat-label">Display</div><div className="stat-value">{DISPLAY_MODES.find((d) => d.value === displayMode)?.label}</div></div>
        <div className="stat"><div className="stat-label">Room</div><div className="stat-value">{roomWidth}' × {roomDepth}'</div></div>
      </div>

      {!!layout.issues.length && <div className="warning"><div className="warning-title">Design notes</div><ul>{layout.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}</ul></div>}
    </aside>

    <main className="viewer-card"><div className="viewer-top"><div><h2>Live 3D Theater View</h2><p>Rows only render when valid. Speakers reposition dynamically as the room, screen, seating, and display mode change.</p></div><div className="tag">3D Beta 2</div></div>
      <div className="viewer-stage"><Canvas shadows camera={{ position: [0, 4.8, 7.8], fov: 42 }}><Suspense fallback={null}><TheaterScene layout={layout} frontSpeakerType={frontSpeakerType} surroundSpeakerType={surroundSpeakerType} atmosSpeakerType={atmosSpeakerType} displayMode={displayMode} /></Suspense></Canvas></div>
    </main>
  </div></div>;
}
