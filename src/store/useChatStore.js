import { create } from 'zustand';
import { glycolysisSteps } from '../biology/glycolysisSteps';
import {
  findSelectableSceneEntity,
  listSelectableSceneEntities,
  summarizeSelectableSceneEntities,
} from '../utils/sceneEntities';
import { useSimulationStore } from './useSimulationStore';

const MODEL_NAME = 'qwen2.5:14b';
const EXPLANATION_HINT_PATTERN = /\b(explain|why|how|what|describe|tell me|walk me through|compare)\b|\?/i;
const PRONOUN_ONLY_PATTERN = /\b(it|that|this)\b/;
const GENERIC_OFF_PATTERN = /\bturn\s+(it|that|this)\s+off\b|\bswitch\s+(it|that|this)\s+off\b|\bdisable\s+(it|that|this)?\b|\bshut\s+(it|that|this)\s+off\b/;
const GENERIC_ON_PATTERN = /\bturn\s+(it|that|this)\s+on\b|\bswitch\s+(it|that|this)\s+on\b|\benable\s+(it|that|this)?\b/;
const ORCHESTRATOR_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'control_scene',
      description:
        'Use this whenever the user wants to activate a clickable UI control, change the 3D state, select a visible scene object, or open/close the assistant panel.',
      parameters: {
        type: 'object',
        properties: {
          actions: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: [
                    'set_step',
                    'next_step',
                    'previous_step',
                    'set_mode',
                    'set_pro_mode',
                    'set_animation_paused',
                    'replay_animation',
                    'reset_camera',
                    'select_entity',
                    'clear_selection',
                    'set_chat_open',
                  ],
                },
                step_number: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 10,
                },
                mode: {
                  type: 'string',
                  enum: ['overview', 'inspect', 'explode'],
                },
                enabled: {
                  type: 'boolean',
                },
                paused: {
                  type: 'boolean',
                },
                open: {
                  type: 'boolean',
                },
                entity_name: {
                  type: 'string',
                },
                entity_type: {
                  type: 'string',
                  enum: ['any', 'enzyme', 'molecule'],
                },
                occurrence_index: {
                  type: 'integer',
                  minimum: 1,
                },
              },
              required: ['action'],
            },
          },
        },
        required: ['actions'],
      },
    },
  },
];

const clampStepNumber = (value) => Math.min(Math.max(value, 1), glycolysisSteps.length);

const normalizeText = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const parseJson = (rawValue, fallback = {}) => {
  if (typeof rawValue !== 'string') {
    return rawValue && typeof rawValue === 'object' ? rawValue : fallback;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    const firstBrace = rawValue.indexOf('{');
    const lastBrace = rawValue.lastIndexOf('}');

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(rawValue.slice(firstBrace, lastBrace + 1));
      } catch (nestedError) {
        return fallback;
      }
    }

    return fallback;
  }
};

const normalizeToolCalls = (toolCalls = []) =>
  toolCalls
    .filter((toolCall) => toolCall?.function?.name)
    .map((toolCall, index) => ({
      id: toolCall.id || `tool_call_${Date.now()}_${index}`,
      type: toolCall.type || 'function',
      function: {
        name: toolCall.function.name,
        arguments:
          typeof toolCall.function.arguments === 'string'
            ? toolCall.function.arguments
            : JSON.stringify(toolCall.function.arguments || {}),
      },
    }));

const cleanMessagesForApi = (messages) =>
  messages.map((message) => {
    const cleanMessage = {
      role: message.role,
      content: message.content || '',
    };

    if (message.tool_calls) {
      cleanMessage.tool_calls = message.tool_calls;
    }

    if (message.tool_call_id) {
      cleanMessage.tool_call_id = message.tool_call_id;
    }

    if (message.name) {
      cleanMessage.name = message.name;
    }

    return cleanMessage;
  });

const wordToStep = (value) =>
  ({
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    first: 1,
    last: glycolysisSteps.length,
    final: glycolysisSteps.length,
  }[value] || null);

const pushUniqueAction = (actions, nextAction) => {
  const actionKey = JSON.stringify(nextAction);

  if (!actions.some((existingAction) => JSON.stringify(existingAction) === actionKey)) {
    actions.push(nextAction);
  }
};

const getCurrentStep = () => glycolysisSteps[useSimulationStore.getState().currentStepIndex];

