import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const faviconPath = resolve(frontendRoot, 'public/favicon.svg');
const indexHtmlPath = resolve(frontendRoot, 'index.html');

describe('Favicon de El Pibes (public/favicon.svg e index.html)', () => {
  it('public/favicon.svg es XML/SVG válido y seguro sin scripts ni handlers inline', () => {
    expect(existsSync(faviconPath)).toBe(true);
    const svgContent = readFileSync(faviconPath, 'utf8');

    const doc = new DOMParser().parseFromString(svgContent, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull();

    const root = doc.documentElement;
    expect(root.tagName.toLowerCase()).toBe('svg');
    expect(root.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
    expect(root.getAttribute('viewBox')).toBe('0 0 64 64');
    expect(root.getAttribute('role')).toBe('img');
    expect(root.getAttribute('aria-label')).toBe('El Pibes');

    expect(doc.querySelector('script, foreignObject')).toBeNull();
    expect(svgContent).not.toMatch(/javascript:/i);

    for (const element of Array.from(doc.querySelectorAll('*'))) {
      for (const attr of Array.from(element.attributes)) {
        expect(attr.name.toLowerCase().startsWith('on')).toBe(false);
      }
    }
  });

  it('todas las referencias url(#id) de public/favicon.svg apuntan a gradientes definidos', () => {
    const svgContent = readFileSync(faviconPath, 'utf8');
    const doc = new DOMParser().parseFromString(svgContent, 'image/svg+xml');

    const definedIds = new Set(
      Array.from(doc.querySelectorAll('defs [id]'))
        .map((node) => node.getAttribute('id'))
        .filter((id): id is string => Boolean(id)),
    );

    const urlMatches = Array.from(svgContent.matchAll(/url\(#([^)]+)\)/g));
    expect(urlMatches.length).toBeGreaterThan(0);

    for (const match of urlMatches) {
      const refId = match[1];
      expect(refId).toBeDefined();
      expect(definedIds.has(refId!)).toBe(true);
    }
  });

  it('index.html enlaza a /favicon.svg?v=2 con type="image/svg+xml" y el recurso existe en public/', () => {
    const htmlContent = readFileSync(indexHtmlPath, 'utf8');
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');

    const iconLink = doc.querySelector('head link[rel="icon"]');
    const shortcutIconLink = doc.querySelector('head link[rel="shortcut icon"]');

    expect(iconLink).not.toBeNull();
    expect(iconLink?.getAttribute('type')).toBe('image/svg+xml');
    expect(iconLink?.getAttribute('href')).toBe('/favicon.svg?v=2');

    expect(shortcutIconLink).not.toBeNull();
    expect(shortcutIconLink?.getAttribute('type')).toBe('image/svg+xml');
    expect(shortcutIconLink?.getAttribute('href')).toBe('/favicon.svg?v=2');

    const hrefPath = iconLink?.getAttribute('href')?.split('?')[0]?.replace(/^\//, '');
    expect(hrefPath).toBe('favicon.svg');
    expect(existsSync(resolve(frontendRoot, 'public', hrefPath!))).toBe(true);
  });
});

