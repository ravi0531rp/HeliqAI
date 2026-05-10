import { Molecule } from '../models/Molecule';

const atom = (id, element, position, group = 'backbone') => ({
  id,
  element,
  position,
  group,
});

const bond = (id, from, to, order = 1) => ({
  id,
  from,
  to,
  order,
});

const functionalGroup = (id, name, type, atomIds, anchor, description) => ({
  id,
  name,
  type,
  atomIds,
  anchor,
  description,
});

const mergeParts = (parts) =>
  parts.reduce(
    (accumulator, part) => {
      accumulator.atoms.push(...(part.atoms || []));
      accumulator.bonds.push(...(part.bonds || []));
      if (part.functionalGroup) {
        accumulator.functionalGroups.push(part.functionalGroup);
      }
      if (part.functionalGroups) {
        accumulator.functionalGroups.push(...part.functionalGroups);
      }
      return accumulator;
    },
    { atoms: [], bonds: [], functionalGroups: [] },
  );

const buildPhosphate = (prefix, anchor, spread = 0.34) => {
  const phosphorus = atom(`${prefix}-p`, 'P', anchor, 'phosphate');
  const oxygens = [
    atom(`${prefix}-o1`, 'O', [anchor[0] + spread, anchor[1] + 0.05, anchor[2]], 'phosphate'),
    atom(`${prefix}-o2`, 'O', [anchor[0] - spread, anchor[1], anchor[2] + 0.08], 'phosphate'),
    atom(`${prefix}-o3`, 'O', [anchor[0], anchor[1] + spread, anchor[2] - 0.16], 'phosphate'),
    atom(`${prefix}-o4`, 'O', [anchor[0], anchor[1] - spread, anchor[2] + 0.16], 'phosphate'),
  ];

  return {
    atoms: [phosphorus, ...oxygens],
    bonds: oxygens.map((oxygen, index) =>
      bond(`${prefix}-b${index + 1}`, phosphorus.id, oxygen.id, index === 0 ? 2 : 1),
    ),
    phosphorusId: phosphorus.id,
    functionalGroup: functionalGroup(
      `${prefix}-group`,
      'Phosphate group',
      'phosphate',
      [phosphorus.id, ...oxygens.map((oxygen) => oxygen.id)],
      anchor,
      'Transferable tetrahedral phosphate module used for trapping, activation, and ATP production.',
    ),
  };
};

const buildHydroxyl = (prefix, carbonId, anchor, direction = [0, 0.38, 0.14]) => {
  const oxygen = atom(
    `${prefix}-o`,
    'O',
    [anchor[0] + direction[0], anchor[1] + direction[1], anchor[2] + direction[2]],
    'hydroxyl',
  );
  const hydrogen = atom(
    `${prefix}-h`,
    'H',
    [oxygen.position[0] + 0.18, oxygen.position[1] + 0.12, oxygen.position[2] + 0.04],
    'hydroxyl',
  );

  return {
    atoms: [oxygen, hydrogen],
    bonds: [
      bond(`${prefix}-co`, carbonId, oxygen.id),
      bond(`${prefix}-oh`, oxygen.id, hydrogen.id),
    ],
    functionalGroup: functionalGroup(
      `${prefix}-group`,
      'Hydroxyl',
      'hydroxyl',
      [oxygen.id, hydrogen.id],
      oxygen.position,
      'Alcohol functionality that participates in ring closure, phosphorylation, and hydrogen bonding.',
    ),
  };
};

const buildCarbonyl = (
  prefix,
  carbonId,
  anchor,
  direction = [0, 0.62, 0],
  label = 'Carbonyl',
  description = 'Electrophilic carbonyl center involved in sugar isomerization and redox chemistry.',
) => {
  const oxygen = atom(
    `${prefix}-o`,
    'O',
    [anchor[0] + direction[0], anchor[1] + direction[1], anchor[2] + direction[2]],
    'carbonyl',
  );

  return {
    atoms: [oxygen],
    bonds: [bond(`${prefix}-bond`, carbonId, oxygen.id, 2)],
    functionalGroup: functionalGroup(
      `${prefix}-group`,
      label,
      'carbonyl',
      [oxygen.id],
      oxygen.position,
      description,
    ),
  };
};

