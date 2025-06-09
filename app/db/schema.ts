import {
  pgTable,
  varchar,
  serial,
  real,
  index,
  boolean,
  integer,
  timestamp,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";

export const factors = pgTable(
  "factors",
  {
    id: serial("id").primaryKey(),
    orgId: varchar("org_id", { length: 255 }), // NULL for central factors
    originalFactorId: integer("original_factor_id"),
    name: varchar("name", { length: 255 }).notNull(),
    type: varchar("type", { length: 255 }).notNull(),
    subType: varchar("sub_type", { length: 255 }),
    unit: varchar("unit", { length: 255 }).notNull(),
    factor: real("factor").notNull(),
    isCustom: boolean("is_custom").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("factors_org_type_idx").on(table.orgId, table.type),
    index("factors_type_idx").on(table.type),
  ],
);

// Define the collectedData table
export const collectedData = pgTable(
  "collected_data",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: varchar("org_id", { length: 255 }).notNull(),
    factorId: integer("factor_id")
      .notNull()
      .references(() => factors.id),
    recordedFactor: real("recorded_factor").notNull(),
    value: real("value").notNull(),
    timestamp: timestamp("timestamp", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("collected_data_org_id_idx").on(table.orgId),
    index("collected_data_factor_id_idx").on(table.factorId),
    index("collected_data_timestamp_idx").on(table.timestamp),
  ],
);

export const assets = pgTable("assets", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }).notNull(),
  factor_id: integer("factor_id")
    .notNull()
    .references(() => factors.id),
  unit: varchar("unit", { length: 255 }).notNull(),
  conversion_rate: real("conversion_rate").notNull(),
});

export const assetsData = pgTable(
  "assets_data",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: varchar("org_id", { length: 255 }).notNull(),
    asset_id: varchar("asset_id", { length: 255 })
      .notNull()
      .references(() => assets.id),
    value: integer("value").notNull(),
    recordedFactor: integer("recorded_factor").notNull(),
    timestamp: timestamp("timestamp", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("asset_data_org_id_idx").on(table.orgId),
    index("asset_data_asset_id_idx").on(table.asset_id),
  ],
);

export const offsetData = pgTable(
  "offset_data",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    orgId: varchar("org_id", { length: 255 }).notNull(),
    price_per_tco2e: real("price_per_tco2e").notNull(),
    tco2e: real("tco2e").notNull(),
    timestamp: timestamp("timestamp", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("offset_data_org_id_idx").on(table.orgId),
    index("offset_data_timestamp_idx").on(table.timestamp),
  ],
);

export const notebook = pgTable(
  "notebook",
  {
    id: varchar("id", { length: 255 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 255 }).notNull(),
    orgId: varchar("org_id", { length: 255 }).notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    messages: jsonb("messages"),
    shared: boolean("shared"),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
  },
  (table) => [
    index("notebook_org_id_idx").on(table.orgId),
    index("notebook_timestamp_idx").on(table.timestamp),
  ],
);

export type Notebook = typeof notebook.$inferSelect;

export type CollectedData = typeof collectedData.$inferSelect;

export interface CollectedDataWithEmission extends CollectedData {
  totalEmission: number;
}
