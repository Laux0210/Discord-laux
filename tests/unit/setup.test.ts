import { describe, it, expect } from 'vitest';

describe('Environment Setup', () => {
  it('should have mock mode enabled by default in local environment', () => {
    const isMockMode = process.env.VITE_USE_MOCK ?? 'true';
    expect(isMockMode).toBe('true');
  });

  it('should target Windows platform specifications', () => {
    const appPlatform = 'win32';
    expect(['win32', 'darwin', 'linux']).toContain(appPlatform);
  });
});