const getSceneSnapshot = () => {
  const simulation = useSimulationStore.getState();
  const step = glycolysisSteps[simulation.currentStepIndex];

  return {
    stepNumber: simulation.currentStepIndex + 1,
    stepTitle: step.title,
    summary: step.summary,
    enzyme: step.enzyme.name,
    mode: simulation.mode,
    proMode: simulation.proMode,
    animationPaused: simulation.animation.paused,
    selectedEntity: simulation.selectedEntity?.name || null,
    chatOpen: useChatStore.getState().isOpen,
    clickableControls: [
      'PRO toggle',
      'Overview',
      'Inspect',
      'Explode',
      'Reset Camera',
      simulation.animation.paused ? 'Resume' : 'Pause',
      'Replay',
      'Previous',
      'Next',
      'Step buttons 1-10',
      'Assistant panel',
    ],
    clickableEntities: summarizeSelectableSceneEntities(step),
    notes: step.notes,
  };
};

const buildSystemPrompt = (sceneSnapshot) => `You are GlycoBot, an assistant inside an interactive 3D glycolysis visualization.

Current scene state:
- Step: ${sceneSnapshot.stepNumber} (${sceneSnapshot.stepTitle})
- Enzyme: ${sceneSnapshot.enzyme}
- View mode: ${sceneSnapshot.mode}
- PRO mode: ${sceneSnapshot.proMode ? 'on' : 'off'}
- Animation: ${sceneSnapshot.animationPaused ? 'paused' : 'running'}
- Selected object: ${sceneSnapshot.selectedEntity || 'none'}
- Assistant panel: ${sceneSnapshot.chatOpen ? 'open' : 'closed'}

Clickable controls:
- ${sceneSnapshot.clickableControls.join('\n- ')}

Clickable scene objects in the current step:
- ${sceneSnapshot.clickableEntities.join('\n- ')}

Behavior rules:
- Answer biology and app questions clearly and concisely.
- If the user wants the visualization changed or wants you to use a clickable control, call the control_scene tool with exact structured actions.
- Never claim a scene action was completed unless you called the tool.
- Use only the schema values exactly as defined.
- If the request is ambiguous, ask one short clarifying question instead of guessing.`;

const detectRecentControlTarget = (messages, sceneSnapshot, lastReferencedControl) => {
  const recentText = messages
    .slice(-6)
    .map((message) => message.content || '')
    .join(' ')
    .toLowerCase();

  const priorities = [
    lastReferencedControl,
    recentText.includes('chat') || recentText.includes('assistant') ? 'chat' : null,
    recentText.includes('pro mode') || sceneSnapshot.proMode ? 'pro_mode' : null,
    recentText.includes('animation') || recentText.includes('pause') || recentText.includes('resume')
      ? 'animation'
      : null,
    recentText.includes('inspect') || recentText.includes('explode') || recentText.includes('overview')
      ? 'mode'
      : null,
  ];

  return priorities.find(Boolean) || null;
};

const mapImplicitTargetToActions = (target, normalizedContent, sceneSnapshot) => {
  if (!target) {
    return [];
  }

  const actions = [];

  if (GENERIC_OFF_PATTERN.test(normalizedContent) || /\bclose\b|\bhide\b/.test(normalizedContent)) {
    if (target === 'chat') {
      pushUniqueAction(actions, { action: 'set_chat_open', open: false });
    } else if (target === 'pro_mode') {
      pushUniqueAction(actions, { action: 'set_pro_mode', enabled: false });
    } else if (target === 'animation') {
      pushUniqueAction(actions, { action: 'set_animation_paused', paused: true });
    } else if (target === 'mode') {
      pushUniqueAction(actions, { action: 'set_mode', mode: 'overview' });
    }
  }

  if (GENERIC_ON_PATTERN.test(normalizedContent) || /\bopen\b|\bshow\b/.test(normalizedContent)) {
    if (target === 'chat') {
      pushUniqueAction(actions, { action: 'set_chat_open', open: true });
    } else if (target === 'pro_mode') {
      pushUniqueAction(actions, { action: 'set_pro_mode', enabled: true });
    } else if (target === 'animation') {
      pushUniqueAction(actions, { action: 'set_animation_paused', paused: false });
    }
  }

  if (
    actions.length === 0 &&
    PRONOUN_ONLY_PATTERN.test(normalizedContent) &&
    /\bturn\b|\bswitch\b|\bdisable\b|\benable\b|\bopen\b|\bclose\b|\bhide\b|\bshow\b/.test(normalizedContent)
  ) {
    if (target === 'pro_mode' && sceneSnapshot.proMode) {
      pushUniqueAction(actions, { action: 'set_pro_mode', enabled: false });
    } else if (target === 'chat') {
      pushUniqueAction(actions, { action: 'set_chat_open', open: !sceneSnapshot.chatOpen });
    }
  }

  return actions;
};

