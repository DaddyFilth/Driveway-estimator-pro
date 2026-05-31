import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  User,
  InsertUser,
  users,
  projects,
  projectShares,
  materialPrices,
  InsertProject,
  InsertProjectShare,
  InsertMaterialPrice,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

function getInsertId(result: unknown): number | undefined {
  if (!result || typeof result !== "object") return undefined;

  if ("insertId" in result && typeof result.insertId === "number") {
    return result.insertId;
  }

  if (Array.isArray(result)) {
    for (const item of result) {
      const insertId = getInsertId(item);
      if (insertId !== undefined) return insertId;
    }
  }

  return undefined;
}

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by id: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(user: InsertUser): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values(user);
  const userId = getInsertId(result);
  if (userId === undefined) {
    throw new Error("Database did not return a user id");
  }

  const createdUser = await getUserById(userId);
  if (!createdUser) {
    throw new Error("Failed to load created user");
  }

  return createdUser;
}

export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectById(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values(project);
  return {
    id: getInsertId(result),
  };
}

export async function updateProject(
  projectId: number,
  updates: Partial<InsertProject>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(projects).set(updates).where(eq(projects.id, projectId));
}

export async function deleteProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(projects).where(eq(projects.id, projectId));
}

export async function createProjectShare(share: InsertProjectShare) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(projectShares).values(share);
}

export async function getProjectShareByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(projectShares)
    .where(eq(projectShares.shareToken, token))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getMaterialPrices(zipCode: string, material: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(materialPrices)
    .where(
      and(
        eq(materialPrices.zipCode, zipCode),
        eq(materialPrices.material, material)
      )
    )
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertMaterialPrice(price: InsertMaterialPrice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .insert(materialPrices)
    .values(price)
    .onDuplicateKeyUpdate({
      set: {
        pricePerTon: price.pricePerTon,
        pricePerSquareFoot: price.pricePerSquareFoot,
        supplier: price.supplier,
        lastUpdated: new Date(),
      },
    });
}

// TODO: add feature queries here as your schema grows.
