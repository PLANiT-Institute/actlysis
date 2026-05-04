import type { Block } from "./types";

/**
 * Tries to parse a JSON fragment starting at line `start`.
 * Expands line-by-line up to `maxLines` to handle multi-line objects.
 */
function tryParseJson(lines: string[], start: number, maxLines = 60): { value: unknown; end: number } | null {
  for (let end = start; end < Math.min(start + maxLines, lines.length); end++) {
    try {
      const value = JSON.parse(lines.slice(start, end + 1).join("\n"));
      return { value, end };
    } catch {
      /* keep expanding */
    }
  }
  return null;
}

function isBlock(v: unknown): v is Block {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Record<string, unknown>).type === "string"
  );
}

/**
 * Parses raw LLM output into a Block[].
 *
 * Handles two formats the model may emit:
 *   A) {"blocks": [...]}  on a single line (ideal)
 *   B) Individual { "type": "..." } objects spread across the text
 *
 * Non-JSON lines are accumulated and emitted as a single markdown block
 * inserted at the position where they appeared.
 */
export function parseBlocks(rawOutput: string): Block[] {
  const cleaned = rawOutput.replace(/---END---[\s\S]*$/m, "").trim();
  const lines = cleaned.split("\n");

  const blocks: Block[] = [];
  let mdLines: string[] = [];
  let i = 0;

  function flushMarkdown() {
    const content = mdLines.join("\n").trim();
    if (content) blocks.push({ type: "markdown", content });
    mdLines = [];
  }

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith("{")) {
      // Try {"blocks":[...]} wrapper first
      if (line.includes('"blocks"')) {
        const result = tryParseJson(lines, i);
        if (result) {
          const parsed = result.value as { blocks?: Block[] };
          if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
            flushMarkdown();
            blocks.push(...parsed.blocks);
            i = result.end + 1;
            continue;
          }
        }
      }

      // Try individual block object
      const result = tryParseJson(lines, i);
      if (result && isBlock(result.value)) {
        flushMarkdown();
        blocks.push(result.value as Block);
        i = result.end + 1;
        continue;
      }
    }

    // Not JSON — accumulate as markdown
    mdLines.push(lines[i]);
    i++;
  }

  flushMarkdown();
  return blocks;
}
