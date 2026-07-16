/**
 * Smoke test: gpt-image-2 via the OpenAI Responses API image_generation tool.
 *
 * This mirrors exactly how the app generates images:
 *   - driver model (a text-capable mainline model) in `model`
 *   - gpt-image-2 set as the IMAGE model behind the image_generation tool
 *   - base64 returned in `output[].result`, written to UploadThing
 *
 * Requires OPENAI_API_KEY in the environment (e.g. set in .env.local).
 *
 * Run: node scripts/smoke-image-gpt-image-2.mjs
 */

import OpenAI from "openai";

// Key may come from OPENAI_API_KEY env OR a CLI arg (simulating a user-supplied key).
// Passing via argv with env unset proves the per-request user-key path used by the app.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.argv[2];
if (!OPENAI_API_KEY) {
  console.error("✗ No API key. Set OPENAI_API_KEY or pass it as an argument: node scripts/smoke-image-gpt-image-2.mjs <key>");
  process.exit(2);
}

// Mirrors src/constants/image-models.ts
const OPENAI_IMAGE_MODEL = "gpt-image-2";
const OPENAI_RESPONSES_MODEL = "gpt-5";

async function main() {
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  console.log(`→ Calling Responses API: model=${OPENAI_RESPONSES_MODEL}, image_model=${OPENAI_IMAGE_MODEL}`);

  const response = await openai.responses.create({
    model: OPENAI_RESPONSES_MODEL,
    input: "Draw a simple horizontal 16:9 banner with the text HELLO WORLD, flat vector style.",
    tools: [
      {
        type: "image_generation",
        model: OPENAI_IMAGE_MODEL,
        size: "1536x1024",
        background: "opaque",
        quality: "auto",
        output_format: "png",
      },
    ],
  });

  const calls = response.output.filter(
    (item) => item.type === "image_generation_call",
  );
  if (calls.length === 0) {
    console.error("✗ No image_generation_call in response.output");
    console.error(JSON.stringify(response.output, null, 2).slice(0, 2000));
    process.exit(3);
  }

  const base64 = calls[0].result;
  if (!base64 || typeof base64 !== "string") {
    console.error("✗ Expected base64 string in image_generation_call.result");
    console.error("keys:", Object.keys(calls[0]));
    process.exit(4);
  }

  const buffer = Buffer.from(base64, "base64");
  console.log(`✓ Generated image: ${buffer.length} bytes (base64 len ${base64.length})`);
  console.log(`  revised_prompt: ${calls[0].revised_prompt ?? "(none)"}`);
  console.log("✓ gpt-image-2 via Responses API works as wired in the app.");
}

main().catch((err) => {
  console.error("✗ Request failed:");
  console.error(err?.message ?? err);
  if (err?.status) console.error("HTTP status:", err.status);
  if (err?.error) console.error("API error:", err.error);
  process.exit(1);
});
