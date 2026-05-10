import { useEffect, useMemo } from 'react';
import { glycolysisSteps } from './biology/glycolysisSteps';
import SceneManager from './core/SceneManager';
import UIOverlay from './components/UIOverlay';
import { useSimulationStore } from './store/useSimulationStore';

function App() {
  const currentStepIndex = useSimulationStore((state) => state.currentStepIndex);
  const setDefaultCamera = useSimulationStore((state) => state.setDefaultCamera);

  const currentStep = useMemo(
    () => glycolysisSteps[currentStepIndex],
    [currentStepIndex],
  );

  useEffect(() => {
    setDefaultCamera(currentStep.camera.focus, currentStep.camera.offset);
  }, [currentStep, setDefaultCamera]);

  return (
    <main className="app-shell">
      <div className="aurora aurora-left" />
      <div className="aurora aurora-right" />
      <SceneManager />
      <UIOverlay pathwayName="Glycolysis" />
    </main>
  );
}

export default App;
