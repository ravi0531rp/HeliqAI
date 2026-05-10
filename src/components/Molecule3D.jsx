import { Html, Instance, Instances, RoundedBox } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { ELEMENT_STYLE, GROUP_COLORS, mixColors } from '../utils/chemistry';

const BOND_RADIUS = 0.055;

const getExplodedAtomPosition = (atom, molecule, explodeFactor) => {
  const center = new THREE.Vector3(...molecule.center);
  const position = new THREE.Vector3(...atom.position);
  const groupOffsetMap = {
    phosphate: new THREE.Vector3(0.42, 0.5, 0.16),
    hydroxyl: new THREE.Vector3(-0.24, 0.34, 0.1),
    carbonyl: new THREE.Vector3(0.18, 0.22, -0.18),
    electronCarrier: new THREE.Vector3(0.24, -0.1, 0.22),
    backbone: new THREE.Vector3(0, 0, 0),
  };

  const radial = position.clone().sub(center).normalize().multiplyScalar(1.65 * explodeFactor);
  const grouped = (groupOffsetMap[atom.group] || groupOffsetMap.backbone).multiplyScalar(explodeFactor);

  return position.add(radial).add(grouped).toArray();
};

function Bond3D({ start, end, color, opacity, order = 1 }) {
  const startVector = useMemo(() => new THREE.Vector3(...start), [start]);
  const endVector = useMemo(() => new THREE.Vector3(...end), [end]);

  const midpoint = useMemo(
    () => startVector.clone().add(endVector).multiplyScalar(0.5),
    [startVector, endVector],
  );
  const direction = useMemo(() => endVector.clone().sub(startVector), [startVector, endVector]);
  const quaternion = useMemo(
    () =>
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize(),
      ),
    [direction],
  );

  const bondOffsets = useMemo(() => {
    if (order === 1) {
      return [[0, 0, 0]];
    }

    const axis = direction.clone().normalize();
    let perpendicular = new THREE.Vector3(0, 0, 1).cross(axis);
    if (perpendicular.lengthSq() < 0.0001) {
      perpendicular = new THREE.Vector3(1, 0, 0).cross(axis);
    }
    perpendicular.normalize().multiplyScalar(0.08);

    return [
      perpendicular.toArray(),
      perpendicular.clone().multiplyScalar(-1).toArray(),
    ];
  }, [direction, order]);

  return (
    <group>
      {bondOffsets.map((offset, index) => (
        <mesh
          key={`${start.join('-')}-${end.join('-')}-${index}`}
          position={[midpoint.x + offset[0], midpoint.y + offset[1], midpoint.z + offset[2]]}
          quaternion={quaternion}
        >
          <cylinderGeometry args={[BOND_RADIUS, BOND_RADIUS, direction.length(), 10]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.08}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  );
}

function OverviewShape({
  category,
  selected,
  blockColor,
  accentColor,
  opacity,
  glow,
  phosphateCount,
}) {
  const shellMaterial = (
    <meshPhysicalMaterial
      color={selected ? mixColors(blockColor, '#7ef0d7', 0.14) : blockColor}
      transparent
      opacity={Math.min(1, opacity)}
      transmission={0.04}
      thickness={0.45}
      roughness={0.24}
      metalness={0.1}
      emissive={selected ? '#7ef0d7' : accentColor}
      emissiveIntensity={selected ? 0.14 : 0.035 + glow * 0.05}
    />
  );

  if (category === 'hexose') {
    return (
      <group>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.72, 0.78, 1.9, 6, 1, false]} />
          {shellMaterial}
        </mesh>
        <mesh position={[0.18, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.38, 0.52, 0.7, 6, 1, false]} />
          <meshStandardMaterial
            color={mixColors(blockColor, '#d9eefc', 0.26)}
            roughness={0.18}
            metalness={0.08}
            transparent
            opacity={0.92}
          />
        </mesh>
        <mesh position={[0.05, 0.36, 0.58]}>
          <planeGeometry args={[0.88, 0.09]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.88} />
        </mesh>
      </group>
    );
  }

  if (category === 'fructose') {
    return (
      <group>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <cylinderGeometry args={[0.66, 0.82, 1.92, 5, 1, false]} />
          {shellMaterial}
        </mesh>
        <mesh position={[-0.16, 0.16, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.34, 0.46, 0.86, 5, 1, false]} />
          <meshStandardMaterial
            color={mixColors(blockColor, '#d9eefc', 0.28)}
            roughness={0.18}
            metalness={0.08}
            transparent
            opacity={0.92}
          />
        </mesh>
        <mesh position={[0, 0.34, 0.54]}>
          <planeGeometry args={[0.82, 0.09]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.88} />
        </mesh>
      </group>
    );
  }

  if (category === 'triose') {
    return (
      <group>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
          <capsuleGeometry args={[0.44, 1.1, 8, 16]} />
          {shellMaterial}
        </mesh>
        <mesh position={[0.18, 0.08, 0]}>
          <sphereGeometry args={[0.28, 16, 16]} />
          <meshStandardMaterial
            color={mixColors(blockColor, '#d9eefc', 0.24)}
            roughness={0.18}
            metalness={0.08}
            transparent
            opacity={0.92}
          />
        </mesh>
        <mesh position={[0, 0.26, 0.48]}>
          <planeGeometry args={[0.72, 0.08]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.88} />
        </mesh>
      </group>
    );
  }

  if (category === 'carrier') {
    return (
      <group>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.18, 0, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[0.36, 1.18, 8, 16]} />
          {shellMaterial}
        </mesh>
        <RoundedBox args={[0.84, 0.58, 0.82]} radius={0.16} smoothness={6} position={[0.74, 0.02, 0]}>
          <meshStandardMaterial
            color={mixColors(blockColor, '#d9eefc', 0.18)}
            roughness={0.2}
            metalness={0.08}
            transparent
            opacity={0.96}
          />
        </RoundedBox>
        <mesh position={[0.14, 0.26, 0.48]}>
          <planeGeometry args={[0.98, 0.08]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.9} />
        </mesh>
        {Array.from({ length: Math.min(phosphateCount, 3) }, (_, index) => (
          <mesh
            key={`carrier-chip-${index}`}
            position={[0.28 + index * 0.22, -0.28, 0.42]}
            scale={[0.13, 0.13, 0.13]}
          >
            <sphereGeometry args={[1, 12, 12]} />
            <meshStandardMaterial color="#f1ba6a" emissive="#f1ba6a" emissiveIntensity={0.16} />
          </mesh>
        ))}
      </group>
    );
  }

  if (category === 'ion') {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <octahedronGeometry args={[0.62, 0]} />
          {shellMaterial}
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.58, 0.04, 10, 36]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.72} />
        </mesh>
      </group>
    );
  }

  if (category === 'small-molecule') {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.56, 20, 20]} />
          {shellMaterial}
        </mesh>
        <mesh position={[0, 0.18, 0.48]}>
          <planeGeometry args={[0.54, 0.08]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.84} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <capsuleGeometry args={[0.42, 1.02, 8, 16]} />
        {shellMaterial}
      </mesh>
      <mesh position={[0, 0.28, 0.5]}>
        <planeGeometry args={[0.72, 0.08]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.86} />
      </mesh>
    </group>
  );
}