const buildCarboxylate = (prefix, carbonId, anchor) => {
  const oxygenDouble = atom(`${prefix}-o1`, 'O', [anchor[0] - 0.06, anchor[1] + 0.72, anchor[2] - 0.08], 'carbonyl');
  const oxygenSingle = atom(`${prefix}-o2`, 'O', [anchor[0] - 0.18, anchor[1] - 0.52, anchor[2] + 0.2], 'carbonyl');

  return {
    atoms: [oxygenDouble, oxygenSingle],
    bonds: [
      bond(`${prefix}-double`, carbonId, oxygenDouble.id, 2),
      bond(`${prefix}-single`, carbonId, oxygenSingle.id, 1),
    ],
    functionalGroup: functionalGroup(
      `${prefix}-group`,
      'Carboxylate',
      'carbonyl',
      [oxygenDouble.id, oxygenSingle.id],
      [anchor[0] - 0.1, anchor[1] + 0.1, anchor[2]],
      'Terminal carboxylate that stabilizes the later glycolytic intermediates and pyruvate.',
    ),
  };
};

const buildAcylPhosphate = (prefix, carbonId, anchor) => {
  const carbonyl = buildCarbonyl(
    `${prefix}-carbonyl`,
    carbonId,
    anchor,
    [0.06, 0.64, -0.08],
    'Acyl carbonyl',
    'Carbonyl adjacent to a phosphate ester, creating the high phosphoryl-transfer potential of 1,3-BPG.',
  );
  const phosphate = buildPhosphate(
    `${prefix}-phosphate`,
    [anchor[0] - 0.14, anchor[1] - 0.58, anchor[2] + 0.14],
    0.28,
  );

  return {
    atoms: [...carbonyl.atoms, ...phosphate.atoms],
    bonds: [
      ...carbonyl.bonds,
      ...phosphate.bonds,
      bond(`${prefix}-link`, carbonId, phosphate.phosphorusId),
    ],
    functionalGroups: [
      carbonyl.functionalGroup,
      functionalGroup(
        `${prefix}-group`,
        'Acyl phosphate',
        'phosphate',
        [phosphate.phosphorusId, ...phosphate.functionalGroup.atomIds],
        phosphate.functionalGroup.anchor,
        'Mixed anhydride bond that drives substrate-level phosphorylation in the next step.',
      ),
    ],
  };
};

const connectPhosphateToCarbon = (prefix, carbonId, carbonPosition, direction = [0.2, 0.68, 0]) => {
  const phosphate = buildPhosphate(
    prefix,
    [carbonPosition[0] + direction[0], carbonPosition[1] + direction[1], carbonPosition[2] + direction[2]],
    0.28,
  );

  return {
    atoms: phosphate.atoms,
    bonds: [...phosphate.bonds, bond(`${prefix}-link`, carbonId, phosphate.phosphorusId)],
    functionalGroup: phosphate.functionalGroup,
  };
};

