import { createMolecule } from '../biology/molecules/builders';

const entityOffsets = (copies, x, laneShift = 0) =>
  Array.from({ length: copies }, (_, index) => {
    if (copies === 1) {
      return [x, laneShift, 0];
    }

    const spacing = 2.4;
    const base = ((copies - 1) * spacing) / 2;
    return [x, laneShift + index * spacing - base, index % 2 === 0 ? -0.95 : 0.95];
  });

const liftForCofactor = (direction) => (direction === 'release' ? -3.4 : 3.55);

const orientationFor = (seed, role) => {
  const base = ((seed % 7) - 3) * 0.14;

  if (role.includes('cofactor')) {
    return [0, base, 0];
  }

  if (role.includes('product')) {
    return [0, base * 0.9, 0];
  }

  return [0, base, 0];
};

const normalizeLabel = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const buildMoleculeSelection = (entity, proMode) => ({
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

const buildEnzymeSelection = (step) => ({
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

export const buildStepEntities = (step) => {
  const entities = [];

  step.substrates.forEach((entry, entryIndex) => {
    entityOffsets(entry.copies, -6, entryIndex * 0.6).forEach((position, copyIndex) => {
      entities.push({
        id: `${step.id}-substrate-${entry.template}-${copyIndex}`,
        type: 'molecule',
        role: 'substrate',
        molecule: createMolecule(entry.template, `${step.id}-s-${entry.template}-${copyIndex}`),
        startPosition: position,
        bindPosition: [-2.6, position[1] * 0.42, position[2] * 0.55],
        releasePosition: position,
        rotation: orientationFor(copyIndex + entry.template.length, 'substrate'),
      });
    });
  });

  step.products.forEach((entry, entryIndex) => {
    entityOffsets(entry.copies, 6, entryIndex * 0.6).forEach((position, copyIndex) => {
      entities.push({
        id: `${step.id}-product-${entry.template}-${copyIndex}`,
        type: 'molecule',
        role: 'product',
        molecule: createMolecule(entry.template, `${step.id}-p-${entry.template}-${copyIndex}`),
        startPosition: [2.6, position[1] * 0.28, position[2] * 0.42],
        bindPosition: [2.6, position[1] * 0.28, position[2] * 0.42],
        releasePosition: position,
        rotation: orientationFor(copyIndex + entry.template.length, 'product'),
      });
    });
  });

  step.cofactors.forEach((entry, entryIndex) => {
    entityOffsets(
      entry.copies,
      entry.direction === 'release' ? 4.8 : -4.8,
      liftForCofactor(entry.direction) + entryIndex * 0.18,
    ).forEach((position, copyIndex) => {
      const isRelease = entry.direction === 'release';
      entities.push({
        id: `${step.id}-cofactor-${entry.template}-${copyIndex}-${entry.direction}`,
        type: 'molecule',
        role: isRelease ? 'cofactor-release' : 'cofactor-consume',
        molecule: createMolecule(entry.template, `${step.id}-c-${entry.template}-${copyIndex}-${entry.direction}`),
        startPosition: position,
        bindPosition: [isRelease ? 2.15 : -2.15, position[1] * 0.3, position[2] * 0.34],
        releasePosition: position,
        rotation: orientationFor(copyIndex + entry.template.length, `cofactor-${entry.direction}`),
      });
    });
  });

  return entities;
};

export const listSelectableSceneEntities = (step, proMode = false) => {
  const moleculeOccurrences = new Map();
  const moleculeRecords = buildStepEntities(step).map((entity) => {
    const normalizedName = normalizeLabel(entity.molecule.name);
    const occurrenceIndex = (moleculeOccurrences.get(normalizedName) || 0) + 1;
    moleculeOccurrences.set(normalizedName, occurrenceIndex);

    return {
      id: entity.id,
      type: 'molecule',
      role: entity.role,
      label: entity.molecule.name,
      normalizedLabel: normalizedName,
      occurrenceIndex,
      selection: buildMoleculeSelection(entity, proMode),
      focus: {
        focus: entity.startPosition,
        offset: [1.7, 2.15, 6.8],
        focusEntity: 'molecule',
      },
    };
  });

  return [
    {
      id: step.enzyme.id,
      type: 'enzyme',
      role: 'enzyme',
      label: step.enzyme.name,
      normalizedLabel: normalizeLabel(step.enzyme.name),
      occurrenceIndex: 1,
      selection: buildEnzymeSelection(step),
      focus: {
        focus: step.enzyme.activeSite,
        offset: [2.8, 2.8, 8.4],
        focusEntity: 'enzyme',
      },
    },
    ...moleculeRecords,
  ];
};

export const summarizeSelectableSceneEntities = (step) => {
  const seen = new Set();

  return listSelectableSceneEntities(step)
    .filter((record) => {
      const uniqueKey = `${record.type}:${record.label}`;

      if (seen.has(uniqueKey)) {
        return false;
      }

      seen.add(uniqueKey);
      return true;
    })
    .map((record) => `${record.label} (${record.type === 'enzyme' ? 'enzyme' : record.role})`);
};

export const findSelectableSceneEntity = (
  step,
  entityName,
  { entityType = 'any', occurrenceIndex = 1, proMode = false } = {},
) => {
  if (!entityName) {
    return null;
  }

  const normalizedQuery = normalizeLabel(entityName);

  if (!normalizedQuery) {
    return null;
  }

  const records = listSelectableSceneEntities(step, proMode).filter(
    (record) => entityType === 'any' || record.type === entityType,
  );

  if (normalizedQuery === 'enzyme' || normalizedQuery === 'catalyst') {
    return records.find((record) => record.type === 'enzyme') || null;
  }

  const exactMatches = records.filter((record) => record.normalizedLabel === normalizedQuery);

  if (exactMatches.length >= occurrenceIndex) {
    return exactMatches[occurrenceIndex - 1];
  }

  const inclusiveMatches = records.filter((record) =>
    record.normalizedLabel.includes(normalizedQuery) || normalizedQuery.includes(record.normalizedLabel),
  );

  if (inclusiveMatches.length >= occurrenceIndex) {
    return inclusiveMatches[occurrenceIndex - 1];
  }

  return null;
};
