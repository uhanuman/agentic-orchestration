/**
 * Enterprise Greenfield Agentic Quality Engineering Framework
 * Markdown Specification Parser
 * Reads and parses Agent and Eval Markdown definitions into structured execution contracts.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MarkdownSpec {
  raw: string;
  metadata: Record<string, string>;
  metadataArrays: Record<string, string[]>;
  title: string;
  systemPrompt: string;
  schema?: object;
  sections: Record<string, string>;
  resolvedPath?: string;
  getList: (key: string) => string[];
}

export class MarkdownSpecParser {
  private static cache: Map<string, MarkdownSpec> = new Map();

  public static parseFile(filePath: string): MarkdownSpec {
    const resolved = this.resolvePath(filePath);
    if (this.cache.has(resolved)) {
      return this.cache.get(resolved)!;
    }

    if (!fs.existsSync(resolved)) {
      throw new Error(`Markdown specification file not found: ${resolved} (from input: ${filePath})`);
    }

    const raw = fs.readFileSync(resolved, 'utf8');
    const parsed = this.parseContent(raw, resolved);
    this.cache.set(resolved, parsed);
    return parsed;
  }

  public static resolvePath(target: string): string {
    if (path.isAbsolute(target) && fs.existsSync(target)) {
      return target;
    }

    // Direct relative check
    const direct = path.resolve(process.cwd(), target);
    if (fs.existsSync(direct)) return direct;

    // Direct check in agents/
    const inAgents = path.resolve(process.cwd(), 'agents', target);
    if (fs.existsSync(inAgents)) return inAgents;

    // Direct check in evals/
    const inEvals = path.resolve(process.cwd(), 'evals', target);
    if (fs.existsSync(inEvals)) return inEvals;

    // Target with .md extension in agents or evals
    if (!target.endsWith('.md')) {
      const targetWithMd = `${target}.md`;
      const directMd = path.resolve(process.cwd(), targetWithMd);
      if (fs.existsSync(directMd)) return directMd;
      const inAgentsMd = path.resolve(process.cwd(), 'agents', targetWithMd);
      if (fs.existsSync(inAgentsMd)) return inAgentsMd;
      const inEvalsMd = path.resolve(process.cwd(), 'evals', targetWithMd);
      if (fs.existsSync(inEvalsMd)) return inEvalsMd;
    }

    // Scan agents/ and evals/ for matching filename, ID, or aliases
    const searchDirs = [
      path.resolve(process.cwd(), 'agents'),
      path.resolve(process.cwd(), 'evals'),
    ];

    const cleanTarget = target.replace(/^(agents\/|evals\/)/, '').replace(/\.md$/, '').toLowerCase();

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir);

      for (const entry of entries) {
        if (!entry.endsWith('.md')) continue;
        const fullEntryPath = path.resolve(dir, entry);
        const entryBase = entry.replace(/\.md$/, '').toLowerCase();

        // 1. Direct name match (e.g. 02.test-design.agent or test-design)
        if (entryBase === cleanTarget || entry.toLowerCase() === target.toLowerCase()) {
          return fullEntryPath;
        }

        // Substring / partial match (e.g. "01.requirement-analysis.agent" matches "requirement-analysis")
        const namePart = entryBase.replace(/^\d+\./, '').replace(/\.(agent|eval)$/, '');
        if (namePart === cleanTarget) {
          return fullEntryPath;
        }

        // 2. Frontmatter ID / Alias Inspection
        try {
          const headerSnippet = fs.readFileSync(fullEntryPath, 'utf8').slice(0, 1500);
          if (headerSnippet.startsWith('---')) {
            const frontmatterEnd = headerSnippet.indexOf('---', 3);
            if (frontmatterEnd > 0) {
              const frontmatter = headerSnippet.slice(3, frontmatterEnd);
              const idMatch = frontmatter.match(/^\s*id:\s*(.+)$/m);
              if (idMatch && idMatch[1].trim().toLowerCase() === cleanTarget) {
                return fullEntryPath;
              }
              const aliasMatch = frontmatter.match(/^\s*aliases:\s*\[(.*?)\]/m);
              if (aliasMatch && aliasMatch[1]) {
                const aliases = aliasMatch[1].split(',').map(a => a.trim().toLowerCase());
                if (aliases.includes(cleanTarget)) {
                  return fullEntryPath;
                }
              }
            }
          }
        } catch {
          // ignore read error
        }
      }
    }

    return direct;
  }

  public static parseContent(content: string, resolvedPath?: string): MarkdownSpec {
    const metadata: Record<string, string> = {};
    const metadataArrays: Record<string, string[]> = {};
    const sections: Record<string, string> = {};
    let title = '';
    let systemPrompt = '';

    const lines = content.split('\n');
    let inFrontmatter = false;
    let currentArrayKey: string | null = null;
    let currentSection = 'intro';
    let sectionLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Frontmatter delimiter
      if (i === 0 && line.trim() === '---') {
        inFrontmatter = true;
        continue;
      }

      if (inFrontmatter) {
        if (line.trim() === '---') {
          inFrontmatter = false;
          currentArrayKey = null;
          continue;
        }

        const trimmed = line.trim();
        // Indented array item: "  - value"
        if (trimmed.startsWith('- ') && currentArrayKey) {
          const itemVal = trimmed.replace(/^-\s*/, '').replace(/['"]/g, '').trim();
          metadataArrays[currentArrayKey].push(itemVal);
          continue;
        }

        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          const rawVal = line.slice(colonIdx + 1).trim();

          if (!rawVal) {
            // Begins a multiline array
            currentArrayKey = key;
            metadataArrays[key] = [];
            metadata[key] = '';
          } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
            // Inline JSON-style array: "[A, B, C]"
            currentArrayKey = null;
            const items = rawVal
              .slice(1, -1)
              .split(',')
              .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
              .filter(s => s.length > 0);
            metadataArrays[key] = items;
            metadata[key] = items.join(', ');
          } else {
            currentArrayKey = null;
            const val = rawVal.replace(/^['"]|['"]$/g, '');
            metadata[key] = val;
            metadataArrays[key] = [val];
          }
        }
        continue;
      }

      // Title (# Title)
      if (!title && line.startsWith('# ')) {
        title = line.replace(/^#\s+/, '').trim();
        continue;
      }

      // Section Header (## or ###)
      const headerMatch = line.match(/^#{2,3}\s+(.+)$/);
      if (headerMatch) {
        if (sectionLines.length > 0) {
          sections[currentSection] = sectionLines.join('\n').trim();
          sectionLines = [];
        }
        currentSection = headerMatch[1].trim();
        continue;
      }

      sectionLines.push(line);
    }

    if (sectionLines.length > 0) {
      sections[currentSection] = sectionLines.join('\n').trim();
    }

    // Extract System Prompt
    for (const [key, text] of Object.entries(sections)) {
      if (/system prompt/i.test(key)) {
        systemPrompt = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
        break;
      }
    }

    // Extract Schema from Output Schema section if present
    let schema: object | undefined;
    for (const [key, text] of Object.entries(sections)) {
      if (/output schema/i.test(key)) {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            schema = JSON.parse(jsonMatch[1]);
          } catch {
            // ignore schema parsing error
          }
        }
        break;
      }
    }

    const getList = (key: string): string[] => {
      if (metadataArrays[key] && metadataArrays[key].length > 0) {
        return metadataArrays[key];
      }
      if (metadata[key]) {
        return metadata[key].split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
      return [];
    };

    return {
      raw: content,
      metadata,
      metadataArrays,
      title,
      systemPrompt,
      schema,
      sections,
      resolvedPath,
      getList,
    };
  }

  public static clearCache(): void {
    this.cache.clear();
  }
}
