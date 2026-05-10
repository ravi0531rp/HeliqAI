import { centerOfAtoms } from '../../utils/chemistry';

export class Molecule {
  constructor({
    id,
    name,
    formula,
    category,
    description,
    atoms,
    bonds,
    functionalGroups,
    energyState = 'neutral',
    metadata = {},
  }) {
    this.id = id;
    this.name = name;
    this.formula = formula;
    this.category = category;
    this.description = description;
    this.atoms = atoms;
    this.bonds = bonds;
    this.functionalGroups = functionalGroups;
    this.energyState = energyState;
    this.metadata = metadata;
    this.center = centerOfAtoms(atoms);
  }

  clone(instanceId) {
    return new Molecule({
      id: `${this.id}-${instanceId}`,
      name: this.name,
      formula: this.formula,
      category: this.category,
      description: this.description,
      atoms: this.atoms.map((atom) => ({
        ...atom,
        id: `${instanceId}-${atom.id}`,
      })),
      bonds: this.bonds.map((bond) => ({
        ...bond,
        id: `${instanceId}-${bond.id}`,
        from: `${instanceId}-${bond.from}`,
        to: `${instanceId}-${bond.to}`,
      })),
      functionalGroups: this.functionalGroups.map((group) => ({
        ...group,
        id: `${instanceId}-${group.id}`,
        atomIds: group.atomIds.map((atomId) => `${instanceId}-${atomId}`),
      })),
      energyState: this.energyState,
      metadata: { ...this.metadata },
    });
  }
}
