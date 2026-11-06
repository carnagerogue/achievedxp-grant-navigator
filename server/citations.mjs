// Give structured output exact, source-owned choices. A model should select a
// passage to support a claim, not have to reproduce its punctuation from memory.
export function citationPassages(text) {
  function split(block) {
    const chunks = [];
    let rest = block.trim();
    while (rest.length > 1100) {
      let end = rest.lastIndexOf(" ", 1100);
      if (end < 100) end = 1100;
      if (rest.length - end < 12) end = rest.length;
      chunks.push(rest.slice(0, end).trim());
      rest = rest.slice(end).trim();
    }
    if (rest.length >= 12) chunks.push(rest);
    return chunks;
  }
  let passages = text.split(/\n\s*\n/).flatMap(split);
  if (passages.length > 128) passages = split(text);
  return [...new Set(passages)].filter((p) => p.length >= 12);
}

export function citationChoices(references) {
  return Object.entries(references).flatMap(([source_id, source]) =>
    citationPassages(source.text).map((text, index) => ({
      source_id, passage_id: source_id + "-P" + (index + 1), text,
    })),
  );
}