const inferEntityActions = (normalizedContent, sceneSnapshot) => {
  const step = getCurrentStep();
  const records = listSelectableSceneEntities(step, sceneSnapshot.proMode)
    .slice()
    .sort((left, right) => right.normalizedLabel.length - left.normalizedLabel.length);
  const matchedEntity = records.find(
    (record) =>
      normalizedContent.includes(record.normalizedLabel) ||
      (record.type === 'enzyme' && /\benzyme\b|\bcatalytic block\b/.test(normalizedContent)),
  );

  if (!matchedEntity) {
    return [];
  }

  const actions = [];

  if (/\binspect\b/.test(normalizedContent)) {
    if (!sceneSnapshot.proMode) {
      pushUniqueAction(actions, { action: 'set_pro_mode', enabled: true });
    }

    pushUniqueAction(actions, { action: 'set_mode', mode: 'inspect' });
  }

  if (/\bexplode\b/.test(normalizedContent)) {
    if (!sceneSnapshot.proMode) {
      pushUniqueAction(actions, { action: 'set_pro_mode', enabled: true });
    }

    pushUniqueAction(actions, { action: 'set_mode', mode: 'explode' });
  }

  if (/\bselect\b|\bclick\b|\bfocus\b|\bshow\b|\bopen\b|\binspect\b|\bexplode\b/.test(normalizedContent)) {
    pushUniqueAction(actions, {
      action: 'select_entity',
      entity_name: matchedEntity.label,
      entity_type: matchedEntity.type,
      occurrence_index: matchedEntity.occurrenceIndex,
    });
  }

  return actions;
};

