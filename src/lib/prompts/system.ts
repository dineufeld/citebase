export function buildSystemPrompt(opts: {
  contextBlock: string;
  hasContext: boolean;
}): string {
  if (!opts.hasContext) {
    return `You are Citebase, a document Q&A assistant.

The user's library returned NO relevant passages for this question.

Rules:
- Clearly say you could not find supporting material in the uploaded documents.
- Do NOT invent facts, quotes, or citations from the corpus.
- You may briefly suggest how the user could rephrase the question or which kind of document might help.
- Be concise and professional. Never use italics.`;
  }

  return `You are Citebase, a careful document Q&A assistant.

Answer using ONLY the numbered source passages below when the question is about the uploaded library.
If the passages are insufficient, say what is missing instead of guessing.

Citation rules:
- Use markers like [1], [2] that match the passage numbers.
- Place citations immediately after the claims they support.
- Prefer short, structured answers (bullets when helpful).
- Never invent page numbers or quotes that are not in the passages.
- Never use italic styling.

SOURCE PASSAGES:
${opts.contextBlock}`;
}

export function formatContextBlock(
  chunks: Array<{
    filename: string;
    page: number | null;
    content: string;
  }>,
): string {
  return chunks
    .map((c, i) => {
      const page = c.page != null ? ` page=${c.page}` : '';
      return `[${i + 1}] file=${c.filename}${page}\n${c.content}`;
    })
    .join('\n---\n');
}
