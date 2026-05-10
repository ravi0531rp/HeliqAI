import { useMemo } from 'react';
import * as THREE from 'three';
import Molecule3D from './Molecule3D';
import Enzyme3D from './Enzyme3D';
import { useSimulationStore } from '../store/useSimulationStore';
import { buildStepEntities } from '../utils/sceneEntities';

function ReactionStage({ step }) {
  const animation = useSimulationStore((state) => state.animation);
  const mode = useSimulationStore((state) => state.mode);
  const proMode = useSimulationStore((state) => state.proMode);
  const selectedEntity = useSimulationStore((state) => state.selectedEntity);
  const selectEntity = useSimulationStore((state) => state.selectEntity);
  const focusOn = useSimulationStore((state) => state.focusOn);
  const clearSelection = useSimulationStore((state) => state.clearSelection);

  const entities = useMemo(() => buildStepEntities(step), [step]);
  const hasFocusedMolecule = proMode && selectedEntity?.type === 'molecule';

  const backgroundArcs = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => ({
        id: `arc-${index}`,
        position: [0, -1.8 + index * 0.95, -4.2 - index * 0.35],
        rotation: [Math.PI / 2, 0, 0],
        scale: 6.5 + index * 1.65,
      })),
    [],
  );

  return (
    <group
      onPointerMissed={() => {
        clearSelection();
      }}
    >
      {backgroundArcs.map((arc, index) => (
        <mesh key={arc.id} position={arc.position} rotation={arc.rotation}>
          <torusGeometry args={[arc.scale, 0.03, 8, 100]} />
          <meshBasicMaterial
            color={step.stage === 'investment' ? '#f1ba6a' : '#7ef0d7'}
            transparent
            opacity={0.03 + index * 0.008}
          />
        </mesh>
      ))}

      <mesh position={[0, -3.45, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[13.5, 64]} />
        <meshStandardMaterial color="#07131f" roughness={0.94} metalness={0.08} />
      </mesh>

      {!hasFocusedMolecule && (
        <Enzyme3D
          enzyme={step.enzyme}
          pulse={animation.pulse}
          selected={selectedEntity?.type === 'enzyme'}
          onSelect={() => {
            selectEntity({
              type: 'enzyme',
              id: step.enzyme.id,
              name: step.enzyme.name,
              description: step.enzyme.description,
              metadata: {
                activeSite: 'Interactive catalytic cavity',
                mechanism: step.enzyme.catalyticNote,
                aliases: step.enzyme.aliases.join(', ') || 'None listed',
                regulation: step.enzyme.regulation || 'No special regulation note attached',
                article: step.enzyme.articleSummary || 'No article note attached',
              },
            });
            focusOn(step.enzyme.activeSite, [2.8, 2.8, 8.4], 'enzyme');
          }}
        />
      )}

      {entities.map((entity) => {
        const isFocusedEntity = hasFocusedMolecule && selectedEntity?.id === entity.id;
        const isBackgroundEntity = hasFocusedMolecule && selectedEntity?.id !== entity.id;
        const isProduct = entity.role.includes('product') || entity.role.includes('release');
        const position = entity.startPosition;
        const releasePosition = entity.releasePosition;
        const bindPosition = entity.bindPosition;
        const basePhasePosition = isProduct
          ? [
              THREE.MathUtils.lerp(position[0], releasePosition[0], animation.release),
              THREE.MathUtils.lerp(position[1], releasePosition[1], animation.release),
              THREE.MathUtils.lerp(position[2], releasePosition[2], animation.release),
            ]
          : [
              THREE.MathUtils.lerp(position[0], bindPosition[0], animation.bind),
              THREE.MathUtils.lerp(position[1], bindPosition[1], animation.bind),
              THREE.MathUtils.lerp(position[2], bindPosition[2], animation.bind),
            ];
        const phasePosition = basePhasePosition;

        const computedOpacity = isProduct
          ? Math.min(1, animation.reaction * 0.85 + animation.release * 0.3)
          : Math.max(0.18, 1 - animation.reaction * 0.72);
        const opacity = isBackgroundEntity ? 0.03 : computedOpacity;

        const computedScale = isProduct
          ? 0.68 + animation.reaction * 0.24 + animation.release * 0.08
          : 1 - animation.reaction * 0.08;
        const scale = isFocusedEntity
          ? Math.max(1.04, computedScale * 1.05)
          : isBackgroundEntity
            ? computedScale * 0.94
            : computedScale;

        const glow =
          entity.molecule.name === 'NADH'
            ? animation.glow
            : entity.molecule.energyState === 'high'
              ? 0.35 + animation.pulse * 0.12
              : animation.pulse * 0.08;

        return (
          <Molecule3D
            key={entity.id}
            molecule={entity.molecule}
            basePosition={position}
            phasePosition={phasePosition}
            opacity={opacity}
            scale={scale}
            glow={glow}
            mode={mode}
            proMode={proMode}
            rotation={entity.rotation}
            suppressOverviewLabel={isBackgroundEntity}
            selected={selectedEntity?.id === entity.id}
            onSelect={() => {
              selectEntity({
                type: 'molecule',
                id: entity.id,
                name: entity.molecule.name,
                description: entity.molecule.description,
                formula: entity.molecule.formula,
                metadata: {
                  category: entity.molecule.category,
                  energyState: entity.molecule.energyState,
                  functionalGroups: entity.molecule.functionalGroups.map((group) => group.name).join(', '),
                  view: proMode
                    ? 'PRO click reveals atomic detail for this selected component'
                    : 'Block view active. Enable PRO to inspect atoms and bonds.',
                  ...entity.molecule.metadata,
                },
              });
              focusOn(basePhasePosition, [1.7, 2.15, 6.8], 'molecule');
            }}
          />
        );
      })}
    </group>
  );
}

export default ReactionStage;