const inferSceneActions = (content, sceneSnapshot, context) => {
  if (!content) {
    return [];
  }

  const normalizedContent = content.toLowerCase();
  const actions = [];

  const explicitStepMatches = [
    ...normalizedContent.matchAll(/\b(?:step|page|reaction|stage)\s+(\d{1,2})\b/g),
  ];
  if (explicitStepMatches.length > 0) {
    const lastMatch = explicitStepMatches[explicitStepMatches.length - 1];
    pushUniqueAction(actions, {
      action: 'set_step',
      step_number: clampStepNumber(Number(lastMatch[1])),
    });
  } else {
    const wordStepMatch = normalizedContent.match(
      /\b(?:(?:step|page|reaction|stage)\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|first|last|final)\b/,
    );

    if (wordStepMatch) {
      const stepNumber = wordToStep(wordStepMatch[1]);

      if (stepNumber) {
        pushUniqueAction(actions, {
          action: 'set_step',
          step_number: stepNumber,
        });
      }
    }
  }

  if (
    /\b(next|forward|advance|continue)\b/.test(normalizedContent) &&
    !/\bnext to\b/.test(normalizedContent) &&
    !actions.some((action) => action.action === 'set_step')
  ) {
    pushUniqueAction(actions, { action: 'next_step' });
  }

  if (
    /\b(previous|prev|back|go back)\b/.test(normalizedContent) &&
    !/\bback to overview\b/.test(normalizedContent) &&
    !actions.some((action) => action.action === 'set_step')
  ) {
    pushUniqueAction(actions, { action: 'previous_step' });
  }

  if (/\b(turn on|enable|enter)\s+pro\b|\bpro on\b|\batomic detail\b|\bshow atoms\b/.test(normalizedContent)) {
    pushUniqueAction(actions, { action: 'set_pro_mode', enabled: true });
  }

  if (/\b(turn off|disable|exit|leave)\s+pro\b|\bpro off\b/.test(normalizedContent)) {
    pushUniqueAction(actions, { action: 'set_pro_mode', enabled: false });
  }

  if (/\boverview\b/.test(normalizedContent)) {
    pushUniqueAction(actions, { action: 'set_mode', mode: 'overview' });
  }

  if (/\binspect\b/.test(normalizedContent) && !/\binspect\b.*\bwhat\b/.test(normalizedContent)) {
    if (!sceneSnapshot.proMode) {
      pushUniqueAction(actions, { action: 'set_pro_mode', enabled: true });
    }

    pushUniqueAction(actions, { action: 'set_mode', mode: 'inspect' });
  }

  if (/\bexplode\b/.test(normalizedContent)) {
    if (!sceneSnapshot.proMode) {
      pushUniqueAction(actions, { action: 'set_pro_mode', enabled: true });
    }

    pushUniqueAction(actions, { action: 'set_mode', mode: 'explode' });
  }

  if (/\breplay\b|\brestart animation\b/.test(normalizedContent)) {
    pushUniqueAction(actions, { action: 'replay_animation' });
  }

  if (/\bpause\b/.test(normalizedContent) && !/\bunpause\b/.test(normalizedContent)) {
    pushUniqueAction(actions, { action: 'set_animation_paused', paused: true });
  }

  if (/\bresume\b|\bunpause\b|\bplay animation\b/.test(normalizedContent)) {
    pushUniqueAction(actions, { action: 'set_animation_paused', paused: false });
  }

  if (/\breset camera\b|\bcenter camera\b|\bhome camera\b/.test(normalizedContent)) {
    pushUniqueAction(actions, { action: 'reset_camera' });
  }

  if (/\b(open|show)\s+(the )?(chat|assistant)\b/.test(normalizedContent)) {
    pushUniqueAction(actions, { action: 'set_chat_open', open: true });
  }

  if (/\b(close|hide)\s+(the )?(chat|assistant)\b/.test(normalizedContent)) {
    pushUniqueAction(actions, { action: 'set_chat_open', open: false });
  }

  if (/\b(clear|deselect|unselect)\b/.test(normalizedContent)) {
    pushUniqueAction(actions, { action: 'clear_selection' });
  }

  inferEntityActions(normalizeText(content), sceneSnapshot).forEach((action) => {
    pushUniqueAction(actions, action);
  });

  if (actions.length === 0) {
    const implicitTarget = detectRecentControlTarget(
      context.messages,
      sceneSnapshot,
      context.lastReferencedControl,
    );

    mapImplicitTargetToActions(implicitTarget, normalizedContent, sceneSnapshot).forEach((action) => {
      pushUniqueAction(actions, action);
    });
  }

  return actions;
};

const looksLikePureSceneCommand = (content, inferredActions) =>
  inferredActions.length > 0 && !EXPLANATION_HINT_PATTERN.test(content);

const normalizeSceneAction = (rawAction) => {
  if (!rawAction || typeof rawAction !== 'object') {
    return null;
  }

  const action = rawAction.action;

  if (action === 'set_step') {
    const stepNumber = Number.parseInt(rawAction.step_number, 10);

    if (Number.isNaN(stepNumber)) {
      return null;
    }

    return {
      action,
      step_number: clampStepNumber(stepNumber),
    };
  }

  if (action === 'set_mode') {
    if (!['overview', 'inspect', 'explode'].includes(rawAction.mode)) {
      return null;
    }

    return {
      action,
      mode: rawAction.mode,
    };
  }

  if (action === 'set_pro_mode') {
    if (typeof rawAction.enabled !== 'boolean') {
      return null;
    }

    return {
      action,
      enabled: rawAction.enabled,
    };
  }

  if (action === 'set_animation_paused') {
    if (typeof rawAction.paused !== 'boolean') {
      return null;
    }

    return {
      action,
      paused: rawAction.paused,
    };
  }

  if (action === 'set_chat_open') {
    if (typeof rawAction.open !== 'boolean') {
      return null;
    }

    return {
      action,
      open: rawAction.open,
    };
  }

  if (action === 'select_entity') {
    if (!rawAction.entity_name || typeof rawAction.entity_name !== 'string') {
      return null;
    }

    return {
      action,
      entity_name: rawAction.entity_name,
      entity_type: rawAction.entity_type || 'any',
      occurrence_index: Math.max(1, Number.parseInt(rawAction.occurrence_index || 1, 10) || 1),
    };
  }

  if (
    [
      'next_step',
      'previous_step',
      'replay_animation',
      'reset_camera',
      'clear_selection',
    ].includes(action)
  ) {
    return { action };
  }

  return null;
};

