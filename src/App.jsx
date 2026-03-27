import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox, Text, Html } from "@react-three/drei";
import * as THREE from "three";
import "./styles.css";

const UNIT_OPTIONS = [
  { value: "imperial", label: "Feet" },
  { value: "metric", label: "Meters" },
];

const DISPLAY_MODES = [
  { value: "projector_16_9", label: "Projector — 16:9" },
  { value: "projector_scope", label: "Projector — Cinemascope (2.35–2.40:1)" },
  { value: "tv", label: "TV" },
];

const VIEW_MODES = [
  { value: "perspective", label: "Perspective" },
  { value: "front", label: "Front" },
  { value: "rear", label: "Rear" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "top", label: "Top" },
  { value: "cutaway", label: "Cutaway" },
];

const PROJECTORS = [
  {
    id: "sony_xw5000es",
    name: "Sony VPL-XW5000ES",
    allowedModes: ["projector_16_9"],
    throwRatioMin: 1.38,
    throwRatioMax: 2.21,
    mountOffsetM: 0.18,
  },
  {
    id: "sony_xw6000es",
    name: "Sony VPL-XW6000ES",
    allowedModes: ["projector_16_9", "projector_scope"],
    throwRatioMin: 1.35,
    throwRatioMax: 2.84,
    mountOffsetM: 0.18,
  },
  {
    id: "epson_ls12000",
    name: "Epson LS12000",
    allowedModes: ["projector_16_9", "projector_scope"],
    throwRatioMin: 1.35,
    throwRatioMax: 2.84,
    mountOffsetM: 0.16,
  },
  {
    id: "jvc_nz7",
    name: "JVC NZ7",
    allowedModes: ["projector_16_9", "projector_scope"],
    throwRatioMin: 1.4,
    throwRatioMax: 2.8,
    mountOffsetM: 0.2,
  },
];