const buildHexoseRing = ({
  id,
  name,
  formula,
  phosphates = [],
  energyState = 'neutral',
  description,
  metadata = {},
}) => {
  const scaffold = {
    c1: [-1.18, 0.68, 0.18],
    c2: [-0.12, 1.18, -0.1],
    c3: [1.02, 0.7, 0.22],
    c4: [1.12, -0.46, -0.18],
    c5: [0.02, -1, 0.1],
    o5: [-1.08, -0.5, -0.12],
    c6: [0.04, -2.18, 0.28],
  };

  const coreAtoms = [
    atom('c1', 'C', scaffold.c1),
    atom('c2', 'C', scaffold.c2),
    atom('c3', 'C', scaffold.c3),
    atom('c4', 'C', scaffold.c4),
    atom('c5', 'C', scaffold.c5),
    atom('o5', 'O', scaffold.o5, 'hydroxyl'),
    atom('c6', 'C', scaffold.c6),
  ];

  const coreBonds = [
    bond('ring-1', 'c1', 'c2'),
    bond('ring-2', 'c2', 'c3'),
    bond('ring-3', 'c3', 'c4'),
    bond('ring-4', 'c4', 'c5'),
    bond('ring-5', 'c5', 'o5'),
    bond('ring-6', 'o5', 'c1'),
    bond('exo-6', 'c5', 'c6'),
  ];

  const hydroxylDirections = {
    1: [-0.42, 0.34, 0.16],
    2: [-0.08, 0.42, -0.22],
    3: [0.34, 0.26, 0.14],
    4: [0.34, -0.16, -0.22],
    6: [0.28, -0.12, 0.18],
  };

  const hydroxylParts = [1, 2, 3, 4, 6]
    .filter((carbonIndex) => !phosphates.includes(carbonIndex))
    .map((carbonIndex) =>
      buildHydroxyl(
        `glucose-c${carbonIndex}`,
        `c${carbonIndex}`,
        scaffold[`c${carbonIndex}`],
        hydroxylDirections[carbonIndex],
      ),
    );

  const phosphateParts = phosphates.map((carbonIndex) =>
    connectPhosphateToCarbon(
      `glucose-phosphate-c${carbonIndex}`,
      `c${carbonIndex}`,
      scaffold[`c${carbonIndex}`],
      carbonIndex === 6 ? [0.26, -0.1, 0.2] : [0.24, 0.66, 0],
    ),
  );

  const merged = mergeParts([
    { atoms: coreAtoms, bonds: coreBonds },
    ...hydroxylParts,
    ...phosphateParts,
    {
      functionalGroup: functionalGroup(
        'pyranose-ring',
        'Pyranose ring oxygen',
        'hydroxyl',
        ['o5', 'c1', 'c5'],
        scaffold.o5,
        'Intraring oxygen that closes the six-membered glucose ring and defines the cyclic hemiacetal form.',
      ),
    },
  ]);

  return new Molecule({
    id,
    name,
    formula,
    category: 'hexose',
    description,
    atoms: merged.atoms,
    bonds: merged.bonds,
    functionalGroups: merged.functionalGroups,
    energyState,
    metadata,
  });
};

const buildLinearKetoseHexose = ({
  id,
  name,
  formula,
  phosphates = [],
  energyState = 'neutral',
  description,
  metadata = {},
}) => {
  const positions = {
    c1: [-3, 0.36, 0.12],
    c2: [-1.78, 0.92, -0.16],
    c3: [-0.56, 0.24, 0.2],
    c4: [0.7, -0.26, -0.18],
    c5: [1.92, 0.32, 0.16],
    c6: [3.18, -0.18, -0.1],
  };

  const carbons = Object.entries(positions).map(([idKey, position]) => atom(idKey, 'C', position));
  const backboneBonds = [
    bond('k-b1', 'c1', 'c2'),
    bond('k-b2', 'c2', 'c3'),
    bond('k-b3', 'c3', 'c4'),
    bond('k-b4', 'c4', 'c5'),
    bond('k-b5', 'c5', 'c6'),
  ];

  const ketone = buildCarbonyl(
    'fructose-carbonyl',
    'c2',
    positions.c2,
    [0.08, 0.72, 0],
    'Ketone',
    'C2 ketone that defines fructose as a ketose and sets up symmetric cleavage by aldolase after activation.',
  );

  const hydroxylDirections = {
    1: [-0.28, -0.4, 0.18],
    3: [0.06, 0.46, 0.18],
    4: [-0.08, -0.48, -0.16],
    5: [0.1, 0.46, 0.12],
    6: [0.28, -0.4, 0.1],
  };

  const hydroxylParts = [1, 3, 4, 5, 6]
    .filter((carbonIndex) => !phosphates.includes(carbonIndex))
    .map((carbonIndex) =>
      buildHydroxyl(
        `fructose-c${carbonIndex}`,
        `c${carbonIndex}`,
        positions[`c${carbonIndex}`],
        hydroxylDirections[carbonIndex],
      ),
    );

  const phosphateParts = phosphates.map((carbonIndex) =>
    connectPhosphateToCarbon(
      `fructose-phosphate-c${carbonIndex}`,
      `c${carbonIndex}`,
      positions[`c${carbonIndex}`],
      carbonIndex === 1 ? [-0.12, -0.68, 0.2] : [0.18, 0.72, 0],
    ),
  );

  const merged = mergeParts([
    { atoms: carbons, bonds: backboneBonds },
    ketone,
    ...hydroxylParts,
    ...phosphateParts,
  ]);

  return new Molecule({
    id,
    name,
    formula,
    category: 'fructose',
    description,
    atoms: merged.atoms,
    bonds: merged.bonds,
    functionalGroups: merged.functionalGroups,
    energyState,
    metadata,
  });
};