const inferLastReferencedControl = (actions) => {
  const latestAction = [...actions].reverse().find(Boolean);

  if (!latestAction) {
    return null;
  }

  if (latestAction.action === 'set_pro_mode') {
    return 'pro_mode';
  }

  if (latestAction.action === 'set_animation_paused' || latestAction.action === 'replay_animation') {
    return 'animation';
  }

  if (latestAction.action === 'set_mode') {
    return 'mode';
  }

  if (latestAction.action === 'set_chat_open') {
    return 'chat';
  }

  if (latestAction.action === 'select_entity' || latestAction.action === 'clear_selection') {
    return 'selection';
  }

  return 'navigation';
};

const executeSceneActions = (actions) => {
  const simulation = useSimulationStore.getState();
  const totalSteps = glycolysisSteps.length;
  const normalizedActions = actions.map(normalizeSceneAction).filter(Boolean);
  const results = [];

  normalizedActions.forEach((action) => {
    const currentStep = getCurrentStep();

    switch (action.action) {
      case 'set_step':
        simulation.setStep(action.step_number - 1, totalSteps);
        results.push(`Jumped to step ${action.step_number}.`);
        break;
      case 'next_step':
        simulation.nextStep(totalSteps);
        results.push(`Moved to step ${useSimulationStore.getState().currentStepIndex + 1}.`);
        break;
      case 'previous_step':
        simulation.previousStep(totalSteps);
        results.push(`Moved back to step ${useSimulationStore.getState().currentStepIndex + 1}.`);
        break;
      case 'set_mode':
        simulation.setMode(action.mode);
        results.push(`Switched to ${action.mode} mode.`);
        break;
      case 'set_pro_mode':
        simulation.setProMode(action.enabled);
        results.push(`PRO mode turned ${action.enabled ? 'on' : 'off'}.`);
        break;
      case 'set_animation_paused':
        simulation.setAnimationPaused(action.paused);
        results.push(`Animation ${action.paused ? 'paused' : 'resumed'}.`);
        break;
      case 'replay_animation':
        simulation.replayAnimation();
        results.push('Replayed the current step animation.');
        break;
      case 'reset_camera':
        simulation.setDefaultCamera(currentStep.camera.focus, currentStep.camera.offset);
        results.push('Reset the camera to the default angle for this step.');
        break;
      case 'set_chat_open':
        useChatStore.setState({ isOpen: action.open });
        results.push(`Assistant panel ${action.open ? 'opened' : 'closed'}.`);
        break;
      case 'clear_selection':
        simulation.clearSelection();
        results.push('Cleared the current selection.');
        break;
      case 'select_entity': {
        const matchedEntity = findSelectableSceneEntity(currentStep, action.entity_name, {
          entityType: action.entity_type,
          occurrenceIndex: action.occurrence_index,
          proMode: useSimulationStore.getState().proMode,
        });

        if (!matchedEntity) {
          results.push(`Could not find ${action.entity_name} in the current step.`);
          break;
        }

        simulation.selectEntity(matchedEntity.selection);
        simulation.focusOn(
          matchedEntity.focus.focus,
          matchedEntity.focus.offset,
          matchedEntity.focus.focusEntity,
        );
        results.push(`Selected ${matchedEntity.label}.`);
        break;
      }
      default:
        break;
    }
  });

  const lastReferencedControl = inferLastReferencedControl(normalizedActions);

  if (lastReferencedControl) {
    useChatStore.setState({ lastReferencedControl });
  }

  return {
    results,
    sceneSnapshot: getSceneSnapshot(),
    lastReferencedControl,
  };
};

const buildToolResult = (execution) =>
  JSON.stringify(
    {
      executed: execution.results,
      scene: execution.sceneSnapshot,
    },
    null,
    2,
  );

const buildActionSummary = (execution) => {
  if (execution.results.length === 0) {
    return "I couldn't map that request to a supported scene action.";
  }

  return execution.results.join(' ');
};

const requestChatCompletion = async (messages, tools = undefined) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages,
      stream: false,
      ...(tools ? { tools } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.message || { content: '' };
};