function Molecule3D({
  molecule,
  phasePosition,
  opacity = 1,
  scale = 1,
  glow = 0,
  selected = false,
  mode = 'overview',
  proMode = false,
  rotation = [0, 0, 0],
  suppressOverviewLabel = false,
  onSelect,
}) {
  const showDetail = proMode && selected;
  const explodeFactor = showDetail && mode === 'explode' ? 1 : 0;
  const isCarrier = molecule.category === 'carrier';
  const phosphateCount = molecule.functionalGroups.filter((group) => group.type === 'phosphate').length;
  const displayRotation = showDetail ? rotation : [0, rotation[1] * 0.3, 0];
  const shellProfile = useMemo(() => {
    if (molecule.category === 'hexose') {
      return { labelY: 1.12, shadow: [1.9, 1.36], labelWidth: 170 };
    }
    if (molecule.category === 'fructose') {
      return { labelY: 1.08, shadow: [1.9, 1.32], labelWidth: 170 };
    }
    if (molecule.category === 'triose') {
      return { labelY: 0.96, shadow: [1.55, 1.02], labelWidth: 150 };
    }
    if (molecule.category === 'carrier') {
      return { labelY: 1, shadow: [1.85, 1.08], labelWidth: 154 };
    }
    if (molecule.category === 'ion') {
      return { labelY: 0.88, shadow: [1.08, 1.08], labelWidth: 124 };
    }
    if (molecule.category === 'small-molecule') {
      return { labelY: 0.84, shadow: [1.02, 0.92], labelWidth: 130 };
    }
    return { labelY: 0.96, shadow: [1.48, 1], labelWidth: 144 };
  }, [molecule.category]);

  const atomsByElement = useMemo(() => {
    const grouped = {};
    molecule.atoms.forEach((atom) => {
      grouped[atom.element] ||= [];
      grouped[atom.element].push(atom);
    });
    return grouped;
  }, [molecule.atoms]);

  const atomPositionMap = useMemo(() => {
    const map = new Map();
    molecule.atoms.forEach((atom) => {
      map.set(
        atom.id,
        explodeFactor
          ? getExplodedAtomPosition(atom, molecule, explodeFactor)
          : atom.position,
      );
    });
    return map;
  }, [explodeFactor, molecule]);

  const highlightColor = selected ? '#7ef0d7' : '#b7cddd';
  const bondColor = selected ? '#91f5de' : '#6d8798';
  const effectiveScale = selected ? scale * 1.05 : scale;
  const effectiveOpacity = selected ? Math.min(1, opacity + 0.1) : opacity;
  const blockColor =
    molecule.category === 'carrier'
      ? '#16344f'
      : molecule.energyState === 'high'
        ? '#4b3c1f'
        : molecule.category === 'ion'
          ? '#24443f'
          : '#13283d';
  const accentColor =
    molecule.energyState === 'high'
      ? '#f1ba6a'
      : molecule.energyState === 'reduced'
        ? '#7ab4ff'
        : molecule.category === 'ion'
          ? '#7ef0d7'
          : '#7ec8ff';
  const labelWidth = molecule.category === 'hexose' || molecule.category === 'fructose' ? 170 : 144;
  const blockLabel = molecule.name.length > 18 ? molecule.name.replace('-', '-\n') : molecule.name;

  return (
    <group
      position={phasePosition}
      rotation={displayRotation}
      scale={effectiveScale}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
    >
      {!showDetail && (
        <>
          <mesh position={[0, -0.66, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={shellProfile.shadow} />
            <meshBasicMaterial color="#000000" transparent opacity={0.12} />
          </mesh>
          <OverviewShape
            category={molecule.category}
            selected={selected}
            blockColor={blockColor}
            accentColor={accentColor}
            opacity={effectiveOpacity}
            glow={glow}
            phosphateCount={phosphateCount}
          />
          {!suppressOverviewLabel && (
            <Html
              position={[0, shellProfile.labelY, 0]}
              center
              distanceFactor={8}
              style={{
                pointerEvents: 'none',
                width: shellProfile.labelWidth,
                textAlign: 'center',
                color: '#edf8fd',
                fontSize: '0.76rem',
                lineHeight: 1.22,
                padding: '9px 11px',
                borderRadius: '14px',
                background: 'rgba(8, 18, 29, 0.76)',
                border: '1px solid rgba(126, 200, 255, 0.14)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.22)',
                backdropFilter: 'blur(10px)',
                whiteSpace: 'pre-line',
              }}
            >
              <div style={{ fontWeight: 700, letterSpacing: '0.01em' }}>{blockLabel}</div>
              <div style={{ color: '#9fc3d5', marginTop: 4, fontStyle: 'italic', fontSize: '0.68rem' }}>
                {molecule.formula}
              </div>
            </Html>
          )}
        </>
      )}

      {showDetail && (
        <>
          {Object.entries(atomsByElement).map(([element, atoms]) => (
            <Instances key={`${molecule.id}-${element}`} limit={atoms.length}>
              <sphereGeometry args={[1, 18, 18]} />
              <meshStandardMaterial
                transparent
                opacity={effectiveOpacity}
                roughness={0.28}
                metalness={0.16}
                emissive={element === 'P' || molecule.energyState === 'high' ? '#f2bd66' : highlightColor}
                emissiveIntensity={selected ? 0.28 : glow * (isCarrier ? 0.34 : 0.18)}
              />
              {atoms.map((atom) => {
                const baseColor =
                  atom.group === 'phosphate'
                    ? GROUP_COLORS.phosphate
                    : atom.group === 'hydroxyl'
                      ? GROUP_COLORS.hydroxyl
                      : atom.group === 'carbonyl'
                        ? GROUP_COLORS.carbonyl
                        : ELEMENT_STYLE[atom.element]?.color || '#c4d7e7';

                return (
                  <Instance
                    key={atom.id}
                    position={atomPositionMap.get(atom.id)}
                    scale={ELEMENT_STYLE[atom.element]?.size || 0.18}
                    color={selected ? mixColors(baseColor, highlightColor, 0.5) : baseColor}
                  />
                );
              })}
            </Instances>
          ))}

          {molecule.bonds.map((bond) => (
            <Bond3D
              key={bond.id}
              start={atomPositionMap.get(bond.from)}
              end={atomPositionMap.get(bond.to)}
              color={bondColor}
              opacity={effectiveOpacity * 0.92}
              order={bond.order}
            />
          ))}

          <mesh position={molecule.center} visible={false}>
            <sphereGeometry args={[2.6, 12, 12]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>

          {selected && (mode === 'inspect' || mode === 'explode') && (
            <>
              <mesh position={molecule.center} scale={[3.5, 2.8, 1.9]}>
                <sphereGeometry args={[1, 24, 24]} />
                <meshBasicMaterial color="#91f5de" transparent opacity={0.05} />
              </mesh>
              {molecule.functionalGroups.map((group) => (
                <Html
                  key={group.id}
                  position={group.anchor}
                  center
                  distanceFactor={8}
                  style={{
                    pointerEvents: 'none',
                    fontSize: '0.8rem',
                    color: '#eaf8fc',
                    padding: '5px 9px',
                    borderRadius: 999,
                    background: 'rgba(6, 18, 29, 0.88)',
                    border: '1px solid rgba(126, 240, 215, 0.25)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {group.name}
                </Html>
              ))}
            </>
          )}
        </>
      )}
    </group>
  );
}

export default Molecule3D;
