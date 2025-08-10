

export type NormalizedTitle = {
  title: string;
  normalized: string;
};

export class ExperienceAiOutputNormalizer {
  private abbreviations: Record<string, string>;
  private stopwords: Set<string>;
  private debug: boolean;

  constructor(debug = false) {
    this.abbreviations = {
      sr: "senior",
      "sr.": "senior",
      svp: "senior vice president",
      vp: "vice president",
      mgr: "manager",
      ceo: "chief executive officer",
      cfo: "chief financial officer",
      cto: "chief technology officer",
      coo: "chief operating officer",
      jr: "junior",
      "jr.": "junior",
      eng: "engineer",
      swe: "software engineer",
      dev: "developer",
      ux: "user experience",
      ui: "user interface",
    };

    this.stopwords = new Set([
      "at",
      "with",
      "for",
      "and",
      "of",
      "on",
      "in",
      "to",
      "from",
      "by",
      "the",
      "retired",
      "student",
      "independent",
      "aspiring",
      "semi",
      "seeking",
    ]);

    this.debug = debug;
  }

  public normalize(input: string): NormalizedTitle {
    const steps: string[] = [];
    let title = input;

    // 1. Lowercase
    title = title.toLowerCase();
    steps.push(`Lowercase: ${title}`);

    // 2. Remove punctuation/special characters
    title = title.replace(/[^a-z0-9\s]/g, " ");
    steps.push(`Removed punctuation: ${title}`);

    // 3. Strip company name suffix
    title = title.split(/\s+at\s+|\s*@\s+|\s*\|\s*|\/|\s+-\s+/)[0];
    steps.push(`Stripped suffix/company: ${title}`);

    // 4. Collapse multiple spaces
    title = title.replace(/\s+/g, " ").trim();
    steps.push(`Normalized whitespace: ${title}`);

    // 5. Expand abbreviations
    title = title
      .split(" ")
      .map((word) => this.abbreviations[word] || word)
      .join(" ");
    steps.push(`Expanded abbreviations: ${title}`);

    // 6. Remove stopwords
    title = title
      .split(" ")
      .filter((word) => !this.stopwords.has(word))
      .join(" ");
    steps.push(`Removed stopwords: ${title}`);

    // 7. De-duplicate
    const seen = new Set<string>();
    title = title
      .split(" ")
      .filter((word) => {
        if (seen.has(word)) return false;
        seen.add(word);
        return true;
      })
      .join(" ");
    steps.push(`Deduplicated: ${title}`);

    if (this.debug) {
      console.info(`\n--- Debug for: "${input}" ---`);
      steps.forEach((step, i) => {
        console.info(`${i + 1}. ${step}`);
      });
    }

    return {
      title: input.trim(),
      normalized: title.trim(),
    };
  }

}

const normalizer = new ExperienceAiOutputNormalizer();
export function normalizeExperienceAiOutput(title: string): NormalizedTitle {
  return normalizer.normalize(title);
}
