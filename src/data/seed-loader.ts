// Seed loader: getCatalog() returns the static in-memory catalog for UI use.
// No default exports. TypeScript strict mode.

import type {
	Catalog,
	CatalogAction,
	CatalogCopy,
	CatalogSpendCategory,
	CatalogSpendDelayCard,
	CatalogSpendItemType,
	CatalogTrigger,
	CatalogUrgeKind,
} from "@/src/domain/types";

// ---------------------------------------------------------------------------
// Raw JSON shapes (camelCase as they appear on disk)
// ---------------------------------------------------------------------------

interface RawTrigger {
	id: string;
	label: string;
	description: string;
}

interface RawUrgeKind {
	id: string;
	label: string;
	help: string;
}

interface RawSpendCategory {
	id: string;
	label: string;
}

interface RawSpendItemType {
	id: string;
	label: string;
}

interface RawAction {
	id: string;
	minutes: number;
	title: string;
	steps: string[];
	tags: string[];
}

interface RawSpendDelayCard {
	id: string;
	title: string;
	body: string;
	ctaActionId: string;
}

interface RawCopy {
	[key: string]: string;
}

interface RawCatalog {
	version: string;
	localeDefault: string;
	triggers: RawTrigger[];
	urgeKinds: RawUrgeKind[];
	spendCategories: RawSpendCategory[];
	spendItemTypes: RawSpendItemType[];
	actions: RawAction[];
	spendDelayCards: RawSpendDelayCard[];
	copy: RawCopy;
	motivation_messages: string[];
}

// ---------------------------------------------------------------------------
// Load raw JSON (require for React Native bundler compatibility)
// ---------------------------------------------------------------------------

export type SeedLocale = "en" | "ja";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rawCatalogByLocale: Record<SeedLocale, RawCatalog> = {
	en: require("../../data/seed/catalog.json") as RawCatalog,
	ja: require("../../data/seed/catalog.ja.json") as RawCatalog,
};

function resolveSeedLocale(locale: string): SeedLocale {
	return locale === "ja" ? "ja" : "en";
}

// ---------------------------------------------------------------------------
// Mapping helpers: raw JSON (camelCase) -> domain types (snake_case)
// ---------------------------------------------------------------------------

function mapTrigger(raw: RawTrigger): CatalogTrigger {
	return { id: raw.id, label: raw.label };
}

function mapAction(raw: RawAction): CatalogAction {
	return {
		id: raw.id,
		action_type: raw.tags[0] ?? "general",
		title: raw.title,
		body: raw.steps.join("\n"),
		est_seconds: raw.minutes * 60,
	};
}

function mapUrgeKind(raw: RawUrgeKind): CatalogUrgeKind {
	// UrgeKind union is enforced by the domain type; cast is safe given seeded data.
	return { id: raw.id as CatalogUrgeKind["id"], label: raw.label };
}

function mapSpendCategory(raw: RawSpendCategory): CatalogSpendCategory {
	return { id: raw.id as CatalogSpendCategory["id"], label: raw.label };
}

function mapSpendItemType(raw: RawSpendItemType): CatalogSpendItemType {
	return { id: raw.id as CatalogSpendItemType["id"], label: raw.label };
}

function mapSpendDelayCard(raw: RawSpendDelayCard): CatalogSpendDelayCard {
	return {
		id: raw.id,
		action_id: raw.ctaActionId,
		title: raw.title,
		body: raw.body,
	};
}

function mapCopy(raw: RawCopy): CatalogCopy {
	return { ...raw };
}

// ---------------------------------------------------------------------------
// Memoized, mapped catalog (one per locale)
// ---------------------------------------------------------------------------

const _catalogByLocale = new Map<SeedLocale, Catalog>();

/**
 * Returns the typed Catalog object derived from catalog.json (or catalog.ja.json).
 * The result is memoized per locale after the first call.
 */
export function getCatalog(locale: string = "en"): Catalog {
	const seedLocale = resolveSeedLocale(locale);
	const cached = _catalogByLocale.get(seedLocale);
	if (cached !== undefined) {
		return cached;
	}

	const rawCatalog = rawCatalogByLocale[seedLocale];
	const catalog: Catalog = {
		triggers: rawCatalog.triggers.map(mapTrigger),
		actions: rawCatalog.actions.map(mapAction),
		urge_kinds: rawCatalog.urgeKinds.map(mapUrgeKind),
		spend_categories: rawCatalog.spendCategories.map(mapSpendCategory),
		spend_item_types: rawCatalog.spendItemTypes.map(mapSpendItemType),
		spend_delay_cards: rawCatalog.spendDelayCards.map(mapSpendDelayCard),
		copy: mapCopy(rawCatalog.copy),
		motivation_messages: rawCatalog.motivation_messages ?? [],
	};

	_catalogByLocale.set(seedLocale, catalog);
	return catalog;
}
