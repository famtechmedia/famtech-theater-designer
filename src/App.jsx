import React, { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox, Text, Html } from "@react-three/drei";
import "./styles.css";

const LAYOUTS = {
  "5.1.2": { surrounds: 2, rears: 0, heights: 2, subs: 1, wides: 0 },
  "5.1.4": { surrounds: 2, rears: 0, heights: 4, subs: 1, wides: 0 },
  "7.1.2": { surrounds: 2, rears: 2, heights: 2, subs: 1, wides: 0 },
  "7.1.4": { surrounds: 2, rears: 2, heights: 4, subs: 1, wides: 0 },
  "7.2.4": { surrounds: 2, rears: 2, heights: 4, subs: 2, wides: 0 },
  "9.2.4": { surrounds: 2, rears: 2, heights: 4, subs: 2, wides: 2 },
};

const SEATING = {
  loveseat: { label: "Loveseat", seats: 2, widthM: 2.1 },
  row3: { label: "Row of 3", seats: 3, widthM: 2.9 },
  row4: { label: "Row of 4", seats: 4, widthM: 3.7 },
  row5: { label: "Row of 5", seats: 5, widthM: 4.5 },
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function ftToM(ft) {
  return ft * 0.3048;
}

function recommendedScreen(widthFt, depthFt) {
  const maxByWall = Math.floor((widthFt - 2.4) / 0.0726);
  const idealDistance = clamp(depthFt * 0.56, 8, depthFt - 6);
  const idealDiag = Math.round((idealDistance / 1.7) * 12);
  const min = clamp(Math.round(idealDiag * 0.9), 80, 160);
  const max = clamp(Math.min(Math.round(idealDiag * 1.1), maxByWall), min, 180);
  return { min, max };
}

function buildLayout({ roomWidthFt, roomDepthFt, roomHeightFt, screenSize, layoutKey, rows, seatingKey }) {
  const layout = LAYOUTS[layoutKey];
  const seating = SEATING[seatingKey];

  const roomW = ftToM(roomWidthFt);
  const roomD = ftToM(roomDepthFt);
  const roomH = ftToM(roomHeightFt);

  const stageDepth = 1.0;
  const frontWalk = 0.65;
  const rowDepth = 1.15;
  const rowGap = 0.55;
  const rearClearance = layout.rears ? 1.1 : 0.75;
  const sideClearance = layout.wides ? 0.75 : 0.45;

  const neededWidth = seating.widthM + sideClearance * 2;
  const neededDepth = stageDepth + frontWalk + rows * rowDepth + (rows - 1) * rowGap + rearClearance + 1.0;

  const screenRange = recommendedScreen(roomWidthFt, roomDepthFt);
  const issues = [];

  if (roomW < neededWidth) {
    issues.push(`Room too narrow for ${seating.label}. Increase width or reduce seating size.`);
  }
  if (roomD < neededDepth) {
    issues.push(`Room too shallow for ${rows} row(s). Increase depth or reduce rows.`);
  }
  if (screenSize > screenRange.max) {
    issues.push(`Screen too large. Recommended range is ${screenRange.min}"-${screenRange.max}".`);
  }

  const isValid = issues.length === 0;
  const viewingDistanceFt = clamp(Number(((screenSize / 12) * 1.7).toFixed(1)), 8, roomDepthFt - 6.5);

  const firstRowZ = -ftToM(viewingDistanceFt) + 0.5;

  const rowsData = Array.from({ length: rows }).map((_, i) => ({
    z: firstRowZ - i * (rowDepth + rowGap),
    seats: seating.seats,
    widthM: seating.widthM,
    label: `Row ${i + 1}`,
  }));

  const screenWidthM = clamp(ftToM(screenSize * 0.0726), 1.8, roomW - 0.7);
  const mainListenZ = rowsData[0]?.z ?? -roomD * 0.35;
  const rearZ = rowsData[rowsData.length - 1]?.z - 1.0 ?? -roomD / 2 + 0.8;

  const riser =
    rows > 1
      ? {
          width: seating.widthM + 0.5,
          depth: Math.abs((rowsData[rowsData.length - 1]?.z ?? 0) - (rowsData[1]?.z ?? 0)) + 1.2,
          z: (rowsData[1]?.z ?? 0) - 0.15,
          height: rows === 2 ? 0.18 : 0.24,
        }
      : null;

  return {
    isValid,
    issues,
    viewingDistanceFt,
    screenRange,
    roomW,
    roomD,
    roomH,
    screenWidthM,
    rowsData,
    riser,
    projector: {
      x: 0,
      y: roomH - 0.35,
      z: clamp(-ftToM(screenSize * 0.42), -roomD / 2 + 0.9, -2.6),
    },
    speakers: {
      fronts: [
        { x: -screenWidthM * 0.43, y: 0.55, z: roomD / 2 - 0.85, label: "L" },
        { x: 0, y: 0.42, z: roomD / 2 - 0.7, label: "C" },
        { x: screenWidthM * 0.43, y: 0.55, z: roomD / 2 - 0.85, label: "R" },
      ],
      wides: layout.wides
        ? [
            { x: -roomW / 2 + 0.32, y: 0.8, z: roomD * 0.12, label: "FWL" },
            { x: roomW / 2 - 0.32, y: 0.8, z: roomD * 0.12, label: "FWR" },
          ]
        : [],
      surrounds: [
        { x: -roomW / 2 + 0.24, y: 1.15, z: mainListenZ, label: "SL" },
        { x: roomW / 2 - 0.24, y: 1.15, z: mainListenZ, label: "SR" },
      ],
      rears: layout.rears
        ? [
            { x: -roomW / 2 + 0.28, y: 1.15, z: rearZ, label: "SBL" },
            { x: roomW / 2 - 0.28, y: 1.15, z: rearZ, label: "SBR" },
          ]
        : [],
      heights:
        layout.heights === 2
          ? [
              { x: -0.65, y: roomH - 0.2, z: mainListenZ + 0.15, label: "TML" },
              { x: 0.65, y: roomH - 0.2, z: mainListenZ + 0.15, label: "TMR" },
            ]
          : [
              { x: -0.85, y: roomH - 0.2, z: 1.0, label: "TFL" },
              { x: 0.85, y: roomH - 0.2, z: 1.0, label: "TFR" },
              { x: -0.85, y: roomH - 0.2, z: -1.9, label: "TRL" },
              { x: 0.85, y: roomH - 0.2, z: -1.9, label: "TRR" },
            ],
      subs:
        layout.subs === 2
          ? [
              { x: -1.35, y: 0.2, z: roomD / 2 - 0.7, label: "SUB" },
              { x: 1.35, y: 0.2, z: roomD / 2 - 0.7, label: "SUB" },
            ]
          : [{ x: 0, y: 0.2, z: roomD / 2 - 0.7, label: "SUB" }],
    },
    acoustic: {
      sideZ: mainListenZ,
      rearZ: -roomD / 2 + 0.06,
    },
  };
}

function RoomShell({ width, depth, height }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#151519" roughness={0.95} metalness={0.03} />
      </mesh>

      <mesh position={[0, height / 2, depth / 2]} receiveShadow>
        <boxGeometry args={[width, height, 0.05]} />
        <meshStandardMaterial color="#111115" roughness={1} />
      </mesh>

      <mesh position={[0, height / 2, -depth / 2]} receiveShadow>
        <boxGeometry args={[width, height, 0.05]} />
        <meshStandardMaterial color="#101014" roughness={1} />
      </mesh>

      <mesh position={[-width / 2, height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.05, height, depth]} />
        <meshStandardMaterial color="#121218" roughness={1} />
      </mesh>

      <mesh position={[width / 2, height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.05, height, depth]} />
        <meshStandardMaterial color="#121218" roughness={1} />
      </mesh>
    </group>
  );
}

