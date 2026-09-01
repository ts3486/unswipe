// Ship-checklist: forbidden wording scan.
//
// CLAUDE.md hard constraints:
//   - No explicit sexual wording
//   - No cure/treatment language
//   - No perfect blocking claims
//   - No relationship/dating coaching claims
//   - No forced lockout language
//
// This test collects every piece of user-facing text from the seed files and
// checks none of the forbidden patterns appear.

/* eslint-disable @typescript-eslint/no-var-requires */
const catalog = require("@/data/seed/catalog.json") as Record<string, unknown>;
const catalogJa = require("@/data/seed/catalog.ja.json") as Record<
	string,
	unknown
>;

// ---------------------------------------------------------------------------
// Text extraction helpers
// ---------------------------------------------------------------------------

function collectCatalogText(
	source: Record<string, unknown> = catalog,
): string[] {
	const texts: string[] = [];

	// triggers
	const triggers = source.triggers as Array<{
		label: string;
		description: string;
	}>;
	for (const t of triggers) {
		texts.push(t.label, t.description);
	}

	// urgeKinds
	const urgeKinds = source.urgeKinds as Array<{ label: string; help: string }>;
	for (const u of urgeKinds) {
		texts.push(u.label, u.help);
	}

	// spendCategories
	const spendCategories = source.spendCategories as Array<{ label: string }>;
	for (const c of spendCategories) {
		texts.push(c.label);
	}

	// spendItemTypes
	const spendItemTypes = source.spendItemTypes as Array<{ label: string }>;
	for (const s of spendItemTypes) {
		texts.push(s.label);
	}

	// actions
	const actions = source.actions as Array<{ title: string; steps: string[] }>;
	for (const a of actions) {
		texts.push(a.title, ...a.steps);
	}

	// spendDelayCards
	const cards = source.spendDelayCards as Array<{
		title: string;
		body: string;
	}>;
	for (const card of cards) {
		texts.push(card.title, card.body);
	}

	// copy strings
	const copy = source.copy as Record<string, string>;
	if (copy) {
		texts.push(...Object.values(copy));
	}

	return texts.filter(Boolean);
}

function allSeedText(): string {
	return collectCatalogText().join("\n");
}

function allSeedTextJa(): string {
	return collectCatalogText(catalogJa).join("\n");
}

// ---------------------------------------------------------------------------
// Pattern definitions
// ---------------------------------------------------------------------------

/**
 * Explicit sexual wording — broadly matches common explicit terms.
 * The app must not use these in user-facing copy.
 */
const SEXUAL_WORDING_PATTERN =
	/\b(sex(?:ual(?:ly)?|ually|ualize[sd]?)?|erotic(?:ally)?|porn(?:ographic)?|nude|naked(?:ly)?|nsfw)\b/i;

/**
 * Cure or treatment claims — the app is not medical/therapy and must not
 * claim to cure or treat any condition.
 */
const CURE_TREATMENT_PATTERN =
	/\b(cure[sd]?|curing|treatment|treating|treats|therapy|therapist|diagnos(?:e[sd]?|is|tic)?|prescri(?:be[sd]?|ption))\b/i;

/**
 * Perfect blocking claims — must not promise perfect or guaranteed prevention.
 */
const PERFECT_BLOCKING_PATTERN =
	/\b(perfect(?:ly)?|guaranteed?|100%)\s+(block|stop|prevent|eliminat|remov)[a-z]*/i;

/**
 * Coaching — must not position the app as a relationship or dating coach.
 * Narrow regex: only flags "coach" when adjacent to relationship/dating context.
 */
const DATING_COACHING_PATTERN =
	/\b(?:relationship|dating)\s+coach(?:ing|es|ed|er)?/i;

/**
 * Forced lockout — must not describe or promise forced blocking/lockout mechanisms.
 */
const FORCED_LOCKOUT_PATTERN =
	/\b(?:forced?|involuntary)\s+(?:lock(?:out|ed|s)?|block(?:ed|s)?|prevent(?:ed|s)?)/i;

// ---------------------------------------------------------------------------
// Pattern definitions — Japanese equivalents
// (Japanese has no reliable word-boundary character, so \b is not used;
// patterns instead match forbidden terms directly, optionally allowing an
// adjacent intensifier for the "perfect blocking" / "forced lockout" cases.)
// ---------------------------------------------------------------------------

const SEXUAL_WORDING_PATTERN_JA = /(性的|セックス|エロ|ポルノ|ヌード|裸)/;

const CURE_TREATMENT_PATTERN_JA = /(治療|治す|治せ|セラピー|療法|診断|処方)/;

const PERFECT_BLOCKING_PATTERN_JA =
	/(完全に|絶対に|100%)(ブロック|遮断|阻止|防止|防げ)/;

const DATING_COACHING_PATTERN_JA = /(恋愛|デート|婚活)コーチ/;

