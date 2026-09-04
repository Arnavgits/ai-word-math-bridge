export function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function isEscaped(input, index) {
  let count = 0;
  for (let i = index - 1; i >= 0 && input[i] === "\\"; i -= 1) count += 1;
  return count % 2 === 1;
}

function findClosing(input, start, close) {
  for (let i = start; i < input.length; i += 1) {
    if (input.startsWith(close, i) && !isEscaped(input, i)) return i;
  }
  return -1;
}

function pushText(segments, value) {
  if (!value) return;
  const previous = segments[segments.length - 1];
  if (previous?.type === "text") previous.value += value;
  else segments.push({ type: "text", value });
}

export function parseAiResponse(input) {
  const segments = [];
  let i = 0;

  while (i < input.length) {
    if (input.startsWith("$$", i) && !isEscaped(input, i)) {
      const end = findClosing(input, i + 2, "$$");
      if (end !== -1) {
        segments.push({ type: "math", latex: input.slice(i + 2, end).trim(), display: true });
        i = end + 2;
        continue;
      }
    }

    if (input.startsWith("\\[", i)) {
      const end = input.indexOf("\\]", i + 2);
      if (end !== -1) {
        segments.push({ type: "math", latex: input.slice(i + 2, end).trim(), display: true });
        i = end + 2;
        continue;
      }
    }

    if (input.startsWith("\\(", i)) {
      const end = input.indexOf("\\)", i + 2);
      if (end !== -1) {
        segments.push({ type: "math", latex: input.slice(i + 2, end).trim(), display: false });
        i = end + 2;
        continue;
      }
    }

    if (input[i] === "$" && !isEscaped(input, i)) {
      const end = findClosing(input, i + 1, "$");
      if (end !== -1) {
        segments.push({ type: "math", latex: input.slice(i + 1, end).trim(), display: false });
        i = end + 1;
        continue;
      }
    }

    let next = i + 1;
    while (
      next < input.length &&
      !input.startsWith("$$", next) &&
      !input.startsWith("\\[", next) &&
      !input.startsWith("\\(", next) &&
      !(input[next] === "$" && !isEscaped(input, next))
    ) {
      next += 1;
    }
    pushText(segments, input.slice(i, next));
    i = next;
  }

  return segments.filter((segment) => segment.type === "math" || segment.value.length > 0);
}