function ScreenWall({ width, roomDepth }) {
  return (
    <group position={[0, 1.58, roomDepth / 2 - 0.08]}>
      <RoundedBox args={[width, 0.9, 0.03]} radius={0.03} smoothness={4} castShadow>
        <meshStandardMaterial color="#f1f1f1" emissive="#ffffff" emissiveIntensity={0.08} />
      </RoundedBox>
      <Text position={[0, 0.68, 0]} fontSize={0.11} color="#bfc1c7" anchorX="center" anchorY="middle">
        Projection Screen
      </Text>
    </group>
  );
}

function ProjectorModel({ position }) {
  return (
    <group position={position} castShadow>
      <RoundedBox args={[0.42, 0.12, 0.28]} radius={0.03} smoothness={4}>
        <meshStandardMaterial color="#d7dde5" metalness={0.2} roughness={0.45} />
      </RoundedBox>
      <mesh position={[0.13, 0, 0.1]}>
        <cylinderGeometry args={[0.045, 0.045, 0.02, 24]} />
        <meshStandardMaterial color="#0b1220" metalness={0.45} roughness={0.2} />
      </mesh>
    </group>
  );
}

function SpeakerModel({ position, label, type = "inwall" }) {
  return (
    <group position={position}>
      {type === "height" ? (
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.04, 28]} />
          <meshStandardMaterial color="#ece8ff" />
        </mesh>
      ) : type === "sub" ? (
        <RoundedBox args={[0.28, 0.28, 0.28]} radius={0.03} smoothness={4} castShadow>
          <meshStandardMaterial color="#18b7a0" />
        </RoundedBox>
      ) : type === "tower" ? (
        <RoundedBox args={[0.16, 0.72, 0.16]} radius={0.03} smoothness={4} castShadow>
          <meshStandardMaterial color="#efd8af" />
        </RoundedBox>
      ) : (
        <RoundedBox args={[0.18, 0.42, 0.12]} radius={0.025} smoothness={4} castShadow>
          <meshStandardMaterial color="#efd8af" />
        </RoundedBox>
      )}
      <Html distanceFactor={12} position={[0, type === "tower" ? 0.48 : 0.22, 0]} center>
        <div className="speaker-label">{label}</div>
      </Html>
    </group>
  );
}

