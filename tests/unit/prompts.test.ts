import { describe, expect, it } from 'vitest';
import { buildSystemPrompt, formatContextBlock } from '@/lib/prompts/system';

describe('buildSystemPrompt', () => {
  it('refuses to invent facts when there is no context', () => {
    const prompt = buildSystemPrompt({ contextBlock: '', hasContext: false });
    expect(prompt).toContain('Citebase');
    expect(prompt.toLowerCase()).toContain('no relevant passages');
    expect(prompt).toContain('Do NOT invent');
    expect(prompt).not.toContain('SOURCE PASSAGES');
    // Voice contract: never uses the word "italic" (only "italics" with an s)
    expect(prompt.toLowerCase()).not.toMatch(/\bitalic\b/);
  });

  it('includes the numbered context block when hasContext is true', () => {
    const ctx = '[1] file=handbook.md\nEmployees get 20 days of PTO.';
    const prompt = buildSystemPrompt({ contextBlock: ctx, hasContext: true });
    expect(prompt).toContain('SOURCE PASSAGES:');
    expect(prompt).toContain('[1] file=handbook.md');
    expect(prompt).toContain('Employees get 20 days of PTO.');
    expect(prompt).toContain('[1]');
    expect(prompt).toContain('Never use italic');
  });
});

describe('formatContextBlock', () => {
  it('numbers passages starting at 1 with file= and optional page=', () => {
    const block = formatContextBlock([
      { filename: 'a.md', page: 2, content: 'alpha' },
      { filename: 'b.md', page: null, content: 'beta' },
    ]);
    expect(block).toContain('[1] file=a.md page=2\nalpha');
    expect(block).toContain('[2] file=b.md\nbeta');
    // Entries separated by the divider
    expect(block.split('---')).toHaveLength(2);
  });

  it('omits the page segment when page is null', () => {
    const block = formatContextBlock([{ filename: 'x.md', page: null, content: 'x' }]);
    expect(block).not.toContain('page=');
    expect(block).toContain('[1] file=x.md');
  });

  it('returns an empty string for an empty chunk list', () => {
    expect(formatContextBlock([])).toBe('');
  });
});
