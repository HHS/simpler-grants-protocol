/** Minimum shape every catalog item must satisfy */
export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  tags: string[];
  rawSchema: Record<string, unknown>;
}

/** A generic catalog map */
export type CatalogMap<T extends CatalogItem> = Record<string, T>;

/** A single stat shown below the card grid */
export interface CatalogStat {
  count: number;
  label: string;
}

/** A single filter dropdown definition */
export interface CatalogFilter {
  id: string;
  label: string;
  options: string[];
  /** Maps to the data-* attribute on .catalog-card used for filtering */
  dataAttribute: string;
  placeholder: string;
}
