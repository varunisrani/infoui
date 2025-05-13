import { Hono } from "hono";
import { handle } from "hono/vercel";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const generateImageSchema = z.object({
  prompt: z.string(),
});

const aiRoutes = new Hono()
  .post(
    "/generate-image",
    zValidator("json", generateImageSchema),
    async (c) => {
      const { prompt } = c.req.valid("json");
      
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-svg`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate image");
        }

        const data = await response.json();
        return c.json(data);
      } catch (error) {
        return c.json({ error: "Failed to generate image" }, 500);
      }
    }
  );

const app = new Hono().basePath("/api");
app.route("/ai", aiRoutes);

export type AppType = typeof app;
export const runtime = "edge";

const handler = handle(app);
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler; 