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
  title: string;
  systemPrompt: string;
  schema?: object;
  sections: Record<string, string>;
}

export class MarkdownSpecParser {
  private static cache: Map<string, MarkdownSpec> = new Map();

  public static parseFile(filePath: string): MarkdownSpec {
    const resolved = this.resolvePath(filePath);
    if (this.cache.has(resolved)) {
      return this.cache.get(resolved)!;
    }

    if (!fs.existsSync(resolved)) {
      throw new Error(`Markdown specification file not found: ${resolved}`);
    }

    const raw = fs.readFileSync(resolved, 'utf8');
    const parsed = this.parseContent(raw);
    this.cache.set(resolved, parsed);
    return parsed;
  }

  public static resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) return filePath;

    // Check direct relative path
    const direct = path.resolve(process.cwd(), filePath);
    if (fs.existsSync(direct)) return direct;

    // Check in agents/
    const inAgents = path.resolve(process.cwd(), 'agents', filePath);
    if (fs.existsSync(inAgents)) return inAgents;

    // Check in evals/
    const inEvals = path.resolve(process.cwd(), 'evals', filePath);
    if (fs.existsSync(inEvals)) return inEvals;

    return direct;
  }

  public static parseContent(content: string): MarkdownSpec {
    const metadata: Record<string, string> = {};
    const sections: Record<string, string> = {};
    let title = '';
    let systemPrompt = '';

    const lines = content.split('\n');
    let inFrontmatter = false;
    let currentSection = 'intro';
    let sectionLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Frontmatter (---)
      if (i === 0 && line.trim() === '---') {
        inFrontmatter = true;
        continue;
      }
      if (inFrontmatter) {
        if (line.trim() === '---') {
          inFrontmatter = false;
          continue;
        }
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          const val = line.slice(colonIdx + 1).trim();
          metadata[key] = val;
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
        // Strip code fence if present
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

    return {
      raw: content,
      metadata,
      title,
      systemPrompt,
      schema,
      sections,
    };
  }

  public static clearCache(): void {
    this.cache.clear();
  }
}