function Chair({ position }) {
  return (
    <group position={position} castShadow>
      <RoundedBox args={[0.68, 0.22, 0.88]} radius={0.06} smoothness={4} position={[0, 0.18, 0]}>
        <meshStandardMaterial color="#4f4f59" roughness={0.82} />
      </RoundedBox>
      <RoundedBox args={[0.62, 0.54, 0.18]} radius={0.05} smoothness={4} position={[0, 0.46, 0.33]}>
        <meshStandardMaterial color="#6c6c77" roughness={0.72} />
      </RoundedBox>
      <RoundedBox args={[0.08, 0.26, 0.68]} radius={0.03} smoothness={4} position={[-0.34, 0.24, 0]}>
        <meshStandardMaterial color="#878792" />
      </RoundedBox>
      <RoundedBox args={[0.08, 0.26, 0.68]} radius={0.03} smoothness={4} position={[0.34, 0.24, 0]}>
        <meshStandardMaterial color="#878792" />
      </RoundedBox>
    </group>
  );
}

function SeatRow3D({ row }) {
  const spacing = 0.75;
  const totalWidth = (row.seats - 1) * spacing;
  return (
    <group>
      {Array.from({ length: row.seats }).map((_, i) => (
        <Chair key={i} position={[-totalWidth / 2 + i * spacing, 0, row.z]} />
      ))}
      <Html distanceFactor={12} position={[0, 0.95, row.z]} center>
        <div className="row-label">{row.label}</div>
      </Html>
    </group>
  );
}

function Riser({ riser }) {
  return (
    <group position={[0, riser.height / 2 - 0.01, riser.z]}>
      <RoundedBox args={[riser.width, riser.height, riser.depth]} radius={0.05} smoothness={4} receiveShadow>
        <meshStandardMaterial color="#232329" roughness={0.96} />
      </RoundedBox>
    </group>
  );
}

function AcousticPanels({ layout }) {
  return (
    <group>
      <mesh position={[-layout.roomW / 2 + 0.06, 1.45, layout.acoustic.sideZ]}>
        <boxGeometry args={[0.06, 0.95, 0.7]} />
        <meshStandardMaterial color="#234da0" roughness={0.9} />
      </mesh>
      <mesh position={[layout.roomW / 2 - 0.06, 1.45, layout.acoustic.sideZ]}>
        <boxGeometry args={[0.06, 0.95, 0.7]} />
        <meshStandardMaterial color="#234da0" roughness={0.9} />
      </mesh>
      <mesh position={[-1.1, 1.45, layout.acoustic.rearZ]}>
        <boxGeometry args={[0.9, 0.95, 0.08]} />
        <meshStandardMaterial color="#234da0" roughness={0.9} />
      </mesh>
      <mesh position={[1.1, 1.45, layout.acoustic.rearZ]}>
        <boxGeometry args={[0.9, 0.95, 0.08]} />
        <meshStandardMaterial color="#234da0" roughness={0.9} />
      </mesh>
    </group>
  );
}

