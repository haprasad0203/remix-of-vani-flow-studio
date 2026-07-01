import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/exotel/voice/$audioId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const audioId = params.audioId.replace(/[^a-zA-Z0-9-]/g, "");
        if (!audioId) return new Response("Bad request", { status: 400 });
        const url = new URL(request.url);
        const host = request.headers.get("x-forwarded-host") ?? url.host;
        const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
        const audioUrl = `${proto}://${host}/api/public/exotel/audio/${audioId}.wav`;
        const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Play>${audioUrl}</Play></Response>`;
        return new Response(xml, {
          status: 200,
          headers: { "Content-Type": "application/xml; charset=utf-8" },
        });
      },
      POST: async (ctx) => {
        // Exotel sometimes POSTs; delegate to GET behavior
        return Route.options.server!.handlers.GET!(ctx as never);
      },
    },
  },
});
