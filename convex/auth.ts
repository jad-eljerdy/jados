import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Simple hash function for passwords (for personal use)
// In production, use proper bcrypt via an action
function simpleHash(password: string, salt: string): string {
  const combined = password + salt;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Convert to base36 and combine with a checksum
  const base = Math.abs(hash).toString(36);
  let checksum = 0;
  for (let i = 0; i < combined.length; i++) {
    checksum += combined.charCodeAt(i) * (i + 1);
  }
  return `${base}_${Math.abs(checksum).toString(36)}`;
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

const SALT = "jados_2026_salt"; // Static salt for this personal app

export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    
    if (existing) {
      throw new Error("User already exists");
    }

    const now = Date.now();
    const passwordHash = simpleHash(args.password, SALT);

    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
      name: args.name,
      createdAt: now,
      updatedAt: now,
    });

    // Create session
    const token = generateToken();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt,
      createdAt: now,
    });

    return { userId, token };
  },
});

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!user) {
      throw new Error("Invalid email or password");
    }

    const passwordHash = simpleHash(args.password, SALT);
    if (passwordHash !== user.passwordHash) {
      throw new Error("Invalid email or password");
    }

    // Create session
    const token = generateToken();
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt,
      createdAt: now,
    });

    return { 
      userId: user._id, 
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      }
    };
  },
});

export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

export const validateSession = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
  },
});

export const getSession = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    return {
      userId: session.userId,
      expiresAt: session.expiresAt,
    };
  },
});

export const changePassword = mutation({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Invalid session");
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const currentHash = simpleHash(args.currentPassword, SALT);
    if (currentHash !== user.passwordHash) {
      throw new Error("Current password is incorrect");
    }

    const newHash = simpleHash(args.newPassword, SALT);
    await ctx.db.patch(user._id, {
      passwordHash: newHash,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
