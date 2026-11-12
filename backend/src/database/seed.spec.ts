import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Database Seeder Verification', () => {
  const seedFilePath = path.resolve(__dirname, 'seed.ts');
  const seedContent = fs.readFileSync(seedFilePath, 'utf-8');

  it('el archivo seed.ts existe y está correctamente estructurado', () => {
    expect(fs.existsSync(seedFilePath)).toBe(true);
    expect(seedContent).toContain('import { DigitalKey');
    expect(seedContent).toContain('runSeed()');
  });

  it('contiene al menos 10 juegos de Nintendo Switch', () => {
    const nswMatches = seedContent.match(/platformCode:\s*'NSW'/g);
    expect(nswMatches).not.toBeNull();
    expect(nswMatches!.length).toBeGreaterThanOrEqual(10);
  });

  it('contiene al menos 5 juegos de PlayStation 5', () => {
    const ps5Matches = seedContent.match(/platformCode:\s*'PS5'/g);
    expect(ps5Matches).not.toBeNull();
    expect(ps5Matches!.length).toBeGreaterThanOrEqual(5);
  });

  it('contiene al menos 5 juegos de Xbox Series X|S', () => {
    const xsxMatches = seedContent.match(/platformCode:\s*'XSX'/g);
    expect(xsxMatches).not.toBeNull();
    expect(xsxMatches!.length).toBeGreaterThanOrEqual(5);
  });

  it('contiene al menos 10 juegos de PC con requisitos de sistema', () => {
    const pcMatches = seedContent.match(/platformCode:\s*'PC'/g);
    expect(pcMatches).not.toBeNull();
    expect(pcMatches!.length).toBeGreaterThanOrEqual(10);
    expect(seedContent).toContain('sysReq:');
  });

  it('todas las portadas utilizan URLs HTTPS seguras y reales', () => {
    const coverMatches = seedContent.match(/coverImageUrl:\s*'([^']+)'/g);
    expect(coverMatches).not.toBeNull();
    expect(coverMatches!.length).toBeGreaterThanOrEqual(30);

    for (const match of coverMatches!) {
      const url = match.replace(/coverImageUrl:\s*'/, '').replace(/'/, '');
      expect(url.startsWith('https://')).toBe(true);
    }
  });

  it('genera claves digitales únicas con hash criptográfico SHA-256', () => {
    expect(seedContent).toContain('crypto.createHash(\'sha256\')');
    expect(seedContent).toContain('KeyStatus.AVAILABLE');
  });
});
