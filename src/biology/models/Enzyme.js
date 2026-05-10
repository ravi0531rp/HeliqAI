export class Enzyme {
  constructor({
    id,
    name,
    description,
    activeSite = [0, 0.3, 0],
    regulatoryRole = null,
    catalyticNote = '',
    aliases = [],
    regulation = '',
    articleSummary = '',
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.activeSite = activeSite;
    this.regulatoryRole = regulatoryRole;
    this.catalyticNote = catalyticNote;
    this.aliases = aliases;
    this.regulation = regulation;
    this.articleSummary = articleSummary;
  }
}