const buildTrioseIntermediate = ({
  id,
  name,
  formula,
  description,
  metadata = {},
  energyState = 'neutral',
  carbonylAt = null,
  carboxylate = false,
  phosphates = [],
  hydroxyls = [],
  doubleBond = null,
  acylPhosphateAt = null,
}) => {
  const positions = {
    c1: [-1.56, 0.34, 0.12],
    c2: [0, 0, -0.16],
    c3: [1.56, -0.28, 0.16],
  };

  const carbons = [
    atom('c1', 'C', positions.c1),
    atom('c2', 'C', positions.c2),
    atom('c3', 'C', positions.c3),
  ];

  const bondOrder = (a, b) => {
    if (!doubleBond) {
      return 1;
    }
    return doubleBond.includes(a) && doubleBond.includes(b) ? 2 : 1;
  };

  const backboneBonds = [
    bond('tri-b1', 'c1', 'c2', bondOrder('c1', 'c2')),
    bond('tri-b2', 'c2', 'c3', bondOrder('c2', 'c3')),
  ];

  const parts = [{ atoms: carbons, bonds: backboneBonds }];

  if (carboxylate) {
    parts.push(buildCarboxylate('triose-carboxylate', 'c1', positions.c1));
  } else if (carbonylAt) {
    parts.push(
      buildCarbonyl(
        `triose-carbonyl-c${carbonylAt}`,
        `c${carbonylAt}`,
        positions[`c${carbonylAt}`],
        carbonylAt === 1 ? [-0.08, 0.72, 0] : [0.02, 0.66, -0.1],
        carbonylAt === 1 ? 'Aldehyde' : 'Ketone',
        carbonylAt === 1
          ? 'Aldehyde carbonyl poised for oxidation in the GAPDH step.'
          : 'Ketone center that differentiates DHAP and pyruvate from aldehyde-containing intermediates.',
      ),
    );
  }

  if (acylPhosphateAt) {
    parts.push(buildAcylPhosphate(`acyl-phosphate-c${acylPhosphateAt}`, `c${acylPhosphateAt}`, positions[`c${acylPhosphateAt}`]));
  }

  phosphates.forEach((carbonIndex) => {
    parts.push(
      connectPhosphateToCarbon(
        `triose-phosphate-c${carbonIndex}`,
        `c${carbonIndex}`,
        positions[`c${carbonIndex}`],
        carbonIndex === 3 ? [0.18, 0.68, 0.12] : [0, 0.72, -0.04],
      ),
    );
  });

  const hydroxylDirections = {
    1: [-0.26, -0.46, 0.2],
    2: [0.1, 0.44, 0.12],
    3: [0.28, -0.44, 0.08],
  };

  hydroxyls.forEach((carbonIndex) => {
    parts.push(
      buildHydroxyl(
        `triose-hydroxyl-c${carbonIndex}`,
        `c${carbonIndex}`,
        positions[`c${carbonIndex}`],
        hydroxylDirections[carbonIndex],
      ),
    );
  });

  const merged = mergeParts(parts);

  return new Molecule({
    id,
    name,
    formula,
    category: 'triose',
    description,
    atoms: merged.atoms,
    bonds: merged.bonds,
    functionalGroups: merged.functionalGroups,
    energyState,
    metadata,
  });
};

