#!/usr/bin/env npx ts-node
/**
 * JadOS Assistant Polling Script
 * 
 * This script polls Convex for pending assistant messages and responds to them.
 * It's designed to be called by Clawdbot cron jobs.
 * 
 * Usage: npx ts-node scripts/assistant-poll.ts
 */

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = "https://valuable-tiger-429.convex.cloud";

interface PendingMessage {
  _id: string;
  sessionId: string;
  content: string;
  context?: any;
  createdAt: number;
}

async function main() {
  const client = new ConvexHttpClient(CONVEX_URL);

  // Get pending messages
  const pending: PendingMessage[] = await client.query("assistant:getPendingMessages" as any, {});

  if (pending.length === 0) {
    console.log("No pending messages");
    return;
  }

  console.log(`Found ${pending.length} pending message(s)`);

  // Format messages for output (Clawdbot will process and respond)
  for (const msg of pending) {
    const ctx = msg.context || {};
    
    // Format context into readable form
    let contextStr = `View: ${ctx.view || "unknown"}`;
    
    if (ctx.mealName) {
      contextStr += `\nMeal: ${ctx.mealName}`;
    }
    
    if (ctx.components && ctx.components.length > 0) {
      contextStr += `\nIngredients:`;
      for (const c of ctx.components) {
        contextStr += `\n  - ${c.ingredientName}: ${c.weightGrams}g (${Math.round(c.calories)} cal, ${Math.round(c.protein)}g P)`;
      }
    }
    
    if (ctx.totals) {
      contextStr += `\nCurrent: ${Math.round(ctx.totals.calories)} cal, ${Math.round(ctx.totals.protein)}g P, ${Math.round(ctx.totals.fat)}g F, ${Math.round(ctx.totals.carbs)}g C`;
    }
    
    if (ctx.targets) {
      contextStr += `\nTargets: ${ctx.targets.caloricCeiling} cal, ${ctx.targets.proteinTarget}g P, ${ctx.targets.netCarbLimit}g carbs`;
    }

    // Output in a format Clawdbot can parse
    console.log(`\n--- ASSISTANT REQUEST ---`);
    console.log(`MESSAGE_ID: ${msg._id}`);
    console.log(`SESSION: ${msg.sessionId}`);
    console.log(`USER_MESSAGE: ${msg.content}`);
    console.log(`CONTEXT:\n${contextStr}`);
    console.log(`--- END REQUEST ---\n`);
  }
}

main().catch(console.error);
