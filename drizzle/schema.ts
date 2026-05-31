import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Driveway projects table: stores user measurements, photos, and material selections
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  photoUrl: text("photoUrl").notNull(), // S3 storage path
  photoKey: text("photoKey").notNull(), // S3 key for reference
  squareFeet: int("squareFeet"), // Calculated from corner points
  depthInches: int("depthInches"), // Manual or LiDAR input
  cornerPoints: text("cornerPoints"), // JSON array of {x, y} coordinates
  selectedMaterial: varchar("selectedMaterial", { length: 50 }), // hotmix, millings, tar_and_chip, gravel
  quantityNeeded: varchar("quantityNeeded", { length: 50 }), // e.g., "2.5 tons"
  pricePerUnit: varchar("pricePerUnit", { length: 50 }), // e.g., "$45.00"
  materialCost: varchar("materialCost", { length: 50 }), // e.g., "$112.50"
  contractorPricePerSquareFoot: varchar("contractorPricePerSquareFoot", {
    length: 50,
  }), // e.g., "$4.25"
  laborCost: varchar("laborCost", { length: 50 }), // e.g., "$720.00"
  totalCost: varchar("totalCost", { length: 50 }), // e.g., "$832.50"
  additionalCostsJson: text("additionalCostsJson"),
  finalInvoiceTotal: varchar("finalInvoiceTotal", { length: 50 }),
  acceptedAt: timestamp("acceptedAt"),
  zipCode: varchar("zipCode", { length: 10 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  previewImageUrl: text("previewImageUrl"), // AI-generated material preview
  previewImageKey: text("previewImageKey"), // S3 key for preview
  contractorEmail: varchar("contractorEmail", { length: 320 }),
  projectName: varchar("projectName", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Project shares table: tracks shareable links and contractor access
 */
export const projectShares = mysqlTable("projectShares", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId")
    .notNull()
    .references(() => projects.id),
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(), // Unique token for public access
  contractorEmail: varchar("contractorEmail", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // Optional expiration
  viewCount: int("viewCount").default(0),
});

export type ProjectShare = typeof projectShares.$inferSelect;
export type InsertProjectShare = typeof projectShares.$inferInsert;

/**
 * Material prices table: caches regional pricing by ZIP code
 */
export const materialPrices = mysqlTable("materialPrices", {
  id: int("id").autoincrement().primaryKey(),
  zipCode: varchar("zipCode", { length: 10 }).notNull(),
  material: varchar("material", { length: 50 }).notNull(), // hotmix, millings, tar_and_chip, gravel
  pricePerTon: varchar("pricePerTon", { length: 50 }).notNull(),
  pricePerSquareFoot: varchar("pricePerSquareFoot", { length: 50 }).notNull(),
  supplier: varchar("supplier", { length: 255 }),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
  expiresAt: timestamp("expiresAt"), // Cache expiration
});

export type MaterialPrice = typeof materialPrices.$inferSelect;
export type InsertMaterialPrice = typeof materialPrices.$inferInsert;
