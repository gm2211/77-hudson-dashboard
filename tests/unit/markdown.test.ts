import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../src/utils/markdown';

describe('parseMarkdown', () => {
  describe('inline formatting', () => {
    it('renders bold with **', () => {
      expect(parseMarkdown('**hello**')).toContain('<strong>hello</strong>');
    });

    it('renders bold with __', () => {
      expect(parseMarkdown('__hello__')).toContain('<strong>hello</strong>');
    });

    it('renders italic with *', () => {
      expect(parseMarkdown('*hello*')).toContain('<em>hello</em>');
    });

    it('renders italic with _', () => {
      expect(parseMarkdown('_hello_')).toContain('<em>hello</em>');
    });

    it('renders strikethrough with ~~', () => {
      expect(parseMarkdown('~~hello~~')).toContain('<del>hello</del>');
    });

    it('renders inline code with backticks', () => {
      const result = parseMarkdown('`code here`');
      expect(result).toContain('<code');
      expect(result).toContain('code here</code>');
    });

    it('renders nested bold inside italic', () => {
      const result = parseMarkdown('*some **bold** text*');
      expect(result).toContain('<em>');
      expect(result).toContain('<strong>bold</strong>');
    });
  });

  describe('headers', () => {
    it('renders h1', () => {
      expect(parseMarkdown('# Title')).toContain('<h1');
      expect(parseMarkdown('# Title')).toContain('Title</h1>');
    });

    it('renders h2', () => {
      expect(parseMarkdown('## Subtitle')).toContain('<h2');
      expect(parseMarkdown('## Subtitle')).toContain('Subtitle</h2>');
    });

    it('renders h3', () => {
      expect(parseMarkdown('### Small')).toContain('<h3');
      expect(parseMarkdown('### Small')).toContain('Small</h3>');
    });
  });

  describe('lists', () => {
    it('renders bullet list with -', () => {
      const result = parseMarkdown('- item one\n- item two');
      expect(result).toContain('<ul');
      expect(result).toContain('item one');
      expect(result).toContain('item two');
      expect(result).toContain('</ul>');
    });

    it('renders bullet list with *', () => {
      const result = parseMarkdown('* item one\n* item two');
      expect(result).toContain('<ul');
      expect(result).toContain('item one');
      expect(result).toContain('item two');
    });

    it('renders numbered list', () => {
      const result = parseMarkdown('1. first\n2. second');
      expect(result).toContain('<ol');
      expect(result).toContain('first');
      expect(result).toContain('second');
      expect(result).toContain('</ol>');
    });

    it('closes bullet list before non-list content', () => {
      const result = parseMarkdown('- item\nParagraph');
      expect(result).toContain('</ul>');
      expect(result).toContain('Paragraph');
    });
  });

  describe('edge cases', () => {
    it('returns <br/> for empty input', () => {
      expect(parseMarkdown('')).toBe('<br/>');
    });

    it('passes plain text through with <br/>', () => {
      expect(parseMarkdown('hello world')).toBe('hello world<br/>');
    });

    it('handles multiline content', () => {
      const result = parseMarkdown('line 1\nline 2\nline 3');
      expect(result).toContain('line 1');
      expect(result).toContain('line 2');
      expect(result).toContain('line 3');
    });

    it('handles mixed formatting in one line', () => {
      const result = parseMarkdown('**bold** and *italic* and `code`');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<code');
    });

    it('renders empty lines as <br/>', () => {
      const result = parseMarkdown('first\n\nsecond');
      // Empty line becomes <br/>, surrounding lines get <br/> appended
      expect(result).toContain('first<br/>');
      expect(result).toContain('second<br/>');
    });

    it('applies inline formatting inside list items', () => {
      const result = parseMarkdown('- **bold item**');
      expect(result).toContain('<strong>bold item</strong>');
      expect(result).toContain('<ul');
    });

    it('handles links-like text without crashing', () => {
      // parseMarkdown doesn't support links, but should not crash
      const result = parseMarkdown('[text](http://example.com)');
      expect(result).toContain('[text](http://example.com)');
    });
  });
});