const buildATP = ({ id, name, formula, phosphates = 3, energyState, description, metadata }) => {
  const baseAtoms = [
    atom('n1', 'N', [-1.7, 0.65, 0], 'electronCarrier'),
    atom('c1', 'C', [-1.15, 1.1, 0.22], 'electronCarrier'),
    atom('n2', 'N', [-0.45, 0.76, -0.16], 'electronCarrier'),
    atom('c2', 'C', [-0.58, 0.05, 0.22], 'electronCarrier'),
    atom('c3', 'C', [-1.38, -0.02, -0.1], 'electronCarrier'),
    atom('c4', 'C', [-1.78, 0.42, 0.16], 'electronCarrier'),
    atom('c5', 'C', [0.36, 0.1, 0], 'backbone'),
    atom('c6', 'C', [1.12, -0.38, 0.18], 'backbone'),
  ];

  const baseBonds = [
    bond('base-b1', 'n1', 'c1'),
    bond('base-b2', 'c1', 'n2'),
    bond('base-b3', 'n2', 'c2'),
    bond('base-b4', 'c2', 'c3'),
    bond('base-b5', 'c3', 'c4'),
    bond('base-b6', 'c4', 'n1'),
    bond('base-b7', 'c2', 'c5'),
    bond('base-b8', 'c5', 'c6'),
  ];

  const phosphateAnchors = [
    [1.85, -0.12, 0],
    [2.85, -0.12, 0],
    [3.9, -0.12, 0],
  ].slice(0, phosphates);

  const phosphateParts = phosphateAnchors.map((anchor, index) =>
    buildPhosphate(`atp-phosphate-${index + 1}`, anchor, 0.24),
  );

  const connectingBonds = phosphateParts.map((part, index) =>
    bond(
      `atp-link-${index + 1}`,
      index === 0 ? 'c6' : phosphateParts[index - 1].phosphorusId,
      part.phosphorusId,
    ),
  );

  const merged = mergeParts([
    { atoms: baseAtoms, bonds: [...baseBonds, ...connectingBonds] },
    ...phosphateParts,
  ]);

  return new Molecule({
    id,
    name,
    formula,
    category: 'carrier',
    description,
    atoms: merged.atoms,
    bonds: merged.bonds,
    functionalGroups: [
      ...merged.functionalGroups,
      functionalGroup(
        'nucleotide-group',
        'Adenosine scaffold',
        'electronCarrier',
        ['n1', 'c1', 'n2', 'c2', 'c3', 'c4', 'c5', 'c6'],
        [0, 0.4, 0],
        'Nucleotide platform that presents the alpha-beta-gamma phosphate chain.',
      ),
    ],
    energyState,
    metadata,
  });
};

