import { logger } from "./logger";
export type NormalizedEdu = {
    education: string;
    normalized: string;
};

export class EducationKeyNormalizer {
    private abbreviations: Record<string, string>;
    private stopwords: Set<string>;
    private minTokenLen: number;
    private debug: boolean;

    constructor(debug = false) {
        this.abbreviations = {
            // Degree levels
            "b.sc": "bsc", "bsc": "bsc", "bs": "bsc", "ba": "ba",
            "b.eng": "beng", "beng": "beng", "btech": "btech", "b.tech": "btech",
            "m.sc": "msc", "msc": "msc", "ms": "msc", "ma": "ma", "meng": "meng",
            "mba": "mba",
            "ph.d": "phd", "phd": "phd", "dphil": "phd",
            "llb": "llb", "jd": "jd", "md": "md", "bds": "bds",
            "pgdip": "pgdip", "pg dip": "pgdip", "pgcert": "pgcert", "pg cert": "pgcert",
            "hons": "hons", "(hons)": "hons", "honours": "hons", "honors": "hons",

            // Majors (common short forms)
            "cs": "computer science",
            "comp": "computer",
            "comp sci": "computer science",
            "it": "information technology",
            "is": "information systems",
            "se": "software engineering",
            "ee": "electrical engineering",
            "ece": "electrical computer engineering",
            "me": "mechanical engineering",
            "ce": "civil engineering",
            "chem eng": "chemical engineering",
            "biz": "business",
            "hr": "human resources",
            "fin": "finance",
            "acct": "accounting",
            "ai": "artificial intelligence",
            "ml": "machine learning",
        };

        // Words that add noise to cache keys
        this.stopwords = new Set([
            "degree", "degrees", "in", "of", "with", "and", "&", "the",
            "major", "minor", "program", "programme", "track", "option",
            "school", "college", "university", "dept", "department",
            "at", "@", "|", "-", "/", "\\",
        ]);

        // Ignore super-short tokens after cleanup (e.g., “a”, “an”)
        this.minTokenLen = 2;
        this.debug = debug;
    }

    public normalizeKey(input: string): NormalizedEdu {
        const steps: string[] = [];
        const log = (s: string) => { if (this.debug) steps.push(s); };

        // 1) lowercase + unicode normalize + strip diacritics
        let s = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        log(`lower+diacritics: ${s}`);

        // 2) remove punctuation except spaces and dashes (we'll split on dashes later)
        s = s.replace(/[()_,.;:]/g, " ");
        s = s.replace(/\s*&\s*/g, " and ");
        s = s.replace(/[^a-z0-9\u0600-\u06FF\s\-]/g, " "); // keep Arabic block
        s = s.replace(/\s+/g, " ").trim();
        log(`punct/space: ${s}`);

        // 3) strip org/suffix like " - Harvard", " | Coursera", "/ Edx", " at MIT"
        s = s.split(/\s+at\s+|\s*@\s+|\s+\|\s+|\/\s*|-\s+/)[0].trim();
        log(`strip-suffix: ${s}`);

        // 4) expand abbreviations token-by-token
        s = s.split(/\s+/)
            .map(t => this.abbreviations[t] ?? t)
            .join(" ");
        log(`abbr-expanded: ${s}`);

        // 5) remove stopwords + short tokens
        const tokens = s.split(/\s+/).filter(t =>
            !this.stopwords.has(t) && t.length >= this.minTokenLen
        );
        log(`stopword/short-removed: ${tokens.join(" ")}`);

        // 6) de-duplicate tokens while preserving order
        const seen = new Set<string>();
        const deduped = tokens.filter(t => (seen.has(t) ? false : (seen.add(t), true)));
        log(`deduped: ${deduped.join(" ")}`);

        // 7) final collapse
        const body = deduped.join(" ").trim();

        if (this.debug) {
            // eslint-disable-next-line no-console
            logger.info(`\n--- EducationKey Debug: "${input}" ---`);
            steps.forEach((stp, i) => logger.info(`${i + 1}. ${stp}`));
            logger.info(`→ key: edu:${body}`);
        }

        return {
            education: input,
            normalized: body
        }
    }

}

// Convenience singleton
const eduKey = new EducationKeyNormalizer();
export const normalizeEducationCacheKey = (s: string) => { logger.info(s); 
    return eduKey.normalizeKey(s) };