const executeToolCalls = (toolCalls) => {
  const toolMessages = [];
  const summaries = [];
  let lastReferencedControl = null;

  toolCalls.forEach((toolCall) => {
    if (toolCall.function.name !== 'control_scene') {
      toolMessages.push({
        role: 'tool',
        name: toolCall.function.name,
        content: `Unsupported tool: ${toolCall.function.name}`,
        tool_call_id: toolCall.id,
      });
      summaries.push(`Ignored unsupported tool ${toolCall.function.name}.`);
      return;
    }

    const argumentsObject = parseJson(toolCall.function.arguments, {});
    const actions = Array.isArray(argumentsObject.actions)
      ? argumentsObject.actions
      : argumentsObject.action
        ? [argumentsObject]
        : [];
    const execution = executeSceneActions(actions);

    toolMessages.push({
      role: 'tool',
      name: toolCall.function.name,
      content: buildToolResult(execution),
      tool_call_id: toolCall.id,
    });
    summaries.push(buildActionSummary(execution));
    lastReferencedControl = execution.lastReferencedControl || lastReferencedControl;
  });

  return {
    toolMessages,
    summary: summaries.filter(Boolean).join(' '),
    lastReferencedControl,
  };
};

export const useChatStore = create((set, get) => ({
  isOpen: false,
  messages: [],
  isTyping: false,
  lastReferencedControl: null,

  setOpen: (isOpen) => set({ isOpen }),
  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  sendMessage: async (content) => {
    const { addMessage } = get();
    const trimmedContent = content?.trim();

    if (!trimmedContent) {
      return;
    }

    addMessage({ role: 'user', content: trimmedContent });
    set({ isTyping: true });

    const initialSnapshot = getSceneSnapshot();
    const inferredActions = inferSceneActions(trimmedContent, initialSnapshot, {
      messages: get().messages,
      lastReferencedControl: get().lastReferencedControl,
    });

    try {
      if (looksLikePureSceneCommand(trimmedContent, inferredActions)) {
        const execution = executeSceneActions(inferredActions);
        addMessage({ role: 'assistant', content: buildActionSummary(execution) });
        return;
      }

      const conversation = cleanMessagesForApi(get().messages);
      const assistantMessage = await requestChatCompletion(
        [
          { role: 'system', content: buildSystemPrompt(initialSnapshot) },
          ...conversation,
        ],
        ORCHESTRATOR_TOOLS,
      );

      const normalizedToolCalls = normalizeToolCalls(assistantMessage.tool_calls);

      if (normalizedToolCalls.length === 0) {
        let finalContent = assistantMessage.content?.trim() || '';

        if (inferredActions.length > 0) {
          const execution = executeSceneActions(inferredActions);
          const sceneUpdateSummary = buildActionSummary(execution);

          finalContent = finalContent
            ? `${finalContent}\n\nScene updated: ${sceneUpdateSummary}`
            : sceneUpdateSummary;
        }

        addMessage({
          role: 'assistant',
          content: finalContent || "I couldn't determine a reliable response.",
        });
        return;
      }

      const hiddenAssistantToolMessage = {
        role: 'assistant',
        content: assistantMessage.content || '',
        tool_calls: normalizedToolCalls,
        hidden: true,
      };
      const { toolMessages, summary, lastReferencedControl } = executeToolCalls(normalizedToolCalls);

      set((state) => ({
        messages: [...state.messages, hiddenAssistantToolMessage, ...toolMessages],
        ...(lastReferencedControl ? { lastReferencedControl } : {}),
      }));

      const followUpConversation = cleanMessagesForApi(get().messages);
      const followUpMessage = await requestChatCompletion([
        { role: 'system', content: buildSystemPrompt(getSceneSnapshot()) },
        ...followUpConversation,
      ]);

      addMessage({
        role: 'assistant',
        content: followUpMessage.content?.trim() || summary || 'Scene updated.',
      });
    } catch (error) {
      console.error('Failed to connect to Ollama:', error);

      if (inferredActions.length > 0) {
        const execution = executeSceneActions(inferredActions);
        addMessage({
          role: 'assistant',
          content: `${buildActionSummary(execution)}\n\nLocal fallback used because Ollama was unavailable.`,
        });
        return;
      }

      addMessage({
        role: 'assistant',
        content: 'Error: Could not reach the local Ollama instance.',
      });
    } finally {
      set({ isTyping: false });
    }
  },
}));