function TheaterScene({ layout, showAcoustic, bedType, roomHeightFt }) {
  return (
    <>
      <ambientLight intensity={0.78} />
      <directionalLight position={[2.5, 5.5, 2.5]} intensity={1.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <spotLight position={[0, 2.7, layout.roomD / 2 - 0.8]} angle={0.52} intensity={18} penumbra={0.85} color="#e5d0a5" />

      <RoomShell width={layout.roomW} depth={layout.roomD} height={ftToM(roomHeightFt)} />
      <ScreenWall width={layout.screenWidthM} roomDepth={layout.roomD} />
      <ProjectorModel position={[layout.projector.x, layout.projector.y, layout.projector.z]} />

      {showAcoustic && <AcousticPanels layout={layout} />}
      {layout.riser && <Riser riser={layout.riser} />}
      {layout.rowsData.map((row, i) => <SeatRow3D key={i} row={row} />)}

      {layout.speakers.fronts.map((s, i) => <SpeakerModel key={`f-${i}`} position={[s.x, s.y, s.z]} label={s.label} type={bedType} />)}
      {layout.speakers.wides.map((s, i) => <SpeakerModel key={`w-${i}`} position={[s.x, s.y, s.z]} label={s.label} type={bedType} />)}
      {layout.speakers.surrounds.map((s, i) => <SpeakerModel key={`s-${i}`} position={[s.x, s.y, s.z]} label={s.label} type={bedType} />)}
      {layout.speakers.rears.map((s, i) => <SpeakerModel key={`r-${i}`} position={[s.x, s.y, s.z]} label={s.label} type={bedType} />)}
      {layout.speakers.heights.map((s, i) => <SpeakerModel key={`h-${i}`} position={[s.x, s.y, s.z]} label={s.label} type="height" />)}
      {layout.speakers.subs.map((s, i) => <SpeakerModel key={`sub-${i}`} position={[s.x, s.y, s.z]} label={s.label} type="sub" />)}

      <OrbitControls makeDefault target={[0, 0.9, 0]} minDistance={5} maxDistance={16} maxPolarAngle={Math.PI / 2.05} />
      <Environment preset="warehouse" />
    </>
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
    () => buildLayout({ roomWidthFt: roomWidth, roomDepthFt: roomDepth, roomHeightFt: roomHeight, screenSize, layoutKey, rows, seatingKey }),
    [roomWidth, roomDepth, roomHeight, screenSize, layoutKey, rows, seatingKey]
  );

  const canUseThreeRows = buildLayout({
    roomWidthFt: roomWidth,
    roomDepthFt: roomDepth,
    roomHeightFt: roomHeight,
    screenSize,
    layoutKey,
    rows: 3,
    seatingKey,
  }).isValid;

  const onRowsChange = (value) => {
    const next = Number(value);
    const test = buildLayout({
      roomWidthFt: roomWidth,
      roomDepthFt: roomDepth,
      roomHeightFt: roomHeight,
      screenSize,
      layoutKey,
      rows: next,
      seatingKey,
    });
    if (test.isValid) setRows(next);
  };

  const onScreenChange = (value) => {
    const next = Number(value);
    const test = buildLayout({
      roomWidthFt: roomWidth,
      roomDepthFt: roomDepth,
      roomHeightFt: roomHeight,
      screenSize: next,
      layoutKey,
      rows,
      seatingKey,
    });
    if (next <= test.screenRange.max) setScreenSize(next);
  };

  return (
    <div className="page">
      <div className="shell">
        <aside className="sidebar">
          <div className="sidebar-top">
            <div>
              <div className="eyebrow">Fam Tech Media</div>
              <h1 className="title">3D Theater Designer</h1>
              <p className="subtitle">
                Real 3D foundation with orbit controls, projector-first planning, seating rows, riser logic,
                and speaker placement in a 3D room.
              </p>
            </div>
            <div className="badge">3D Alpha</div>
          </div>

          <section className="section">
            <h2>1. Room Size</h2>
            <div className="grid3">
              <label>
                <span>Width</span>
                <input type="number" value={roomWidth} onChange={(e) => setRoomWidth(Number(e.target.value || 0))} />
              </label>
              <label>
                <span>Depth</span>
                <input type="number" value={roomDepth} onChange={(e) => setRoomDepth(Number(e.target.value || 0))} />
              </label>
              <label>
                <span>Height</span>
                <input type="number" value={roomHeight} onChange={(e) => setRoomHeight(Number(e.target.value || 0))} />
              </label>
            </div>
          </section>

          <section className="section">
            <h2>2. Screen</h2>
            <label>
              <span>Screen Size: {screenSize}"</span>
              <input type="range" min={80} max={180} value={screenSize} onChange={(e) => onScreenChange(e.target.value)} />
            </label>
            <div className="helper">Recommended size for this room: {layout.screenRange.min}"-{layout.screenRange.max}"</div>
          </section>

          <section className="section">
            <h2>3. Audio Layout</h2>
            <label>
              <span>Dolby Atmos Layout</span>
              <select value={layoutKey} onChange={(e) => setLayoutKey(e.target.value)}>
                {Object.keys(LAYOUTS).map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Speaker Style</span>
              <select value={bedType} onChange={(e) => setBedType(e.target.value)}>
                <option value="inwall">In-Wall</option>
                <option value="tower">Floorstanding</option>
              </select>
            </label>
          </section>

          <section className="section">
            <h2>4. Seating</h2>
            <div className="grid2">
              <label>
                <span>Rows</span>
                <select value={rows} onChange={(e) => onRowsChange(e.target.value)}>
                  <option value={1}>1 Row</option>
                  <option value={2}>2 Rows</option>
                  <option value={3} disabled={!canUseThreeRows}>3 Rows {!canUseThreeRows ? "(blocked)" : ""}</option>
                </select>
              </label>
              <label>
                <span>Seats Per Row</span>
                <select value={seatingKey} onChange={(e) => setSeatingKey(e.target.value)}>
                  {Object.entries(SEATING).map(([key, item]) => (
                    <option key={key} value={key}>{item.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="section">
            <h2>5. Enhancements</h2>
            <button className="button" onClick={() => setShowAcoustic((v) => !v)}>
              {showAcoustic ? "Hide Acoustic Panels" : "Show Acoustic Panels"}
            </button>
          </section>

          <div className="stats">
            <div className="stat"><div className="stat-label">Viewing Distance</div><div className="stat-value">{layout.viewingDistanceFt} ft</div></div>
            <div className="stat"><div className="stat-label">Layout</div><div className="stat-value">{layoutKey}</div></div>
            <div className="stat"><div className="stat-label">Projector Throw</div><div className="stat-value">{Math.abs(layout.projector.z).toFixed(1)} m</div></div>
            <div className="stat"><div className="stat-label">Room</div><div className="stat-value">{roomWidth}' × {roomDepth}'</div></div>
          </div>

          {!layout.isValid && (
            <div className="warning">
              <div className="warning-title">This layout is blocked</div>
              <ul>
                {layout.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
              </ul>
            </div>
          )}
        </aside>

        <main className="viewer-card">
          <div className="viewer-top">
            <div>
              <h2>Live 3D Theater View</h2>
              <p>Rotate, zoom, and inspect the room in 3D. This is the right foundation for the premium designer you want.</p>
            </div>
            <div className="tag">Orbit Enabled</div>
          </div>

          <div className="viewer-stage">
            <Canvas shadows camera={{ position: [0, 4.8, 7.8], fov: 42 }}>
              <Suspense fallback={null}>
                <TheaterScene layout={layout} showAcoustic={showAcoustic} bedType={bedType} roomHeightFt={roomHeight} />
              </Suspense>
            </Canvas>
          </div>
        </main>
      </div>
    </div>
  );
}
