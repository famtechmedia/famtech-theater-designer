import React, { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox, Text, Html } from "@react-three/drei";

const LAYOUTS = {
  "5.1.2": { surrounds: 2, rears: 0, heights: 2, subs: 1 },
  "5.1.4": { surrounds: 2, rears: 0, heights: 4, subs: 1 },
  "7.1.2": { surrounds: 2, rears: 2, heights: 2, subs: 1 },
  "7.1.4": { surrounds: 2, rears: 2, heights: 4, subs: 1 },
  "7.2.4": { surrounds: 2, rears: 2, heights: 4, subs: 2 },
  "9.2.4": { surrounds: 2, rears: 2, heights: 4, subs: 2, wides: 2 },
};

const SEATING = {
  loveseat: { label: "Loveseat", seats: 2, width: 2.1 },
  row3: { label: "Row of 3", seats: 3, width: 2.9 },
  row4: { label: "Row of 4", seats: 4, width: 3.7 },
  row5: { label: "Row of 5", seats: 5, width: 4.5 },
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function recommendedScreen(widthFt, depthFt) {
  const maxByWall = Math.floor((widthFt - 2.4) / 0.0726);
  const idealDistance = clamp(depthFt * 0.56, 8, depthFt - 6);
  const idealDiag = Math.round((idealDistance / 1.7) * 12);
  const min = clamp(Math.round(idealDiag * 0.9), 80, 160);
  const max = clamp(Math.min(Math.round(idealDiag * 1.1), maxByWall), min, 180);
  return { min, max };
}

function buildLayout({ roomWidth, roomDepth, screenSize, layoutKey, rows, seatingKey }) {
  const layout = LAYOUTS[layoutKey];
  const seating = SEATING[seatingKey];

  const stageDepth = 1.1;
  const frontWalk = 0.6;
  const rowDepth = 1.15;
  const rowGap = 0.55;
  const rearClearance = layout.rears ? 1.1 : 0.7;
  const sideClearance = layout.wides ? 0.7 : 0.45;

  const widthNeeded = seating.width + sideClearance * 2;
  const depthNeeded = stageDepth + frontWalk + rows * rowDepth + (rows - 1) * rowGap + rearClearance + 1.1;

  const screenRange = recommendedScreen(roomWidth, roomDepth);
  const issues = [];

  if (roomWidth < widthNeeded) {
    issues.push(`Room too narrow for ${seating.label}. Increase width or reduce seating size.`);
  }
  if (roomDepth < depthNeeded) {
    issues.push(`Room too shallow for ${rows} row(s). Increase depth or reduce rows.`);
  }
  if (screenSize > screenRange.max) {
    issues.push(`Screen too large. Recommended range is ${screenRange.min}"-${screenRange.max}".`);
  }

  const isValid = issues.length === 0;

  const viewingDistanceFt = clamp(Number(((screenSize / 12) * 1.7).toFixed(1)), 8, roomDepth - 6.5);
  const firstRowZ = -(viewingDistanceFt * 0.3048) + 0.45;

  const rowsData = Array.from({ length: rows }).map((_, i) => ({
    z: firstRowZ - i * (rowDepth + rowGap),
    width: seating.width,
    seats: seating.seats,
    label: `Row ${i + 1}`,
  }));

  const roomWm = roomWidth * 0.3048;
  const roomDm = roomDepth * 0.3048;
  const screenWidthM = clamp((screenSize * 0.0726) * 0.3048, 1.8, roomWm - 0.7);
  const centerZ = rowsData[0]?.z ?? -roomDm * 0.4;
  const rearZ = rowsData[rowsData.length - 1]?.z - 1.0 ?? -roomDm + 0.7;

  return {
    isValid,
    issues,
    viewingDistanceFt,
    screenRange,
    roomWm,
    roomDm,
    screenWidthM,
    rowsData,
    riser:
      rows > 1
        ? {
            width: seating.width + 0.45,
            depth: Math.abs((rowsData[rowsData.length - 1]?.z ?? 0) - (rowsData[1]?.z ?? 0)) + 1.15,
            z: (rowsData[1]?.z ?? 0) - 0.15,
            height: rows === 2 ? 0.18 : 0.24,
          }
        : null,
    projector: {
      z: clamp(-(screenSize / 12) * 0.42, -roomDm + 0.9, -2.6),
      y: 2.55,
    },
    speakers: {
      fronts: [
        { x: -screenWidthM * 0.43, y: 0.55, z: roomDm / 2 - 0.9, label: "L" },
        { x: 0, y: 0.42, z: roomDm / 2 - 0.72, label: "C" },
        { x: screenWidthM * 0.43, y: 0.55, z: roomDm / 2 - 0.9, label: "R" },
      ],
      wides: layout.wides
        ? [
            { x: -roomWm / 2 + 0.32, y: 0.75, z: roomDm * 0.15, label: "FWL" },
            { x: roomWm / 2 - 0.32, y: 0.75, z: roomDm * 0.15, label: "FWR" },
          ]
        : [],
      surrounds: [
        { x: -roomWm / 2 + 0.24, y: 1.1, z: centerZ, label: "SL" },
        { x: roomWm / 2 - 0.24, y: 1.1, z: centerZ, label: "SR" },
      ],
      rears: layout.rears
        ? [
            { x: -roomWm / 2 + 0.28, y: 1.1, z: rearZ, label: "SBL" },
            { x: roomWm / 2 - 0.28, y: 1.1, z: rearZ, label: "SBR" },
          ]
        : [],
      heights:
        layout.heights === 2
          ? [
              { x: -0.65, y: 2.75, z: centerZ + 0.2, label: "TML" },
              { x: 0.65, y: 2.75, z: centerZ + 0.2, label: "TMR" },
            ]
          : [
              { x: -0.85, y: 2.75, z: 1.0, label: "TFL" },
              { x: 0.85, y: 2.75, z: 1.0, label: "TFR" },
              { x: -0.85, y: 2.75, z: -1.9, label: "TRL" },
              { x: 0.85, y: 2.75, z: -1.9, label: "TRR" },
            ],
      subs:
        layout.subs === 2
          ? [
              { x: -1.35, y: 0.35, z: roomDm / 2 - 0.7, label: "SUB" },
              { x: 1.35, y: 0.35, z: roomDm / 2 - 0.7, label: "SUB" },
            ]
          : [{ x: 0, y: 0.35, z: roomDm / 2 - 0.7, label: "SUB" }],
    },
    acoustic: {
      side: [
        { x: 0.6, y: centerZ, width: 0.22, height: 0.95, depth: 0.7 },
        { x: roomWm - 0.6, y: centerZ, width: 0.22, height: 0.95, depth: 0.7 },
      ],
      rear: [
        { x: -1.1, y: -roomDm / 2 + 0.08, width: 0.9, height: 0.95, depth: 0.08 },
        { x: 1.1, y: -roomDm / 2 + 0.08, width: 0.9, height: 0.95, depth: 0.08 },
      ],
    },
  };
}

function RoomShell({ width, depth, height }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#151519" roughness={0.95} metalness={0.04} />
      </mesh>

      <mesh position={[0, height / 2, depth / 2]} receiveShadow>
        <boxGeometry args={[width, height, 0.05]} />
        <meshStandardMaterial color="#101014" roughness={1} />
      </mesh>

      <mesh position={[0, height / 2, -depth / 2]} receiveShadow>
        <boxGeometry args={[width, height, 0.05]} />
        <meshStandardMaterial color="#0f0f13" roughness={1} />
      </mesh>

      <mesh position={[-width / 2, height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.05, height, depth]} />
        <meshStandardMaterial color="#111116" roughness={1} />
      </mesh>

      <mesh position={[width / 2, height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.05, height, depth]} />
        <meshStandardMaterial color="#111116" roughness={1} />
      </mesh>
    </group>
  );
}

