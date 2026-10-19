import { DOMParser as LinkedomParser } from 'linkedom';
import { IDomElement, IDomParser } from '../types/index.js';

// Auto-register linkedom in environments without a native DOMParser (Node, Bun).
// Skipped if a native DOMParser is present (browsers) or a custom one was already
// set, so DomRegistry.register() still takes full precedence.
if (typeof globalThis.DOMParser === 'undefined') {
  (globalThis as any).DOMParser = LinkedomParser;
}

export class BrowserDomElement implements IDomElement {
  constructor(private element: Element | Document) {}

  public querySelector(selector: string): IDomElement | null {
    const el = this.element.querySelector(selector);
    return el ? new BrowserDomElement(el) : null;
  }

  public querySelectorAll(selector: string): IDomElement[] {
    const els = this.element.querySelectorAll(selector);
    return Array.from(els).map((el) => new BrowserDomElement(el));
  }

  public getAttribute(name: string): string | null {
    return 'getAttribute' in this.element ? this.element.getAttribute(name) : null;
  }

  public get textContent(): string | null {
    return this.element.textContent;
  }

  public get outerHTML(): string {
    return 'outerHTML' in this.element ? this.element.outerHTML : this.element.documentElement?.outerHTML ?? '';
  }

  public get innerHTML(): string {
    return 'innerHTML' in this.element ? this.element.innerHTML : this.element.documentElement?.innerHTML ?? '';
  }
}

export class BrowserDomParser implements IDomParser {
  public parse(html: string): IDomElement {
    if (typeof globalThis.DOMParser === 'undefined') {
      throw new Error(
        'DOMParser is not available in this environment. Please register a custom DOM Parser via DomRegistry.register().',
      );
    }
    const parser = new globalThis.DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // Ensure we start from documentElement or body if needed
    const root = doc.documentElement?.localName === 'html' ? doc.documentElement : doc;
    return new BrowserDomElement(root);
  }
}

export class DomRegistry {
  private static parser: IDomParser = new BrowserDomParser();

  public static register(customParser: IDomParser): void {
    this.parser = customParser;
  }

  public static getParser(): IDomParser {
    return this.parser;
  }

  public static parse(html: string): IDomElement {
    return this.parser.parse(html);
  }
}