const buildNAD = ({ id, reduced = false, description, metadata }) => {
  const atoms = [
    atom('n1', 'N', [-2.2, 0.42, 0], 'electronCarrier'),
    atom('c1', 'C', [-1.5, 0.92, 0.14], 'electronCarrier'),
    atom('c2', 'C', [-0.76, 0.46, -0.16], 'electronCarrier'),
    atom('n2', 'N', [-0.84, -0.34, 0.12], 'electronCarrier'),
    atom('c3', 'C', [-1.68, -0.42, 0], 'electronCarrier'),
    atom('c4', 'C', [-2.25, -0.02, 0.12], 'electronCarrier'),
    atom('p1', 'P', [-0.1, 0.02, 0], 'phosphate'),
    atom('p2', 'P', [0.95, 0.02, 0], 'phosphate'),
    atom('n3', 'N', [1.95, 0.52, 0], 'electronCarrier'),
    atom('c5', 'C', [2.68, 0.94, -0.14], 'electronCarrier'),
    atom('c6', 'C', [3.46, 0.5, 0.18], 'electronCarrier'),
    atom('n4', 'N', [3.34, -0.3, -0.12], 'electronCarrier'),
    atom('c7', 'C', [2.48, -0.36, 0.14], 'electronCarrier'),
    atom('c8', 'C', [1.88, 0.06, -0.12], 'electronCarrier'),
  ];

  const bonds = [
    bond('nad-b1', 'n1', 'c1'),
    bond('nad-b2', 'c1', 'c2'),
    bond('nad-b3', 'c2', 'n2'),
    bond('nad-b4', 'n2', 'c3'),
    bond('nad-b5', 'c3', 'c4'),
    bond('nad-b6', 'c4', 'n1'),
    bond('nad-b7', 'c2', 'p1'),
    bond('nad-b8', 'p1', 'p2'),
    bond('nad-b9', 'p2', 'n3'),
    bond('nad-b10', 'n3', 'c5'),
    bond('nad-b11', 'c5', 'c6'),
    bond('nad-b12', 'c6', 'n4'),
    bond('nad-b13', 'n4', 'c7'),
    bond('nad-b14', 'c7', 'c8'),
    bond('nad-b15', 'c8', 'n3'),
  ];

  return new Molecule({
    id,
    name: reduced ? 'NADH' : 'NAD+',
    formula: reduced ? 'C21H27N7O14P2' : 'C21H26N7O14P2',
    category: 'carrier',
    description,
    atoms,
    bonds,
    functionalGroups: [
      functionalGroup(
        'redox-ring',
        reduced ? 'Reduced nicotinamide ring' : 'Oxidized nicotinamide ring',
        'electronCarrier',
        ['n3', 'c5', 'c6', 'n4', 'c7', 'c8'],
        [2.6, 0.3, 0],
        reduced
          ? 'Electron-rich state after hydride transfer from glyceraldehyde-3-phosphate.'
          : 'Electron-accepting state poised to capture a hydride.',
      ),
      functionalGroup(
        'pyrophosphate-bridge',
        'Pyrophosphate bridge',
        'phosphate',
        ['p1', 'p2'],
        [0.4, 0.02, 0],
        'Phosphate linkage joining the two nucleotide halves of NAD.',
      ),
    ],
    energyState: reduced ? 'reduced' : 'oxidized',
    metadata,
  });
};

const buildSimpleIon = ({ id, name, formula, element, description, metadata = {} }) =>
  new Molecule({
    id,
    name,
    formula,
    category: 'ion',
    description,
    atoms: [atom('core', element, [0, 0, 0], 'backbone')],
    bonds: [],
    functionalGroups: [],
    energyState: 'charged',
    metadata,
  });

const buildWater = () =>
  new Molecule({
    id: 'water',
    name: 'Water',
    formula: 'H2O',
    category: 'small-molecule',
    description: 'Water released during enolase-catalyzed dehydration.',
    atoms: [
      atom('o', 'O', [0, 0, 0], 'hydroxyl'),
      atom('h1', 'H', [0.44, 0.22, 0], 'hydroxyl'),
      atom('h2', 'H', [-0.32, 0.28, 0.18], 'hydroxyl'),
    ],
    bonds: [bond('w-b1', 'o', 'h1'), bond('w-b2', 'o', 'h2')],
    functionalGroups: [],
    metadata: {
      role: 'Leaving group',
      atomsMode: 'Bent water geometry',
    },
  });