const LAYOUTS = {
  "5.1.2": { rears: 0, heights: 2, subs: 1, wides: 0 },
  "5.1.4": { rears: 0, heights: 4, subs: 1, wides: 0 },
  "7.1.2": { rears: 2, heights: 2, subs: 1, wides: 0 },
  "7.1.4": { rears: 2, heights: 4, subs: 1, wides: 0 },
  "7.2.4": { rears: 2, heights: 4, subs: 2, wides: 0 },
  "9.2.4": { rears: 2, heights: 4, subs: 2, wides: 2 },
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
  loveseat: {
    label: "Loveseat",
    seats: 2,
    chairSpacingM: 0.74,
    rowDepthM: 1.1,
    rowWidthM: 1.7,
    eyeHeightM: 1.0,
  },
  row3: {
    label: "Row of 3",
    seats: 3,
    chairSpacingM: 0.76,
    rowDepthM: 1.1,
    rowWidthM: 2.45,
    eyeHeightM: 1.0,
  },
  row4: {
    label: "Row of 4",
    seats: 4,
    chairSpacingM: 0.78,
    rowDepthM: 1.1,
    rowWidthM: 3.2,
    eyeHeightM: 1.0,
  },
  row5: {
    label: "Row of 5",
    seats: 5,
    chairSpacingM: 0.8,
    rowDepthM: 1.1,
    rowWidthM: 4.0,
    eyeHeightM: 1.0,
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function ftToM(ft) {
  return ft * 0.3048;
}

function mToFt(m) {
  return m / 0.3048;
}

function inToM(inches) {
  return inches * 0.0254;
}

function round(value, digits = 2) {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function displayValueFromMeters(meters, units) {
  return units === "imperial" ? round(mToFt(meters), 1) : round(meters, 2);
}

function parseDimensionInput(value, units) {
  const num = Number(value || 0);
  return units === "imperial" ? ftToM(num) : num;
}

function formatDistance(meters, units) {
  return units === "imperial" ? `${round(mToFt(meters), 1)} ft` : `${round(meters, 2)} m`;
}

function getAllowedProjectors(displayMode) {
  return PROJECTORS.filter((projector) => projector.allowedModes.includes(displayMode));
}

function ensureProjectorId(displayMode, currentId) {
  const allowed = getAllowedProjectors(displayMode);
  if (!allowed.length) return "";
  if (allowed.some((p) => p.id === currentId)) return currentId;
  return allowed[0].id;
}

function getAspect(displayMode) {
  if (displayMode === "projector_scope") {
    return { w: 2.4, h: 1 };
  }
  return { w: 16, h: 9 };
}

function calcScreenGeometry(displayMode, diagonalInches) {
  const aspect = getAspect(displayMode);
  const diagonalM = inToM(diagonalInches);
  const ratio = Math.sqrt(aspect.w ** 2 + aspect.h ** 2);
  const widthM = diagonalM * (aspect.w / ratio);
  const heightM = diagonalM * (aspect.h / ratio);
  return { widthM, heightM };
}

function recommendedScreen(roomWidthM, roomDepthM, displayMode) {
  const roomWidthFt = mToFt(roomWidthM);
  const roomDepthFt = mToFt(roomDepthM);
  const wallMarginFt = displayMode === "tv" ? 1.2 : 2.0;
  const maxByWall = Math.floor((roomWidthFt - wallMarginFt) / 0.0726);
  const idealDistanceFt = clamp(roomDepthFt * 0.56, 8, roomDepthFt - 5);
  const idealDiag = Math.round((idealDistanceFt / 1.7) * 12);
  const min = clamp(Math.round(idealDiag * 0.9), displayMode === "tv" ? 65 : 80, 160);
  const max = clamp(Math.min(Math.round(idealDiag * 1.1), maxByWall), min, displayMode === "tv" ? 115 : 180);
  return { min, max };
}

function buildRows({
  roomW,
  roomD,
  displayMode,
  seatingKey,
  rowCount,
  rowSpacingM,
  screenHeightM,
}) {
  const seating = SEATING[seatingKey];
  const sideMargin = 0.35;
  const frontDisplayClearance = displayMode === "tv" ? 1.9 : 2.35;
  const rearClearance = 0.9;
  const walkwayAllowance = 0.35;

  const issues = [];

  if (roomW < seating.rowWidthM + sideMargin * 2) {
    issues.push(`Room too narrow for ${seating.label}.`);
  }

  const totalNeededDepth =
    rowCount * seating.rowDepthM +
    Math.max(0, rowCount - 1) * rowSpacingM +
    frontDisplayClearance +
    rearClearance +
    walkwayAllowance;

  if (totalNeededDepth > roomD) {
    issues.push(`Room too shallow for ${rowCount} row(s) with the selected spacing.`);
  }

  const rows = [];
  const frontLimitZ = roomD / 2 - frontDisplayClearance;
  let firstRowCenterZ = frontLimitZ - seating.rowDepthM / 2;

  for (let i = 0; i < rowCount; i += 1) {
    const z = firstRowCenterZ - i * (seating.rowDepthM + rowSpacingM);
    const backEdge = z - seating.rowDepthM / 2;

    if (backEdge < -roomD / 2 + rearClearance) {
      break;
    }

    const riserHeight = i === 0 ? 0 : 0.18 + (i - 1) * 0.06;
    rows.push({
      z,
      seats: seating.seats,
      rowWidthM: seating.rowWidthM,
      rowDepthM: seating.rowDepthM,
      chairSpacingM: seating.chairSpacingM,
      eyeHeightM: seating.eyeHeightM + riserHeight,
      riserHeight,
      label: `Row ${i + 1}`,
    });
  }

  if (rows.length < rowCount) {
    issues.push(`Only ${rows.length} row(s) fit in the current room with the selected spacing.`);
  }

  const fittedRows = rows.length;
  const frontRow = rows[0];
  const recommendedScreenBottomM = clamp(
    (frontRow?.eyeHeightM ?? 1.0) - screenHeightM * 0.28 + Math.max(0, fittedRows - 1) * 0.13,
    0.55,
    1.3
  );

  const riser =
    fittedRows > 1
      ? {
          width: (rows[1]?.rowWidthM ?? seating.rowWidthM) + 0.45,
          depth: Math.abs((rows[fittedRows - 1]?.z ?? 0) - (rows[1]?.z ?? 0)) + seating.rowDepthM,
          z: (rows[1]?.z ?? 0),
          height: fittedRows === 2 ? 0.18 : 0.24,
        }
      : null;

  return {
    rows,
    fittedRows,
    issues,
    recommendedScreenBottomM,
    riser,
  };
}

function buildLayout({
  roomWidthM,
  roomDepthM,
  roomHeightM,
  displayMode,
  projectorId,
  throwPosition,
  screenSizeIn,
  layoutKey,
  seatingKey,
  rowCount,
  rowSpacingM,
  acousticConfig,
}) {
  const layout = LAYOUTS[layoutKey];
  const screenGeo = calcScreenGeometry(displayMode, screenSizeIn);
  const screenRange = recommendedScreen(roomWidthM, roomDepthM, displayMode);
  const rowResult = buildRows({
    roomW: roomWidthM,
    roomD: roomDepthM,
    displayMode,
    seatingKey,
    rowCount,
    rowSpacingM,
    screenHeightM: screenGeo.heightM,
  });

  const issues = [...rowResult.issues];

  if (screenSizeIn > screenRange.max) {
    issues.push(`Screen too large. Recommended range is ${screenRange.min}"–${screenRange.max}".`);
  }

  const fittedRows = rowResult.fittedRows;
  const screenBottomM = rowResult.recommendedScreenBottomM;
  const screenCenterY = screenBottomM + screenGeo.heightM / 2;

  const allowedProjectors = getAllowedProjectors(displayMode);
  const safeProjectorId = ensureProjectorId(displayMode, projectorId);
  const projector = allowedProjectors.find((item) => item.id === safeProjectorId) || null;

  let throwZone = null;
  let projectorPosition = null;

  if (displayMode !== "tv" && projector) {
    const minThrowM = screenGeo.widthM * projector.throwRatioMin;
    const maxThrowM = screenGeo.widthM * projector.throwRatioMax;
    const usableMin = Math.max(minThrowM, 1.6);
    const usableMax = Math.min(maxThrowM, roomDepthM - 1.1);

    if (usableMin > usableMax) {
      issues.push(`${projector.name} cannot achieve this image size in the current room depth.`);
    } else {
      const t = clamp(throwPosition, 0, 1);
      const currentThrowM = usableMin + (usableMax - usableMin) * t;
      throwZone = { min: usableMin, max: usableMax, current: currentThrowM };

      projectorPosition = {
        x: 0,
        y: roomHeightM - projector.mountOffsetM,
        z: roomDepthM / 2 - currentThrowM,
      };
    }
  }

  const frontSpread = displayMode === "projector_scope" ? 0.48 : displayMode === "tv" ? 0.34 : 0.43;
  const frontZ = displayMode === "tv" ? roomDepthM / 2 - 0.98 : roomDepthM / 2 - 0.86;
  const centerZ = displayMode === "tv" ? roomDepthM / 2 - 1.02 : roomDepthM / 2 - 0.72;
  const mainListenZ = rowResult.rows[0]?.z ?? -roomDepthM * 0.2;
  const rearZ = rowResult.rows[fittedRows - 1]?.z
    ? rowResult.rows[fittedRows - 1].z - 1.0
    : -roomDepthM / 2 + 0.9;

  const speakers = {
    fronts: [
      { x: -screenGeo.widthM * frontSpread, y: displayMode === "tv" ? 0.5 : 0.62, z: frontZ, label: "L" },
      { x: 0, y: displayMode === "tv" ? 0.2 : 0.46, z: centerZ, label: "C" },
      { x: screenGeo.widthM * frontSpread, y: displayMode === "tv" ? 0.5 : 0.62, z: frontZ, label: "R" },
    ],
    wides: layout.wides
      ? [
          { x: -roomWidthM / 2 + 0.34, y: 0.82, z: roomDepthM * 0.12, label: "FWL" },
          { x: roomWidthM / 2 - 0.34, y: 0.82, z: roomDepthM * 0.12, label: "FWR" },
        ]
      : [],
    surrounds: [
      { x: -roomWidthM / 2 + 0.24, y: 1.1, z: mainListenZ, label: "SL" },
      { x: roomWidthM / 2 - 0.24, y: 1.1, z: mainListenZ, label: "SR" },
    ],
    rears: layout.rears
      ? [
          { x: -roomWidthM / 2 + 0.28, y: 1.1, z: rearZ, label: "SBL" },
          { x: roomWidthM / 2 - 0.28, y: 1.1, z: rearZ, label: "SBR" },
        ]
      : [],
    heights:
      layout.heights === 2
        ? [
            { x: -0.65, y: roomHeightM - 0.18, z: mainListenZ + 0.15, label: "TML" },
            { x: 0.65, y: roomHeightM - 0.18, z: mainListenZ + 0.15, label: "TMR" },
          ]
        : [
            { x: -0.85, y: roomHeightM - 0.18, z: 1.0, label: "TFL" },
            { x: 0.85, y: roomHeightM - 0.18, z: 1.0, label: "TFR" },
            { x: -0.85, y: roomHeightM - 0.18, z: -1.9, label: "TRL" },
            { x: 0.85, y: roomHeightM - 0.18, z: -1.9, label: "TRR" },
          ],
    subs:
      layout.subs === 2
        ? [
            { x: -1.3, y: 0.2, z: roomDepthM / 2 - 0.72, label: "SUB" },
            { x: 1.3, y: 0.2, z: roomDepthM / 2 - 0.72, label: "SUB" },
          ]
        : [{ x: 0, y: 0.2, z: roomDepthM / 2 - 0.72, label: "SUB" }],
  };

  return {
    issues,
    fittedRows,
    valid: issues.length === 0,
    screenRange,
    screenGeo,
    screenBottomM,
    screenCenterY,
    roomWidthM,
    roomDepthM,
    roomHeightM,
    rows: rowResult.rows,
    riser: rowResult.riser,
    projector,
    projectorPosition,
    throwZone,
    speakers,
    acousticConfig,
  };
}

function CameraRig({ viewMode, roomWidthM, roomDepthM, roomHeightM }) {
  const { camera, controls } = useThree();

  useEffect(() => {
    const targets = {
      perspective: {
        position: new THREE.Vector3(0, roomHeightM * 1.2, roomDepthM * 0.95),
        target: new THREE.Vector3(0, 0.9, 0),
      },
      front: {
        position: new THREE.Vector3(0, roomHeightM * 0.7, roomDepthM * 1.15),
        target: new THREE.Vector3(0, 1.0, 0),
      },
      rear: {
        position: new THREE.Vector3(0, roomHeightM * 0.7, -roomDepthM * 1.15),
        target: new THREE.Vector3(0, 1.0, 0),
      },
      left: {
        position: new THREE.Vector3(-roomWidthM * 1.15, roomHeightM * 0.7, 0),
        target: new THREE.Vector3(0, 1.0, 0),
      },
      right: {
        position: new THREE.Vector3(roomWidthM * 1.15, roomHeightM * 0.7, 0),
        target: new THREE.Vector3(0, 1.0, 0),
      },
      top: {
        position: new THREE.Vector3(0, roomHeightM * 2.4, 0.001),
        target: new THREE.Vector3(0, 0, 0),
      },
      cutaway: {
        position: new THREE.Vector3(-roomWidthM * 0.75, roomHeightM * 1.05, roomDepthM * 0.78),
        target: new THREE.Vector3(0, 0.9, -roomDepthM * 0.05),
      },
    };

    const selected = targets[viewMode] || targets.perspective;
    camera.position.copy(selected.position);
    camera.lookAt(selected.target);

    if (controls) {
      controls.target.copy(selected.target);
      controls.update();
    }
  }, [camera, controls, viewMode, roomWidthM, roomDepthM, roomHeightM]);

  return null;
}

function RoomShell({ width, depth, height, viewMode }) {
  const cutaway = viewMode === "cutaway";

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#151519" roughness={0.95} metalness={0.03} />
      </mesh>

      {!cutaway && (
        <mesh position={[0, height / 2, depth / 2]} receiveShadow>
          <boxGeometry args={[width, height, 0.05]} />
          <meshStandardMaterial color="#111115" roughness={1} transparent opacity={0.82} />
        </mesh>
      )}

      <mesh position={[0, height / 2, -depth / 2]} receiveShadow>
        <boxGeometry args={[width, height, 0.05]} />
        <meshStandardMaterial color="#101014" roughness={1} transparent opacity={0.9} />
      </mesh>

      {!cutaway && (
        <mesh position={[-width / 2, height / 2, 0]} receiveShadow>
          <boxGeometry args={[0.05, height, depth]} />
          <meshStandardMaterial color="#121218" roughness={1} transparent opacity={0.82} />
        </mesh>
      )}

      <mesh position={[width / 2, height / 2, 0]} receiveShadow>
        <boxGeometry args={[0.05, height, depth]} />
        <meshStandardMaterial color="#121218" roughness={1} transparent opacity={cutaway ? 0.25 : 0.9} />
      </mesh>
    </group>
  );
}

function DisplayWall({ displayMode, screenGeo, roomDepthM, screenCenterY }) {
  return (
    <group position={[0, screenCenterY, roomDepthM / 2 - 0.08]}>
      <RoundedBox args={[screenGeo.widthM, screenGeo.heightM, 0.03]} radius={0.03} smoothness={4} castShadow>
        <meshStandardMaterial
          color={displayMode === "tv" ? "#0d0d10" : "#f1f1f1"}
          emissive={displayMode === "tv" ? "#1f2937" : "#ffffff"}
          emissiveIntensity={displayMode === "tv" ? 0.16 : 0.08}
        />
      </RoundedBox>
      <Text
        position={[0, screenGeo.heightM / 2 + 0.18, 0]}
        fontSize={0.11}
        color="#bfc1c7"
        anchorX="center"
        anchorY="middle"
      >
        {displayMode === "tv" ? "TV Display" : "Projection Screen"}
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

function SpeakerModel({ position, label, type }) {
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
      ) : type === "onwall" ? (
        <RoundedBox args={[0.16, 0.26, 0.09]} radius={0.02} smoothness={4} castShadow>
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
  const totalWidth = (row.seats - 1) * row.chairSpacingM;
  return (
    <group>
      {Array.from({ length: row.seats }).map((_, i) => (
        <Chair key={i} position={[-totalWidth / 2 + i * row.chairSpacingM, row.riserHeight, row.z]} />
      ))}
      <Html distanceFactor={12} position={[0, 1 + row.riserHeight, row.z]} center>
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
      {layout.acousticConfig.side && (
        <>
          <mesh position={[-layout.roomWidthM / 2 + 0.06, 1.45, 0]}>
            <boxGeometry args={[0.06, 0.95, 1.6]} />
            <meshStandardMaterial color="#234da0" roughness={0.9} />
          </mesh>
          <mesh position={[layout.roomWidthM / 2 - 0.06, 1.45, 0]}>
            <boxGeometry args={[0.06, 0.95, 1.6]} />
            <meshStandardMaterial color="#234da0" roughness={0.9} />
          </mesh>
        </>
      )}

      {layout.acousticConfig.rear && (
        <>
          <mesh position={[-1.1, 1.45, -layout.roomDepthM / 2 + 0.06]}>
            <boxGeometry args={[0.9, 0.95, 0.08]} />
            <meshStandardMaterial color="#234da0" roughness={0.9} />
          </mesh>
          <mesh position={[1.1, 1.45, -layout.roomDepthM / 2 + 0.06]}>
            <boxGeometry args={[0.9, 0.95, 0.08]} />
            <meshStandardMaterial color="#234da0" roughness={0.9} />
          </mesh>
        </>
      )}

      {layout.acousticConfig.front && (
        <>
          <mesh position={[-1.1, 1.45, layout.roomDepthM / 2 - 0.06]}>
            <boxGeometry args={[0.9, 0.95, 0.08]} />
            <meshStandardMaterial color="#234da0" roughness={0.9} />
          </mesh>
          <mesh position={[1.1, 1.45, layout.roomDepthM / 2 - 0.06]}>
            <boxGeometry args={[0.9, 0.95, 0.08]} />
            <meshStandardMaterial color="#234da0" roughness={0.9} />
          </mesh>
        </>
      )}
    </group>
  );
}

function ThrowZone({ layout }) {
  if (!layout.throwZone || !layout.projectorPosition) return null;

  const centerZ = layout.roomDepthM / 2 - (layout.throwZone.min + layout.throwZone.max) / 2;
  const zoneDepth = layout.throwZone.max - layout.throwZone.min;

  return (
    <mesh position={[0, layout.roomHeightM - 0.45, centerZ]}>
      <boxGeometry args={[0.35, 0.02, zoneDepth]} />
      <meshStandardMaterial color="#f59e0b" transparent opacity={0.35} />
    </mesh>
  );
}

function TheaterScene({
  layout,
  viewMode,
  displayMode,
  frontSpeakerType,
  surroundSpeakerType,
  atmosSpeakerType,
}) {
  return (
    <>
      <ambientLight intensity={0.78} />
      <directionalLight position={[2.5, 5.5, 2.5]} intensity={1.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <spotLight position={[0, 2.7, layout.roomDepthM / 2 - 0.8]} angle={0.52} intensity={18} penumbra={0.85} color="#e5d0a5" />

      <CameraRig
        viewMode={viewMode}
        roomWidthM={layout.roomWidthM}
        roomDepthM={layout.roomDepthM}
        roomHeightM={layout.roomHeightM}
      />

      <RoomShell
        width={layout.roomWidthM}
        depth={layout.roomDepthM}
        height={layout.roomHeightM}
        viewMode={viewMode}
      />

      <DisplayWall
        displayMode={displayMode}
        screenGeo={layout.screenGeo}
        roomDepthM={layout.roomDepthM}
        screenCenterY={layout.screenCenterY}
      />

      {displayMode !== "tv" && layout.projectorPosition && (
        <>
          <ProjectorModel position={[layout.projectorPosition.x, layout.projectorPosition.y, layout.projectorPosition.z]} />
          <ThrowZone layout={layout} />
        </>
      )}

      <AcousticPanels layout={layout} />
      {layout.riser && <Riser riser={layout.riser} />}
      {layout.rows.map((row, i) => <SeatRow3D key={i} row={row} />)}

      {layout.speakers.fronts.map((speaker, i) => (
        <SpeakerModel key={`f-${i}`} position={[speaker.x, speaker.y, speaker.z]} label={speaker.label} type={frontSpeakerType} />
      ))}
      {layout.speakers.wides.map((speaker, i) => (
        <SpeakerModel key={`w-${i}`} position={[speaker.x, speaker.y, speaker.z]} label={speaker.label} type={frontSpeakerType} />
      ))}
      {layout.speakers.surrounds.map((speaker, i) => (
        <SpeakerModel key={`s-${i}`} position={[speaker.x, speaker.y, speaker.z]} label={speaker.label} type={surroundSpeakerType} />
      ))}
      {layout.speakers.rears.map((speaker, i) => (
        <SpeakerModel key={`r-${i}`} position={[speaker.x, speaker.y, speaker.z]} label={speaker.label} type={surroundSpeakerType} />
      ))}
      {layout.speakers.heights.map((speaker, i) => (
        <SpeakerModel
          key={`h-${i}`}
          position={[speaker.x, speaker.y, speaker.z]}
          label={speaker.label}
          type={atmosSpeakerType === "inceiling" ? "height" : "onwall"}
        />
      ))}
      {layout.speakers.subs.map((speaker, i) => (
        <SpeakerModel key={`sub-${i}`} position={[speaker.x, speaker.y, speaker.z]} label={speaker.label} type="sub" />
      ))}

      <OrbitControls makeDefault target={[0, 0.9, 0]} minDistance={4} maxDistance={18} maxPolarAngle={Math.PI / 2.02} />
      <Environment preset="warehouse" />
    </>
  );
}

export default function App() {
  const [unitSystem, setUnitSystem] = useState("imperial");

  const [roomWidthInput, setRoomWidthInput] = useState(15);
  const [roomDepthInput, setRoomDepthInput] = useState(22);
  const [roomHeightInput, setRoomHeightInput] = useState(9);

  const [displayMode, setDisplayMode] = useState("projector_16_9");
  const [viewMode, setViewMode] = useState("perspective");

  const [projectorId, setProjectorId] = useState("sony_xw5000es");
  const [throwPosition, setThrowPosition] = useState(0.5);

  const [screenSizeIn, setScreenSizeIn] = useState(120);

  const [layoutKey, setLayoutKey] = useState("7.2.4");
  const [seatingKey, setSeatingKey] = useState("row4");
  const [rowCount, setRowCount] = useState(2);
  const [rowSpacingFt, setRowSpacingFt] = useState(2.5);

  const [frontSpeakerType, setFrontSpeakerType] = useState("inwall");
  const [surroundSpeakerType, setSurroundSpeakerType] = useState("inwall");
  const [atmosSpeakerType, setAtmosSpeakerType] = useState("inceiling");

  const [acousticSide, setAcousticSide] = useState(true);
  const [acousticRear, setAcousticRear] = useState(true);
  const [acousticFront, setAcousticFront] = useState(false);

  const roomWidthM = parseDimensionInput(roomWidthInput, unitSystem);
  const roomDepthM = parseDimensionInput(roomDepthInput, unitSystem);
  const roomHeightM = parseDimensionInput(roomHeightInput, unitSystem);
  const rowSpacingM = unitSystem === "imperial" ? ftToM(rowSpacingFt) : rowSpacingFt;

  const safeProjectorId = ensureProjectorId(displayMode, projectorId);

  useEffect(() => {
    if (safeProjectorId !== projectorId) {
      setProjectorId(safeProjectorId);
    }
  }, [safeProjectorId, projectorId]);

  const layout = useMemo(
    () =>
      buildLayout({
        roomWidthM,
        roomDepthM,
        roomHeightM,
        displayMode,
        projectorId: safeProjectorId,
        throwPosition,
        screenSizeIn,
        layoutKey,
        seatingKey,
        rowCount,
        rowSpacingM,
        acousticConfig: {
          side: acousticSide,
          rear: acousticRear,
          front: acousticFront,
        },
      }),
    [
      roomWidthM,
      roomDepthM,
      roomHeightM,
      displayMode,
      safeProjectorId,
      throwPosition,
      screenSizeIn,
      layoutKey,
      seatingKey,
      rowCount,
      rowSpacingM,
      acousticSide,
      acousticRear,
      acousticFront,
    ]
  );

  const allowedProjectors = getAllowedProjectors(displayMode);

  const canUseThreeRows =
    buildLayout({
      roomWidthM,
      roomDepthM,
      roomHeightM,
      displayMode,
      projectorId: safeProjectorId,
      throwPosition,
      screenSizeIn,
      layoutKey,
      seatingKey,
      rowCount: 3,
      rowSpacingM,
      acousticConfig: {
        side: acousticSide,
        rear: acousticRear,
        front: acousticFront,
      },
    }).fittedRows >= 3;

  const onDisplayModeChange = (value) => {
    const nextProjectorId = ensureProjectorId(value, projectorId);
    setDisplayMode(value);
    setProjectorId(nextProjectorId);
  };

  const onScreenChange = (value) => {
    const next = Number(value);
    const test = buildLayout({
      roomWidthM,
      roomDepthM,
      roomHeightM,
      displayMode,
      projectorId: safeProjectorId,
      throwPosition,
      screenSizeIn: next,
      layoutKey,
      seatingKey,
      rowCount,
      rowSpacingM,
      acousticConfig: {
        side: acousticSide,
        rear: acousticRear,
        front: acousticFront,
      },
    });

    if (next >= test.screenRange.min && next <= test.screenRange.max) {
      setScreenSizeIn(next);
    }
  };

  const onRowCountChange = (value) => {
    const next = Number(value);
    const test = buildLayout({
      roomWidthM,
      roomDepthM,
      roomHeightM,
      displayMode,
      projectorId: safeProjectorId,
      throwPosition,
      screenSizeIn,
      layoutKey,
      seatingKey,
      rowCount: next,
      rowSpacingM,
      acousticConfig: {
        side: acousticSide,
        rear: acousticRear,
        front: acousticFront,
      },
    });

    if (test.fittedRows >= next) {
      setRowCount(next);
    }
  };

  return (
    <div className="page">
      <div className="shell beta3-shell">
        <aside className="sidebar beta3-sidebar">
          <div className="sidebar-top">
            <div>
              <div className="eyebrow">Fam Tech Media</div>
              <h1 className="title">3D Beta 3</h1>
              <p className="subtitle">
                Functional rebuild with corrected room math, view presets, cutaway walls, valid row rendering,
                display modes, projector filtering, throw control, and dynamic speaker placement.
              </p>
            </div>
            <div className="badge">Functional Rebuild</div>
          </div>

          <section className="section">
            <h2>1. Units + Room</h2>
            <label>
              <span>Units</span>
              <select value={unitSystem} onChange={(e) => setUnitSystem(e.target.value)}>
                {UNIT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <div className="grid3">
              <label>
                <span>Width</span>
                <input type="number" value={roomWidthInput} onChange={(e) => setRoomWidthInput(Number(e.target.value || 0))} />
              </label>
              <label>
                <span>Depth</span>
                <input type="number" value={roomDepthInput} onChange={(e) => setRoomDepthInput(Number(e.target.value || 0))} />
              </label>
              <label>
                <span>Height</span>
                <input type="number" value={roomHeightInput} onChange={(e) => setRoomHeightInput(Number(e.target.value || 0))} />
              </label>
            </div>
          </section>

          <section className="section">
            <h2>2. View + Display</h2>
            <label>
              <span>View Mode</span>
              <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
                {VIEW_MODES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Display Type</span>
              <select value={displayMode} onChange={(e) => onDisplayModeChange(e.target.value)}>
                {DISPLAY_MODES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            {displayMode !== "tv" && (
              <label>
                <span>Projector Model</span>
                <select value={safeProjectorId} onChange={(e) => setProjectorId(e.target.value)}>
                  {allowedProjectors.map((projector) => (
                    <option key={projector.id} value={projector.id}>{projector.name}</option>
                  ))}
                </select>
              </label>
            )}

            {displayMode !== "tv" && layout.throwZone && (
              <label>
                <span>
                  Projector Throw Position: {formatDistance(layout.throwZone.current, unitSystem)}
                  {" "}({formatDistance(layout.throwZone.min, unitSystem)}–{formatDistance(layout.throwZone.max, unitSystem)} allowed)
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(throwPosition * 100)}
                  onChange={(e) => setThrowPosition(Number(e.target.value) / 100)}
                />
              </label>
            )}

            <label>
              <span>Screen Size: {screenSizeIn}"</span>
              <input
                type="range"
                min={displayMode === "tv" ? 65 : 80}
                max={displayMode === "tv" ? 115 : 180}
                value={screenSizeIn}
                onChange={(e) => onScreenChange(e.target.value)}
              />
            </label>
            <div className="helper">Recommended screen range: {layout.screenRange.min}"–{layout.screenRange.max}"</div>
          </section>

          <section className="section">
            <h2>3. Audio</h2>
            <label>
              <span>Dolby Layout</span>
              <select value={layoutKey} onChange={(e) => setLayoutKey(e.target.value)}>
                {Object.keys(LAYOUTS).map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Front LCR</span>
              <select value={frontSpeakerType} onChange={(e) => setFrontSpeakerType(e.target.value)}>
                {FRONT_SPEAKERS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Surround / Rear</span>
              <select value={surroundSpeakerType} onChange={(e) => setSurroundSpeakerType(e.target.value)}>
                {SURROUND_SPEAKERS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Atmos</span>
              <select value={atmosSpeakerType} onChange={(e) => setAtmosSpeakerType(e.target.value)}>
                {ATMOS_SPEAKERS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          </section>

          <section className="section">
            <h2>4. Seating</h2>
            <div className="grid2">
              <label>
                <span>Rows</span>
                <select value={rowCount} onChange={(e) => onRowCountChange(e.target.value)}>
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

            <label>
              <span>
                Row Spacing: {unitSystem === "imperial" ? `${round(rowSpacingFt, 1)} ft` : `${round(rowSpacingM, 2)} m`}
              </span>
              <input
                type="range"
                min={unitSystem === "imperial" ? 2.0 : 0.6}
                max={unitSystem === "imperial" ? 5.0 : 1.5}
                step={unitSystem === "imperial" ? 0.1 : 0.05}
                value={unitSystem === "imperial" ? rowSpacingFt : rowSpacingM}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (unitSystem === "imperial") {
                    setRowSpacingFt(next);
                  } else {
                    setRowSpacingFt(round(mToFt(next), 2));
                  }
                }}
              />
            </label>
          </section>

          <section className="section">
            <h2>5. Prime Acoustics</h2>
            <div className="checks">
              <label className="check">
                <input type="checkbox" checked={acousticSide} onChange={(e) => setAcousticSide(e.target.checked)} />
                <span>Side Panels</span>
              </label>
              <label className="check">
                <input type="checkbox" checked={acousticRear} onChange={(e) => setAcousticRear(e.target.checked)} />
                <span>Rear Panels</span>
              </label>
              <label className="check">
                <input type="checkbox" checked={acousticFront} onChange={(e) => setAcousticFront(e.target.checked)} />
                <span>Front Wall Treatment</span>
              </label>
            </div>
          </section>

          <div className="stats">
            <div className="stat">
              <div className="stat-label">Fitted Rows</div>
              <div className="stat-value">{layout.fittedRows}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Room Width</div>
              <div className="stat-value">{formatDistance(layout.roomWidthM, unitSystem)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Room Depth</div>
              <div className="stat-value">{formatDistance(layout.roomDepthM, unitSystem)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Screen Bottom</div>
              <div className="stat-value">{formatDistance(layout.screenBottomM, unitSystem)}</div>
            </div>
          </div>

          {!!layout.issues.length && (
            <div className="warning">
              <div className="warning-title">Design Notes</div>
              <ul>
                {layout.issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <main className="viewer-card beta3-viewer">
          <div className="viewer-top">
            <div>
              <h2>Live 3D Theater View</h2>
              <p>
                Preset views, cutaway walls, valid row rendering, dynamic speakers, and display-specific behavior.
              </p>
            </div>
            <div className="tag">Beta 3</div>
          </div>

          <div className="viewer-stage beta3-stage">
            <Canvas shadows camera={{ position: [0, 4.8, 7.8], fov: 42 }}>
              <Suspense fallback={null}>
                <TheaterScene
                  layout={layout}
                  viewMode={viewMode}
                  displayMode={displayMode}
                  frontSpeakerType={frontSpeakerType}
                  surroundSpeakerType={surroundSpeakerType}
                  atmosSpeakerType={atmosSpeakerType}
                />
              </Suspense>
            </Canvas>
          </div>
        </main>
      </div>
    </div>
  );
}
