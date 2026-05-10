import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { glycolysisSteps } from '../biology/glycolysisSteps';
import { useSimulationStore } from '../store/useSimulationStore';
import ReactionStage from './ReactionStage';

function PathwayScene() {
  const currentStepIndex = useSimulationStore((state) => state.currentStepIndex);
  const currentStep = useMemo(() => glycolysisSteps[currentStepIndex], [currentStepIndex]);

  return (
    <group position={[0, 0, 0]}>
      <ReactionStage step={currentStep} />
      <Html
        position={[0, 4.6, -1.5]}
        center
        distanceFactor={12}
        style={{
          pointerEvents: 'none',
          minWidth: 380,
          textAlign: 'center',
          padding: '12px 16px',
          borderRadius: 22,
          background: 'linear-gradient(180deg, rgba(5, 16, 27, 0.8), rgba(6, 20, 31, 0.62))',
          border: '1px solid rgba(130, 189, 214, 0.16)',
          color: '#ebf8fd',
          boxShadow: '0 20px 70px rgba(0, 0, 0, 0.28)',
        }}
      >
        <div style={{ fontSize: '0.78rem', color: currentStep.stage === 'investment' ? '#f1ba6a' : '#7ef0d7', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {currentStep.stage === 'investment' ? 'Stage 1 - Energy Investment' : 'Stage 2 - Energy Payoff'}
        </div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: 6 }}>{currentStep.title}</div>
      </Html>
    </group>
  );
}

export default PathwayScene;
