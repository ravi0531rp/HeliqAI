import { useMemo } from 'react';
import { glycolysisOutcome, glycolysisSteps } from '../biology/glycolysisSteps';
import { useChatStore } from '../store/useChatStore';
import { useSimulationStore } from '../store/useSimulationStore';
import Chatbot from './Chatbot';

const modeOptions = [
  { key: 'overview', label: 'Overview' },
  { key: 'inspect', label: 'Inspect' },
  { key: 'explode', label: 'Explode' },
];

const tallyEnergy = (steps, activeIndex) =>
  steps.slice(0, activeIndex + 1).reduce(
    (accumulator, step) => ({
      atp: accumulator.atp + (step.energyDelta?.atp || 0),
      nadh: accumulator.nadh + (step.energyDelta?.nadh || 0),
    }),
    { atp: 0, nadh: 0 },
  );

function UIOverlay({ pathwayName }) {
  const currentStepIndex = useSimulationStore((state) => state.currentStepIndex);
  const mode = useSimulationStore((state) => state.mode);
  const proMode = useSimulationStore((state) => state.proMode);
  const selectedEntity = useSimulationStore((state) => state.selectedEntity);
  const animation = useSimulationStore((state) => state.animation);
  const nextStep = useSimulationStore((state) => state.nextStep);
  const previousStep = useSimulationStore((state) => state.previousStep);
  const replayAnimation = useSimulationStore((state) => state.replayAnimation);
  const toggleAnimationPause = useSimulationStore((state) => state.toggleAnimationPause);
  const toggleProMode = useSimulationStore((state) => state.toggleProMode);
  const setMode = useSimulationStore((state) => state.setMode);
  const setStep = useSimulationStore((state) => state.setStep);
  const setDefaultCamera = useSimulationStore((state) => state.setDefaultCamera);
  const openChat = useChatStore((state) => state.openChat);

  const currentStep = glycolysisSteps[currentStepIndex];
  const energy = useMemo(
    () => tallyEnergy(glycolysisSteps, currentStepIndex),
    [currentStepIndex],
  );

  return (
    <div className="ui-root">
      <div className="panel-stack">
        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">{pathwayName}</div>
              <h1 className="panel-title">{currentStep.title}</h1>
              <p className="panel-subtitle">{currentStep.summary}</p>
            </div>
            <div className="step-pill">Step {currentStepIndex + 1}/10</div>
          </div>
          <div className="panel-body">
            <div className="stage-grid">
              <div className="stat-card">
                <strong>Enzyme Machine</strong>
                <div>{currentStep.enzyme.name}</div>
                <div className="footer-note">
                  {currentStep.enzyme.regulatoryRole || 'Catalytic transition step'}
                </div>
              </div>
              <div className="stat-card">
                <strong>Stage</strong>
                <div>
                  {currentStep.stage === 'investment'
                    ? 'Energy Investment'
                    : 'Energy Payoff'}
                </div>
                <div className="footer-note">
                  {currentStep.repeatCount > 1
                    ? `Runs ${currentStep.repeatCount}x per glucose`
                    : 'Single reaction event'}
                </div>
              </div>
            </div>

            <div className="divider" />

            <div className="mode-row">
              <button
                type="button"
                className={`control-button ${proMode ? 'primary' : ''}`}
                onClick={() => {
                  toggleProMode();
                  setDefaultCamera(currentStep.camera.focus, currentStep.camera.offset);
                }}
              >
                PRO {proMode ? 'On' : 'Off'}
              </button>
              {modeOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`mode-button ${mode === option.key ? 'active' : ''}`}
                  onClick={() => setMode(option.key)}
                  disabled={!proMode && option.key !== 'overview'}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                className="control-button"
                onClick={() => {
                  setDefaultCamera(currentStep.camera.focus, currentStep.camera.offset);
                }}
              >
                Reset Camera
              </button>
              <button
                type="button"
                className="control-button"
                onClick={toggleAnimationPause}
              >
                {animation.paused ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                className="control-button"
                onClick={replayAnimation}
              >
                Replay
              </button>
            </div>

            <div className="button-row">
              <button
                type="button"
                className="control-button"
                onClick={() => previousStep(glycolysisSteps.length)}
                disabled={currentStepIndex === 0}
              >
                Previous
              </button>
              <button
                type="button"
                className="control-button primary"
                onClick={() => nextStep(glycolysisSteps.length)}
                disabled={currentStepIndex === glycolysisSteps.length - 1}
              >
                Next
              </button>
              <button
                type="button"
                className="control-button"
                style={{ marginLeft: 'auto', background: 'var(--accent)', color: 'var(--bg-deep)', fontWeight: 'bold' }}
                onClick={openChat}
              >
                Chat with AI
              </button>
            </div>

            <div className="divider" />

            <p className="ghost-text">
              Every pathway component is now shown as a compact biochemical block.
              Turn on
              <span className="inline-code"> PRO </span>
              to click a block and reveal the full atomic model. In
              <span className="inline-code"> Inspect </span>
              mode you get atoms, bonds, and functional groups; in
              <span className="inline-code"> Explode </span>
              mode the selected component separates into modular substructures.
            </p>

            <ul className="list">
              {currentStep.mechanism.map((entry) => (
                <li key={entry}>
                  <strong>Mechanism:</strong> {entry}
                </li>
              ))}
              {currentStep.articleSummary && (
                <li>
                  <strong>Biology Online:</strong> {currentStep.articleSummary}
                </li>
              )}
            </ul>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <div className="eyebrow">Energy Ledger</div>
              <h2 className="panel-title">Net Carriers</h2>
              <p className="panel-subtitle">
                Running totals per glucose as we move through the pathway.
              </p>
            </div>
          </div>
          <div className="panel-body">
            <div className="tracker-grid">
              <div className="stat-card">
                <strong>ATP</strong>
                <div className="tracker-number">{energy.atp > 0 ? `+${energy.atp}` : energy.atp}</div>
              </div>
              <div className="stat-card">
                <strong>NADH</strong>
                <div className="tracker-number">
                  {energy.nadh > 0 ? `+${energy.nadh}` : energy.nadh}
                </div>
              </div>
              <div className="stat-card">
                <strong>Final Output</strong>
                <div className="tracker-number">{glycolysisOutcome.output}</div>
              </div>
              <div className="stat-card">
                <strong>Animation</strong>
                <div className="tracker-number">
                  {animation.paused ? 'Paused' : animation.playing ? 'Running' : 'Settled'}
                </div>
              </div>
            </div>

            <div className="divider" />

            <div className="mini-actions">
              <span className="legend-chip">
                <span className="legend-dot" style={{ background: '#f1ba6a' }} />
                ATP / phosphate flux
              </span>
              <span className="legend-chip">
                <span className="legend-dot" style={{ background: '#7ab4ff' }} />
                NAD redox carriers
              </span>
              <span className="legend-chip">
                <span className="legend-dot" style={{ background: '#7ef0d7' }} />
                PRO detail overlays
              </span>
            </div>

            <div className="footer-note">
              Full pathway outcome: net {glycolysisOutcome.netATP} ATP and{' '}
              {glycolysisOutcome.netNADH} NADH without requiring oxygen.
            </div>
          </div>
        </section>
      </div>

      <section className="panel panel-right">
        <div className="panel-header">
          <div>
            <div className="eyebrow">Navigator</div>
            <h2 className="panel-title">Interactive Detail</h2>
            <p className="panel-subtitle">
              Jump to any reaction or inspect whichever catalytic object is selected.
            </p>
          </div>
        </div>
        <div className="panel-body panel-right-body">
          <div className="navigator-detail">
            <div className="step-scrubber">
              {glycolysisSteps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  className={index === currentStepIndex ? 'active' : ''}
                  onClick={() => setStep(index, glycolysisSteps.length)}
                  title={step.title}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <div className="divider" />

            {selectedEntity ? (
              <>
                <p className="ghost-text">{selectedEntity.description}</p>
                <div className="metadata-grid">
                  {selectedEntity.formula && (
                    <div className="metadata-card">
                      <div className="metadata-label">Formula</div>
                      <div className="metadata-value">{selectedEntity.formula}</div>
                    </div>
                  )}
                  {Object.entries(selectedEntity.metadata || {}).map(([label, value]) => (
                    <div key={label} className="metadata-card">
                      <div className="metadata-label">{label}</div>
                      <div className="metadata-value">{value}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="ghost-text">
                  No object is selected yet. Use
                  <span className="inline-code"> PRO </span>
                  to unlock atomic detail for the clicked block, or stay in overview
                  mode for a cleaner pathway architecture view.
                </p>
                <ul className="list">
                  {currentStep.articleStepLabel && (
                    <li>
                      <strong>Article Numbering:</strong> {currentStep.articleStepLabel}
                    </li>
                  )}
                  {currentStep.notes.map((note) => (
                    <li key={note}>
                      <strong>Context:</strong> {note}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <Chatbot embedded />
        </div>
      </section>
    </div>
  );
}

export default UIOverlay;
