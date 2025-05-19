import {
  sqliteTable,
  sqliteView,
  text,
  integer,
  real,
  index,
  union
} from "drizzle-orm/sqlite-core";
import { sql } from 'drizzle-orm'

// Central Factors data for the organization
export const factors = sqliteTable("factors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  subType: text("sub_type"),
  unit: text("unit").notNull(),
  factor: real("factor").notNull(),
});

// organization-specific factor data
export const orgFactors = sqliteTable("org_factors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orgId: text("org_id").notNull(),
  originalFactorId: integer("original_factor_id").references(() => factors.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  subType: text("sub_type").notNull(),
  unit: text("unit").notNull(),
  factor: real("factor").notNull(),
  isCustom: integer("is_custom", { mode: 'boolean' }).notNull().default(false)
});

// Define the collectedData table
export const collectedData = sqliteTable(
  "collected_data",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text("org_id").notNull(),
    factorId: integer("factor_id")
      .notNull()
      .references(() => factors.id), // Define foreign key inline
    isOrgFactor: integer("is_org_factor", { mode: 'boolean' }).notNull().default(false),
    recordedFactor: integer("recorded_factor").notNull(),
    value: integer("value").notNull(),
    timestamp: integer("timestamp")
      .notNull()
      .$defaultFn(() => (Date.now() / 1000) | 0),
  },
  (table) => [
    index("collected_data_org_id_idx").on(table.orgId),
    index("collected_data_factor_id_idx").on(table.factorId),
    index("collected_data_timestamp_idx").on(table.timestamp),
  ],
);

export const assets = sqliteTable("assets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  factor_id: integer("factor_id")
    .notNull()
    .references(() => factors.id),
  unit: text("unit").notNull(),
  conversion_rate: real("conversion_rate").notNull()
});

export const assetsData = sqliteTable(
  "assets_data",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text("org_id").notNull(),
    asset_id: text("asset_id")
      .notNull()
      .references(() => assets.id),
    value: integer("value").notNull(),
    recordedFactor: integer("recorded_factor").notNull(),
    timestamp: integer("timestamp")
      .notNull()
      .$defaultFn(() => (Date.now() / 1000) | 0)
  },
  (table) => [
    index("asset_data_org_id_idx").on(table.orgId),
    index("asset_data_asset_id_idx").on(table.asset_id),
  ],
);

export const offsetData = sqliteTable(
  "offset_data",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: text("org_id").notNull(),
    price_per_tco2e: real("price_per_tco2e").notNull(),
    tco2e: real("tco2e").notNull(),
    timestamp: integer("timestamp")
      .notNull()
      .$defaultFn(() => (Date.now() / 1000) | 0),
  },
  (table) => [
    index("offset_data_org_id_idx").on(table.orgId),
    index("offset_data_timestamp_idx").on(table.timestamp),
  ],
);

export const notebook = sqliteTable(
  "notebook",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    orgId: text("org_id").notNull(),
    userId: text("user_id").notNull(),
    shared: integer("shared", { mode: 'boolean' }),
    timestamp: integer("timestamp")
      .notNull()
      .$defaultFn(() => (Date.now() / 1000) | 0)
  },
  (table) => [
    index("notebook_org_id_idx").on(table.orgId),
    index("notebook_timestamp_idx").on(table.timestamp)
  ]
)

export const combinedFactorsView = sqliteView("combined_factors_view").as((qb) => {
  const centralFactors = qb
    .select({
      id: factors.id,
      factorOrgId: sql`NULL`.as("factor_org_id"),
      name: factors.name,
      type: factors.type,
      subType: factors.subType,
      unit: factors.unit,
      factor: factors.factor,
      factorSource: sql`0`.as("factor_source"),
    })
    .from(factors);

  const orgSpecificFactors = qb
    .select({
      id: orgFactors.id,
      factorOrgId: orgFactors.orgId,
      name: orgFactors.name,
      type: orgFactors.type,
      subType: orgFactors.subType,
      unit: orgFactors.unit,
      factor: orgFactors.factor,
      factorSource: sql`1`.as("factor_source"),
    })
    .from(orgFactors);

  return union(centralFactors, orgSpecificFactors);
});

export type Notebook = typeof notebook.$inferSelect;

export type CollectedData = typeof collectedData.$inferSelect;

export interface CollectedDataWithEmission extends CollectedData {
  totalEmission: number;
}
