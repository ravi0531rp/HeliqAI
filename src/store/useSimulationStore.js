import { create } from 'zustand';

const clampStep = (index, total) => Math.min(Math.max(index, 0), total - 1);

export const useSimulationStore = create((set) => ({
  currentStepIndex: 0,
  selectedEntity: null,
  mode: 'overview',
  proMode: false,
  animation: {
    bind: 0,
    reaction: 0,
    release: 0,
    pulse: 0,
    glow: 0,
    playing: true,
    paused: false,
    replayToken: 0,
  },
  camera: {
    focus: [0, 0.5, 0],
    offset: [4.8, 5.8, 16.8],
    transitionKey: 0,
  },
  focusEntity: null,
  setStep: (index, total) =>
    set((state) => ({
      currentStepIndex: clampStep(index, total),
      selectedEntity: null,
      focusEntity: null,
      animation: {
        ...state.animation,
        paused: false,
      },
    })),
  nextStep: (total) =>
    set((state) => ({
      currentStepIndex: clampStep(state.currentStepIndex + 1, total),
      selectedEntity: null,
      focusEntity: null,
      animation: {
        ...state.animation,
        paused: false,
      },
    })),
  previousStep: (total) =>
    set((state) => ({
      currentStepIndex: clampStep(state.currentStepIndex - 1, total),
      selectedEntity: null,
      focusEntity: null,
      animation: {
        ...state.animation,
        paused: false,
      },
    })),
  selectEntity: (entity) =>
    set(() => ({
      selectedEntity: entity,
      focusEntity: entity?.type === 'enzyme' ? 'enzyme' : null,
    })),
  clearSelection: () =>
    set(() => ({
      selectedEntity: null,
      focusEntity: null,
    })),
  setMode: (mode) =>
    set((state) => ({
      mode,
      proMode: mode === 'overview' ? state.proMode : true,
      selectedEntity: null,
      focusEntity: null,
    })),
  setProMode: (enabled) =>
    set((state) => ({
      proMode: enabled,
      mode: enabled
        ? state.mode === 'overview'
          ? 'inspect'
          : state.mode
        : 'overview',
      selectedEntity: null,
      focusEntity: null,
    })),
  toggleProMode: () =>
    set((state) => ({
      proMode: !state.proMode,
      mode: !state.proMode ? 'inspect' : 'overview',
      selectedEntity: null,
      focusEntity: null,
    })),
  setAnimation: (animation) =>
    set((state) => ({
      animation: {
        ...state.animation,
        ...animation,
      },
    })),
  replayAnimation: () =>
    set((state) => ({
      animation: {
        ...state.animation,
        paused: false,
        replayToken: state.animation.replayToken + 1,
      },
    })),
  toggleAnimationPause: () =>
    set((state) => ({
      animation: {
        ...state.animation,
        paused: !state.animation.paused,
      },
    })),
  setAnimationPaused: (paused) =>
    set((state) => ({
      animation: {
        ...state.animation,
        paused,
      },
    })),
  setDefaultCamera: (focus, offset) =>
    set((state) => ({
      camera: {
        focus,
        offset,
        transitionKey: state.camera.transitionKey + 1,
      },
      focusEntity: null,
    })),
  focusOn: (focus, offset, focusEntity = null) =>
    set((state) => ({
      camera: {
        focus,
        offset,
        transitionKey: state.camera.transitionKey + 1,
      },
      focusEntity,
    })),
}));
