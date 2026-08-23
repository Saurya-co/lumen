import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

/**
 * POST /api/ai
 * Body: { action: "summarize" | "explain" | "simplify" | "ask", text, context }
 *
 * The AI is OPTIONAL and SECONDARY in Lumen — it only runs when the user
 * explicitly invokes an AI action from the command center or selection
 * bubble. The SDK is used server-side only.
 *
 * Two response modes:
 *  - default: returns full JSON { ok, response, action } (single-shot)
 *  - ?stream=1: returns a Server-Sent Events stream of token deltas
 */

// Simple in-memory rate limiter (per session via x-session-id header)
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;  // 10 requests per minute per session
const rateLimitStore = new Map<string, number[]>();

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const requests = rateLimitStore.get(sessionId) ?? [];
  const recent = requests.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) return false;
  recent.push(now);
  rateLimitStore.set(sessionId, recent);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const wantStream = url.searchParams.get("stream") === "1";

    // Rate limiting
    const sessionId = req.headers.get("x-session-id") ?? "anonymous";
    if (!checkRateLimit(sessionId)) {
      return NextResponse.json({ error: "Rate limited. Try again later." }, { status: 429 });
    }

    const body = await req.json();

    // SECURITY: Validate + sanitize all inputs

    // Validate action — allowlist only
    const VALID_ACTIONS = new Set(["summarize", "explain", "simplify", "ask"]);
    const action = typeof body.action === "string" && VALID_ACTIONS.has(body.action) ? body.action : "ask";

    // Validate text — string + length limit (prevent cost/DoS abuse)
    const MAX_INPUT_LENGTH = 32000; // 32KB — generous for study content
    let text = "";
    if (typeof body.text === "string") {
      text = body.text.slice(0, MAX_INPUT_LENGTH);
    }

    // Validate context — string + length limit
    let context = "";
    if (typeof body.context === "string") {
      context = body.context.slice(0, 1000); // context is just a page title, keep short
    }

    if (!text && action !== "ask") {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    if (!text && action === "ask") {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const zai = await ZAI.create();

    const systemPrompts: Record<string, string> = {
      summarize:
        "You are Lumen, a study assistant built into a focus-oriented study browser. Summarize the user's content in clear, structured bullet points. Be concise. Prioritise concepts the student should remember. Do not add filler.",
      explain:
        "You are Lumen, a study assistant. Explain the user's content as if to a curious student. Clarify definitions, give a small concrete example if useful, and call out the most exam-likely takeaways at the end.",
      simplify:
        "You are Lumen, a study assistant. Simplify the user's content for a beginner. Use plain language, short sentences, analogies. Preserve accuracy. End with a one-line 'in other words' summary.",
      ask:
        "You are Lumen, an optional study assistant. Answer the user's question concisely. If they reference a page, treat the supplied context as the source of truth. Avoid lecturing; answer the question.",
    };

    const userContent =
      action === "ask"
        ? `${context ? `Context (current page):\n${context}\n\n` : ""}Question: ${text ?? "(no question)"}`
        : text!;

    // --- Streaming path -----------------------------------------------------
    if (wantStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          };
          const timeout = setTimeout(() => {
            controller.error(new Error("Stream timeout (60s)"));
          }, 60_000);
          try {
            // First, try a true streaming completion. Some SDK builds
            // return an async iterator when `stream: true` is passed.
            let streamable: AsyncIterable<{
              choices?: Array<{ delta?: { content?: string } }>;
            }> | null = null;
            try {
              const maybe = await zai.chat.completions.create({
                messages: [
                  { role: "assistant", content: systemPrompts[action] ?? systemPrompts.ask },
                  { role: "user", content: userContent },
                ],
                stream: true,
                thinking: { type: "disabled" },
              } as Parameters<typeof zai.chat.completions.create>[0]);
              if (maybe && typeof (maybe as AsyncIterable<unknown>)[Symbol.asyncIterator] === "function") {
                streamable = maybe as AsyncIterable<{
                  choices?: Array<{ delta?: { content?: string } }>;
                }>;
              }
            } catch {
              // SDK doesn't support stream flag — fall through to single-shot
            }

            if (streamable) {
              // The SDK yields raw byte-arrays that decode to SSE-formatted
              // text lines (`data: {...}`). We decode + parse each to extract
              // delta.content tokens.
              let buf = "";
              for await (const chunk of streamable) {
                // chunk may be a Uint8Array, a Buffer, or a plain object
                // with numeric keys (byte values). Normalise to text.
                let chunkText: string;
                if (typeof chunk === "string") {
                  chunkText = chunk;
                } else if (chunk instanceof Uint8Array) {
                  chunkText = new TextDecoder().decode(chunk);
                } else if (Array.isArray(chunk)) {
                  chunkText = new TextDecoder().decode(new Uint8Array(chunk));
                } else if (chunk && typeof chunk === "object" && "length" in chunk) {
                  chunkText = new TextDecoder().decode(new Uint8Array(chunk as unknown as number[]));
                } else if (chunk && typeof chunk === "object") {
                  // byte-object like {0: 100, 1: 97, ...}
                  const bytes = Object.values(chunk as Record<string, number>);
                  chunkText = new TextDecoder().decode(new Uint8Array(bytes));
                } else {
                  continue;
                }
                buf += chunkText;
                // SSE messages are separated by \n\n
                const parts = buf.split("\n\n");
                buf = parts.pop() ?? "";
                for (const part of parts) {
                  for (const line of part.split("\n")) {
                    if (!line.startsWith("data:")) continue;
                    const payload = line.slice(5).trim();
                    if (!payload || payload === "[DONE]") continue;
                    try {
                      const json = JSON.parse(payload);
                      const token = json?.choices?.[0]?.delta?.content;
                      if (token) send("token", { token });
                    } catch {
                      // ignore parse errors on partial lines
                    }
                  }
                }
              }
            } else {
              // Fallback: single-shot completion, then stream the response
              // out word-by-word for a typewriter effect.
              const completion = await zai.chat.completions.create({
                messages: [
                  { role: "assistant", content: systemPrompts[action] ?? systemPrompts.ask },
                  { role: "user", content: userContent },
                ],
                thinking: { type: "disabled" },
              });
              const response = completion.choices?.[0]?.message?.content ?? "";
              if (response) {
                // Stream in small chunks (simulate token streaming)
                const words = response.split(/(\s+)/);
                for (let i = 0; i < words.length; i++) {
                  send("token", { token: words[i] });
                  // Tiny delay for typewriter feel — keeps stream responsive
                  await new Promise((r) => setTimeout(r, 18));
                }
              }
            }
            send("done", { ok: true });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "stream failed";
            send("error", { error: msg });
          } finally {
            clearTimeout(timeout);
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // --- Single-shot path ---------------------------------------------------
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompts[action] ?? systemPrompts.ask },
        { role: "user", content: userContent },
      ],
      thinking: { type: "disabled" },
    });

    const response = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ ok: true, response, action });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
