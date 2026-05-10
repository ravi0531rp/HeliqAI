export class ReactionStep {
  constructor({
    id,
    index,
    title,
    stage,
    summary,
    substrates,
    products,
    enzyme,
    cofactors = [],
    mechanism = [],
    energyDelta = { atp: 0, nadh: 0 },
    notes = [],
    regulatory = false,
    articleStepLabel = '',
    articleSummary = '',
    repeatCount = 1,
    camera = {
      focus: [0, 0.5, 0],
      offset: [0, 4.4, 12.5],
    },
  }) {
    this.id = id;
    this.index = index;
    this.title = title;
    this.stage = stage;
    this.summary = summary;
    this.substrates = substrates;
    this.products = products;
    this.enzyme = enzyme;
    this.cofactors = cofactors;
    this.mechanism = mechanism;
    this.energyDelta = energyDelta;
    this.notes = notes;
    this.regulatory = regulatory;
    this.articleStepLabel = articleStepLabel;
    this.articleSummary = articleSummary;
    this.repeatCount = repeatCount;
    this.camera = camera;
  }
}