function ScreenWall({ width, roomDepth }) {
  return (
    <group position={[0, 1.62, roomDepth / 2 - 0.09]}>
      <RoundedBox args={[width, 0.92, 0.03]} radius={0.03} smoothness={4} castShadow>
        <meshStandardMaterial color="#f2f2f2" emissive="#ffffff" emissiveIntensity={0.08} />
      </RoundedBox>
      <Text position={[0, 0.72, 0]} fontSize={0.12} color="#bfc1c7" anchorX="center" anchorY="middle">
        Projection Screen
      </Text>
    </group>
  );
}

function ProjectorModel({ position }) {
  return (
    <group position={position} castShadow>
      <RoundedBox args={[0.42, 0.12, 0.28]} radius={0.03} smoothness={4}>
        <meshStandardMaterial color="#d7dde5" metalness={0.2} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0.13, 0, 0.1]}>
        <cylinderGeometry args={[0.045, 0.045, 0.02, 24]} />
        <meshStandardMaterial color="#0c1220" metalness={0.5} roughness={0.2} />
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
          <meshStandardMaterial color="#19b7a0" />
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
        <div style={{ color: "#f8e6bf", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</div>
      </Html>
    </group>
  );
}

function Chair({ position }) {
  return (
    <group position={position} castShadow>
      <RoundedBox args={[0.68, 0.22, 0.88]} radius={0.06} smoothness={4} position={[0, 0.18, 0]}>
        <meshStandardMaterial color="#4e4e58" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[0.62, 0.54, 0.18]} radius={0.05} smoothness={4} position={[0, 0.46, 0.33]}>
        <meshStandardMaterial color="#6b6b77" roughness={0.72} />
      </RoundedBox>
      <RoundedBox args={[0.08, 0.26, 0.68]} radius={0.03} smoothness={4} position={[-0.34, 0.24, 0]}>
        <meshStandardMaterial color="#858590" />
      </RoundedBox>
      <RoundedBox args={[0.08, 0.26, 0.68]} radius={0.03} smoothness={4} position={[0.34, 0.24, 0]}>
        <meshStandardMaterial color="#858590" />
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
        <div style={{ color: "#f5f5f5", fontSize: 12, fontWeight: 700 }}>{row.label}</div>
      </Html>
    </group>
  );
}

