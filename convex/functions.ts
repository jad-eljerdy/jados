import { query } from "./_generated/server";

export const healthCheck = query({
  args: {},
  handler: async (ctx) => {
    return { status: "ok", timestamp: Date.now() };
  },
});