const moleculeTemplates = {
  glucose: () =>
    buildHexoseRing({
      id: 'glucose',
      name: 'Glucose',
      formula: 'C6H12O6',
      description: 'Six-carbon aldohexose shown in its cyclic pyranose form before phosphorylation.',
      metadata: {
        atomsMode: 'Pyranose ring with exocyclic C6 alcohol',
        reactionRole: 'Primary carbon fuel',
        structureClass: 'Cyclic aldohexose',
      },
    }),
  g6p: () =>
    buildHexoseRing({
      id: 'g6p',
      name: 'Glucose-6-phosphate',
      formula: 'C6H13O9P',
      phosphates: [6],
      energyState: 'phosphorylated',
      description: 'Cyclic glucose bearing a phosphate ester at carbon 6.',
      metadata: {
        atomsMode: 'Pyranose ring + phosphate ester on C6',
        reactionRole: 'Committed intracellular intermediate',
        structureClass: 'Phosphorylated aldohexose',
      },
    }),
  f6p: () =>
    buildLinearKetoseHexose({
      id: 'f6p',
      name: 'Fructose-6-phosphate',
      formula: 'C6H13O9P',
      phosphates: [6],
      energyState: 'phosphorylated',
      description: 'Ketose scaffold with a C2 carbonyl and a phosphate ester at carbon 6.',
      metadata: {
        atomsMode: 'Open-chain ketose with terminal phosphate',
        reactionRole: 'PFK substrate',
        structureClass: 'Phosphorylated ketohexose',
      },
    }),
  f16bp: () =>
    buildLinearKetoseHexose({
      id: 'f16bp',
      name: 'Fructose-1,6-bisphosphate',
      formula: 'C6H14O12P2',
      phosphates: [1, 6],
      energyState: 'high',
      description: 'Activated ketohexose with phosphate esters on carbons 1 and 6.',
      metadata: {
        atomsMode: 'Open-chain bisphosphorylated ketose',
        reactionRole: 'Aldolase cleavage substrate',
        structureClass: 'Activated bisphosphate',
      },
    }),
  dhap: () =>
    buildTrioseIntermediate({
      id: 'dhap',
      name: 'Dihydroxyacetone phosphate',
      formula: 'C3H7O6P',
      carbonylAt: 2,
      phosphates: [3],
      hydroxyls: [1],
      description: 'Ketotriose phosphate generated by aldolase cleavage.',
      metadata: {
        atomsMode: 'Open-chain ketotriose phosphate',
        reactionRole: 'Convertible triose pool',
        structureClass: 'Ketotriose',
      },
    }),
  g3p: () =>
    buildTrioseIntermediate({
      id: 'g3p',
      name: 'Glyceraldehyde-3-phosphate',
      formula: 'C3H7O6P',
      carbonylAt: 1,
      phosphates: [3],
      hydroxyls: [2],
      description: 'Aldotriose phosphate that feeds the payoff phase.',
      metadata: {
        atomsMode: 'Open-chain aldotriose phosphate',
        reactionRole: 'Payoff-phase entry intermediate',
        structureClass: 'Aldotriose',
      },
    }),
  bpg13: () =>
    buildTrioseIntermediate({
      id: 'bpg13',
      name: '1,3-Bisphosphoglycerate',
      formula: 'C3H8O10P2',
      acylPhosphateAt: 1,
      phosphates: [3],
      hydroxyls: [2],
      energyState: 'high',
      description: 'Acyl phosphate plus terminal phosphate create a high-energy bisphosphate intermediate.',
      metadata: {
        atomsMode: 'Acyl phosphate + terminal phosphate',
        reactionRole: 'ATP-generating phosphate donor',
        structureClass: 'High-energy acyl phosphate',
      },
    }),
  pg3: () =>
    buildTrioseIntermediate({
      id: 'pg3',
      name: '3-Phosphoglycerate',
      formula: 'C3H7O7P',
      carboxylate: true,
      phosphates: [3],
      hydroxyls: [2],
      description: 'Carboxylate-containing glycerate after ATP has been generated.',
      metadata: {
        atomsMode: 'Carboxylate glycerate with phosphate on C3',
        reactionRole: 'Mutase substrate',
        structureClass: 'Phosphoglycerate',
      },
    }),
  pg2: () =>
    buildTrioseIntermediate({
      id: 'pg2',
      name: '2-Phosphoglycerate',
      formula: 'C3H7O7P',
      carboxylate: true,
      phosphates: [2],
      hydroxyls: [3],
      description: 'Phosphate migration to carbon 2 prepares the substrate for dehydration.',
      metadata: {
        atomsMode: 'Carboxylate glycerate with phosphate on C2',
        reactionRole: 'Enolase substrate',
        structureClass: 'Repositioned phosphoglycerate',
      },
    }),
  pep: () =>
    buildTrioseIntermediate({
      id: 'pep',
      name: 'Phosphoenolpyruvate',
      formula: 'C3H5O6P',
      carboxylate: true,
      phosphates: [2],
      doubleBond: ['c2', 'c3'],
      energyState: 'high',
      description: 'Enol phosphate whose double bond and phosphate ester create exceptional transfer potential.',
      metadata: {
        atomsMode: 'Enol phosphate with terminal carboxylate',
        reactionRole: 'Pyruvate kinase substrate',
        structureClass: 'High-energy enol phosphate',
      },
    }),
  pyruvate: () =>
    buildTrioseIntermediate({
      id: 'pyruvate',
      name: 'Pyruvate',
      formula: 'C3H3O3',
      carboxylate: true,
      carbonylAt: 2,
      description: 'Alpha-keto acid formed after phosphate transfer and enol-to-keto tautomerization.',
      metadata: {
        atomsMode: 'Alpha-keto acid',
        reactionRole: 'Pathway output',
        structureClass: 'Pyruvate',
      },
    }),
  atp: () =>
    buildATP({
      id: 'atp',
      name: 'ATP',
      formula: 'C10H16N5O13P3',
      phosphates: 3,
      energyState: 'high',
      description: 'Triphosphate nucleotide with a detachable gamma phosphate.',
      metadata: {
        reactionRole: 'Phosphate donor',
        atomsMode: 'Nucleotide with alpha-beta-gamma phosphates',
      },
    }),
  adp: () =>
    buildATP({
      id: 'adp',
      name: 'ADP',
      formula: 'C10H15N5O10P2',
      phosphates: 2,
      energyState: 'lower',
      description: 'Diphosphate nucleotide awaiting rephosphorylation.',
      metadata: {
        reactionRole: 'Phosphate acceptor',
        atomsMode: 'Nucleotide with two phosphates',
      },
    }),
  nad: () =>
    buildNAD({
      id: 'nad',
      reduced: false,
      description: 'Oxidized electron carrier that accepts a hydride during step 6.',
      metadata: {
        reactionRole: 'Hydride acceptor',
        atomsMode: 'Dinucleotide redox cofactor',
      },
    }),
  nadh: () =>
    buildNAD({
      id: 'nadh',
      reduced: true,
      description: 'Reduced electron carrier carrying high-energy electrons.',
      metadata: {
        reactionRole: 'Reduced electron carrier',
        atomsMode: 'Reduced dinucleotide redox cofactor',
      },
    }),
  mg: () =>
    buildSimpleIon({
      id: 'mg',
      name: 'Mg2+',
      formula: 'Mg2+',
      element: 'Mg',
      description: 'Divalent ion that shields ATP phosphates in kinase active sites.',
      metadata: {
        reactionRole: 'Catalytic metal ion',
      },
    }),
  pi: () =>
    buildSimpleIon({
      id: 'pi',
      name: 'Pi',
      formula: 'PO4^3-',
      element: 'P',
      description: 'Inorganic phosphate consumed during oxidation of G3P.',
      metadata: {
        reactionRole: 'Inorganic phosphate source',
      },
    }),
  water: () => buildWater(),
};

export const createMolecule = (key, instanceId = key) => moleculeTemplates[key]().clone(instanceId);
