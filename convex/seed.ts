import { mutation } from "./_generated/server";

// Simple hash function (same as in auth.ts)
function simpleHash(password: string, salt: string): string {
  const combined = password + salt;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const base = Math.abs(hash).toString(36);
  let checksum = 0;
  for (let i = 0; i < combined.length; i++) {
    checksum += combined.charCodeAt(i) * (i + 1);
  }
  return `${base}_${Math.abs(checksum).toString(36)}`;
}

const SALT = "jados_2026_salt";

// Seed JJ's account
export const seedJJ = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if JJ already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "jad.eljerdy@gmail.com"))
      .first();

    if (existing) {
      return { message: "User already exists", userId: existing._id };
    }

    const now = Date.now();
    // Password: JadOS2026!
    const passwordHash = simpleHash("JadOS2026!", SALT);

    const userId = await ctx.db.insert("users", {
      email: "jad.eljerdy@gmail.com",
      passwordHash,
      name: "Jad El Jerdy",
      createdAt: now,
      updatedAt: now,
    });

    return { message: "User created", userId };
  },
});