const FORCED_LOCKOUT_PATTERN_JA = /強制(的)?(に)?(ロック|ブロック|遮断)/;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Forbidden wording scan — catalog.json", () => {
	let catalogText: string;

	beforeAll(() => {
		catalogText = collectCatalogText().join("\n");
	});

	it("contains no explicit sexual wording", () => {
		const match = catalogText.match(SEXUAL_WORDING_PATTERN);
		expect(match).toBeNull();
	});

	it("contains no cure/treatment claims", () => {
		const match = catalogText.match(CURE_TREATMENT_PATTERN);
		expect(match).toBeNull();
	});

	it("contains no perfect blocking claims", () => {
		const match = catalogText.match(PERFECT_BLOCKING_PATTERN);
		expect(match).toBeNull();
	});

	it("contains no relationship/dating coaching claims", () => {
		const match = catalogText.match(DATING_COACHING_PATTERN);
		expect(match).toBeNull();
	});

	it("contains no forced lockout language", () => {
		const match = catalogText.match(FORCED_LOCKOUT_PATTERN);
		expect(match).toBeNull();
	});
});

describe("Forbidden wording scan — all seed text combined", () => {
	it("passes all forbidden-wording checks end-to-end", () => {
		const text = allSeedText();
		expect(text.match(SEXUAL_WORDING_PATTERN)).toBeNull();
		expect(text.match(CURE_TREATMENT_PATTERN)).toBeNull();
		expect(text.match(PERFECT_BLOCKING_PATTERN)).toBeNull();
		expect(text.match(DATING_COACHING_PATTERN)).toBeNull();
		expect(text.match(FORCED_LOCKOUT_PATTERN)).toBeNull();
	});
});

describe("Forbidden wording scan — catalog.ja.json", () => {
	let catalogText: string;

	beforeAll(() => {
		catalogText = collectCatalogText(catalogJa).join("\n");
	});

	it("contains no explicit sexual wording", () => {
		const match = catalogText.match(SEXUAL_WORDING_PATTERN_JA);
		expect(match).toBeNull();
	});

	it("contains no cure/treatment claims", () => {
		const match = catalogText.match(CURE_TREATMENT_PATTERN_JA);
		expect(match).toBeNull();
	});

	it("contains no perfect blocking claims", () => {
		const match = catalogText.match(PERFECT_BLOCKING_PATTERN_JA);
		expect(match).toBeNull();
	});

	it("contains no relationship/dating coaching claims", () => {
		const match = catalogText.match(DATING_COACHING_PATTERN_JA);
		expect(match).toBeNull();
	});

	it("contains no forced lockout language", () => {
		const match = catalogText.match(FORCED_LOCKOUT_PATTERN_JA);
		expect(match).toBeNull();
	});
});

describe("Forbidden wording scan — all Japanese seed text combined", () => {
	it("passes all forbidden-wording checks end-to-end", () => {
		const text = allSeedTextJa();
		expect(text.match(SEXUAL_WORDING_PATTERN_JA)).toBeNull();
		expect(text.match(CURE_TREATMENT_PATTERN_JA)).toBeNull();
		expect(text.match(PERFECT_BLOCKING_PATTERN_JA)).toBeNull();
		expect(text.match(DATING_COACHING_PATTERN_JA)).toBeNull();
		expect(text.match(FORCED_LOCKOUT_PATTERN_JA)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Regression: ensure the patterns themselves are not broken
// (meta-tests that verify the patterns catch what they should)
// ---------------------------------------------------------------------------

describe("Pattern sanity checks", () => {
	it('SEXUAL_WORDING_PATTERN catches "sexual"', () => {
		expect("sexual content".match(SEXUAL_WORDING_PATTERN)).not.toBeNull();
	});

	it('CURE_TREATMENT_PATTERN catches "cure"', () => {
		expect("this will cure you".match(CURE_TREATMENT_PATTERN)).not.toBeNull();
	});

	it('CURE_TREATMENT_PATTERN catches "treatment"', () => {
		expect("treatment plan".match(CURE_TREATMENT_PATTERN)).not.toBeNull();
	});

	it('PERFECT_BLOCKING_PATTERN catches "perfectly blocks"', () => {
		expect(
			"perfectly blocks all urges".match(PERFECT_BLOCKING_PATTERN),
		).not.toBeNull();
	});

	it('DATING_COACHING_PATTERN catches "dating coaching"', () => {
		expect(
			"dating coaching service".match(DATING_COACHING_PATTERN),
		).not.toBeNull();
	});

	it('FORCED_LOCKOUT_PATTERN catches "forced lockout"', () => {
		expect(
			"forced lockout feature".match(FORCED_LOCKOUT_PATTERN),
		).not.toBeNull();
	});

	it("SEXUAL_WORDING_PATTERN_JA catches 性的", () => {
		expect("性的なコンテンツ".match(SEXUAL_WORDING_PATTERN_JA)).not.toBeNull();
	});

	it("CURE_TREATMENT_PATTERN_JA catches 治療", () => {
		expect(
			"これは治療になります".match(CURE_TREATMENT_PATTERN_JA),
		).not.toBeNull();
	});

	it("PERFECT_BLOCKING_PATTERN_JA catches 完全にブロック", () => {
		expect(
			"衝動を完全にブロックします".match(PERFECT_BLOCKING_PATTERN_JA),
		).not.toBeNull();
	});

	it("DATING_COACHING_PATTERN_JA catches 恋愛コーチ", () => {
		expect(
			"恋愛コーチングサービス".match(DATING_COACHING_PATTERN_JA),
		).not.toBeNull();
	});

	it("FORCED_LOCKOUT_PATTERN_JA catches 強制ブロック", () => {
		expect(
			"強制的にブロックする機能".match(FORCED_LOCKOUT_PATTERN_JA),
		).not.toBeNull();
	});
});
