import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";

/*
BETA 4 — FRONT STAGE CORRECTION
Focused on:
- correct seating orientation
- correct LCR placement logic
- surround vs rear placement
- AT screen support
*/

function Room({
  width,
  depth,
  rows,
  displayType,
  screenType,
}) {
  const screenZ = -depth / 2 + 0.5;

  const seatingZ = Array.from({ length: rows }).map(
    (_, i) => screenZ + 3 + i * 2.5
  );

  return (
    <>
      {/* FLOOR */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* BACK WALL */}
      <mesh position={[0, 1.5, depth / 2]}>
        <boxGeometry args={[width, 3, 0.1]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* LEFT WALL */}
      <mesh position={[-width / 2, 1.5, 0]}>
        <boxGeometry args={[0.1, 3, depth]} />
        <meshStandardMaterial color="#222" transparent opacity={0.15} />
      </mesh>

      {/* RIGHT WALL */}
      <mesh position={[width / 2, 1.5, 0]}>
        <boxGeometry args={[0.1, 3, depth]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* SCREEN */}
      <mesh position={[0, 1.3, screenZ]}>
        <boxGeometry args={[2.5, 1.4, 0.05]} />
        <meshStandardMaterial color="white" />
      </mesh>

      <Html position={[0, 2.2, screenZ]}>
        <div style={{ color: "white", fontSize: "12px" }}>SCREEN</div>
      </Html>

      {/* FRONT LCR */}
      {displayType !== "TV" && (
        <>
          {/* LEFT */}
          <mesh position={[-1.2, 0.6, screenZ + 0.2]}>
            <boxGeometry args={[0.2, 1.2, 0.2]} />
            <meshStandardMaterial color="orange" />
          </mesh>

          {/* CENTER */}
          {screenType !== "AT" && (
            <mesh position={[0, 0.3, screenZ + 0.2]}>
              <boxGeometry args={[0.6, 0.3, 0.2]} />
              <meshStandardMaterial color="orange" />
            </mesh>
          )}

          {/* RIGHT */}
          <mesh position={[1.2, 0.6, screenZ + 0.2]}>
            <boxGeometry args={[0.2, 1.2, 0.2]} />
            <meshStandardMaterial color="orange" />
          </mesh>
        </>
      )}

      {/* SEATING */}
      {seatingZ.map((z, i) => (
        <mesh key={i} position={[0, 0.5, z]} rotation={[0, Math.PI, 0]}>
          <boxGeometry args={[1.2, 0.6, 0.8]} />
          <meshStandardMaterial color="#444" />
        </mesh>
      ))}

      {/* SURROUNDS */}
      {seatingZ.length > 0 && (
        <>
          <mesh position={[-width / 2 + 0.3, 1.2, seatingZ[0]]}>
            <boxGeometry args={[0.2, 0.4, 0.2]} />
            <meshStandardMaterial color="skyblue" />
          </mesh>

          <mesh position={[width / 2 - 0.3, 1.2, seatingZ[0]]}>
            <boxGeometry args={[0.2, 0.4, 0.2]} />
            <meshStandardMaterial color="skyblue" />
          </mesh>
        </>
      )}

      {/* REARS */}
      {rows > 1 && (
        <>
          <mesh position={[-1, 1.2, depth / 2 - 0.5]}>
            <boxGeometry args={[0.2, 0.4, 0.2]} />
            <meshStandardMaterial color="skyblue" />
          </mesh>

          <mesh position={[1, 1.2, depth / 2 - 0.5]}>
            <boxGeometry args={[0.2, 0.4, 0.2]} />
            <meshStandardMaterial color="skyblue" />
          </mesh>
        </>
      )}
    </>
  );
}

export default function App() {
  const [width, setWidth] = useState(5);
  const [depth, setDepth] = useState(7);
  const [rows, setRows] = useState(2);
  const [displayType, setDisplayType] = useState("Projector");
  const [screenType, setScreenType] = useState("Standard");

  return (
    <div className="page">
      <div className="shell beta3-shell">
        <div className="sidebar beta3-sidebar">
          <h2>Room Setup</h2>

          <label>
            Width
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </label>

          <label>
            Depth
            <input
              type="number"
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
            />
          </label>

          <label>
            Rows
            <input
              type="number"
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
            />
          </label>

          <label>
            Display Type
            <select
              value={displayType}
              onChange={(e) => setDisplayType(e.target.value)}
            >
              <option>Projector</option>
              <option>TV</option>
            </select>
          </label>

          <label>
            Screen Type
            <select
              value={screenType}
              onChange={(e) => setScreenType(e.target.value)}
            >
              <option>Standard</option>
              <option value="AT">Acoustically Transparent</option>
            </select>
          </label>
        </div>

        <div className="viewer-card beta3-viewer">
          <Canvas camera={{ position: [6, 4, 6] }}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 5, 5]} />
            <Room
              width={width}
              depth={depth}
              rows={rows}
              displayType={displayType}
              screenType={screenType}
            />
            <OrbitControls />
          </Canvas>
        </div>
      </div>
    </div>
  );
}
