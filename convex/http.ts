import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// Endpoint for Clawdbot to poll pending assistant messages
http.route({
  path: "/assistant/pending",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const pending = await ctx.runQuery(api.assistant.getPendingMessages, {});
    
    return new Response(JSON.stringify({ messages: pending }), {
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Endpoint for Clawdbot to respond to a message
http.route({
  path: "/assistant/respond",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    const { messageId, response } = body;

    if (!messageId || !response) {
      return new Response(JSON.stringify({ error: "Missing messageId or response" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      await ctx.runMutation(api.assistant.respondToMessage, {
        messageId,
        response,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),
});

export default http;