function Riser({ riser }) {
  return (
    <group position={[0, riser.height / 2 - 0.01, riser.z]}>
      <RoundedBox args={[riser.width, riser.height, riser.depth]} radius={0.05} smoothness={4} receiveShadow>
        <meshStandardMaterial color="#232329" roughness={0.95} />
      </RoundedBox>
    </group>
  );
}

function AcousticPanels({ layout }) {
  return (
    <group>
      <mesh position={[-layout.roomWm / 2 + 0.05, 1.45, layout.acoustic.side[0].y]}>
        <boxGeometry args={[0.06, layout.acoustic.side[0].height, layout.acoustic.side[0].depth]} />
        <meshStandardMaterial color="#234da0" roughness={0.9} />
      </mesh>
      <mesh position={[layout.roomWm / 2 - 0.05, 1.45, layout.acoustic.side[1].y]}>
        <boxGeometry args={[0.06, layout.acoustic.side[1].height, layout.acoustic.side[1].depth]} />
        <meshStandardMaterial color="#234da0" roughness={0.9} />
      </mesh>
      {layout.acoustic.rear.map((panel, i) => (
        <mesh key={i} position={[panel.x, 1.45, panel.y]}>
          <boxGeometry args={[panel.width, panel.height, panel.depth]} />
          <meshStandardMaterial color="#234da0" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function TheaterScene({ layout, showAcoustic, bedType, roomHeight }) {
  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[2.5, 5.5, 2.5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight position={[0, 2.7, layout.roomDm / 2 - 0.8]} angle={0.52} intensity={18} penumbra={0.85} color="#e5d0a5" />

      <RoomShell width={layout.roomWm} depth={layout.roomDm} height={roomHeight * 0.3048} />
      <ScreenWall width={layout.screenWidthM} roomDepth={layout.roomDm} />
      <ProjectorModel position={[0, layout.projector.y, layout.projector.z]} />

      {showAcoustic && <AcousticPanels layout={layout} />}

      {layout.riser && <Riser riser={layout.riser} />}

      {layout.rowsData.map((row, i) => (
        <SeatRow3D key={i} row={row} />
      ))}

      {layout.speakers.fronts.map((s, i) => (
        <SpeakerModel key={`f-${i}`} position={[s.x, s.y, s.z]} label={s.label} type={bedType} />
      ))}
      {layout.speakers.wides.map((s, i) => (
        <SpeakerModel key={`w-${i}`} position={[s.x, s.y, s.z]} label={s.label} type={bedType} />
      ))}
      {layout.speakers.surrounds.map((s, i) => (
        <SpeakerModel key={`s-${i}`} position={[s.x, s.y, s.z]} label={s.label} type={bedType} />
      ))}
      {layout.speakers.rears.map((s, i) => (
        <SpeakerModel key={`r-${i}`} position={[s.x, s.y, s.z]} label={s.label} type={bedType} />
      ))}
      {layout.speakers.heights.map((s, i) => (
        <SpeakerModel key={`h-${i}`} position={[s.x, s.y, s.z]} label={s.label} type="height" />
      ))}
      {layout.speakers.subs.map((s, i) => (
        <SpeakerModel key={`sub-${i}`} position={[s.x, s.y, s.z]} label={s.label} type="sub" />
      ))}

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
    () => buildLayout({ roomWidth, roomDepth, screenSize, layoutKey, rows, seatingKey }),
    [roomWidth, roomDepth, screenSize, layoutKey, rows, seatingKey]
  );

  const canUseThreeRows = buildLayout({
    roomWidth,
    roomDepth,
    screenSize,
    layoutKey,
    rows: 3,
    seatingKey,
  }).isValid;

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[400px_1fr] gap-6">
        <aside className="rounded-3xl border border-zinc-800 bg-zinc-900/90 shadow-2xl p-6 sticky top-4 h-fit">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-amber-400">Fam Tech Media</div>
              <h1 className="text-3xl font-semibold leading-tight mt-1">3D Theater Designer</h1>
              <p className="text-sm text-zinc-400 mt-2">
                This is now a real 3D foundation with orbit controls, projector-first planning, seating rows, riser logic,
                and speaker placement in a 3D room.
              </p>
            </div>
            <div className="rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs px-3 py-1">3D Alpha</div>
          </div>

          <div className="mt-6 space-y-5">
            <section className="border-t border-zinc-800 pt-5">
              <h2 className="text-base font-medium mb-3">1. Room Size</h2>
              <div className="grid grid-cols-3 gap-3">
                <label className="text-sm">
                  <span className="block text-zinc-400 mb-1">Width</span>
                  <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" type="number" value={roomWidth} onChange={(e) => setRoomWidth(Number(e.target.value || 0))} />
                </label>
                <label className="text-sm">
                  <span className="block text-zinc-400 mb-1">Depth</span>
                  <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" type="number" value={roomDepth} onChange={(e) => setRoomDepth(Number(e.target.value || 0))} />
                </label>
                <label className="text-sm">
                  <span className="block text-zinc-400 mb-1">Height</span>
                  <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" type="number" value={roomHeight} onChange={(e) => setRoomHeight(Number(e.target.value || 0))} />
                </label>
              </div>
            </section>

            <section className="border-t border-zinc-800 pt-5">
              <h2 className="text-base font-medium mb-3">2. Screen</h2>
              <label className="text-sm block">
                <span className="block text-zinc-400 mb-1">Screen Size: {screenSize}"</span>
                <input className="w-full" type="range" min={80} max={180} value={screenSize} onChange={(e) => onScreenChange(e.target.value)} />
              </label>
              <div className="text-xs text-zinc-500 mt-2">Recommended size for this room: {layout.screenRange.min}"-{layout.screenRange.max}"</div>
            </section>

            <section className="border-t border-zinc-800 pt-5">
              <h2 className="text-base font-medium mb-3">3. Audio Layout</h2>
              <label className="text-sm block">
                <span className="block text-zinc-400 mb-1">Dolby Atmos Layout</span>
                <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" value={layoutKey} onChange={(e) => setLayoutKey(e.target.value)}>
                  {Object.keys(LAYOUTS).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm block mt-3">
                <span className="block text-zinc-400 mb-1">Speaker Style</span>
                <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" value={bedType} onChange={(e) => setBedType(e.target.value)}>
                  <option value="inwall">In-Wall</option>
                  <option value="tower">Floorstanding</option>
                </select>
              </label>
            </section>

            <section className="border-t border-zinc-800 pt-5">
              <h2 className="text-base font-medium mb-3">4. Seating</h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm block">
                  <span className="block text-zinc-400 mb-1">Rows</span>
                  <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" value={rows} onChange={(e) => onRowsChange(e.target.value)}>
                    <option value={1}>1 Row</option>
                    <option value={2}>2 Rows</option>
                    <option value={3} disabled={!canUseThreeRows}>3 Rows {!canUseThreeRows ? "(blocked)" : ""}</option>
                  </select>
                </label>
                <label className="text-sm block">
                  <span className="block text-zinc-400 mb-1">Seats Per Row</span>
                  <select className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2" value={seatingKey} onChange={(e) => setSeatingKey(e.target.value)}>
                    {Object.entries(SEATING).map(([key, item]) => (
                      <option key={key} value={key}>{item.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="border-t border-zinc-800 pt-5">
              <h2 className="text-base font-medium mb-3">5. Enhancements</h2>
              <button className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800" onClick={() => setShowAcoustic((v) => !v)}>
                {showAcoustic ? "Hide Acoustic Panels" : "Show Acoustic Panels"}
              </button>
            </section>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-zinc-400 text-xs">Viewing Distance</div>
              <div className="mt-1 font-medium">{layout.viewingDistanceFt} ft</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-zinc-400 text-xs">Layout</div>
              <div className="mt-1 font-medium">{layoutKey}</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-zinc-400 text-xs">Projector Throw</div>
              <div className="mt-1 font-medium">{Math.abs(layout.projector.z).toFixed(1)} m</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="text-zinc-400 text-xs">Room</div>
              <div className="mt-1 font-medium">{roomWidth}' × {roomDepth}'</div>
            </div>
          </div>

          {!layout.isValid && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="font-medium text-red-300">This layout is blocked</div>
              <ul className="mt-2 space-y-1 text-sm text-red-200 list-disc pl-5">
                {layout.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
              </ul>
            </div>
          )}
        </aside>

        <main className="rounded-3xl border border-zinc-800 bg-zinc-900/90 shadow-2xl p-4 min-h-[760px] overflow-hidden">
          <div className="flex items-start justify-between gap-3 mb-4 px-2">
            <div>
              <h2 className="text-xl font-medium">Live 3D Theater View</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Rotate, zoom, and inspect the room in 3D. This is the correct foundation for the premium designer you want.
              </p>
            </div>
            <div className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-xs text-zinc-300">Orbit Enabled</div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_45%),linear-gradient(to_bottom,rgba(24,24,27,1),rgba(9,9,11,1))] h-[690px] overflow-hidden">
            <Canvas shadows camera={{ position: [0, 4.8, 7.8], fov: 42 }}>
              <Suspense fallback={null}>
                <TheaterScene layout={layout} showAcoustic={showAcoustic} bedType={bedType} roomHeight={roomHeight} />
              </Suspense>
            </Canvas>
          </div>
        </main>
      </div>
    </div>
  );
}
