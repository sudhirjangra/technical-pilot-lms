import Page from '@/app/(home)/page';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock('@repo/shadcn/mode-switcher', () => ({
  ModeSwitcher: () => <div>ModeSwitcher</div>,
}));

vi.mock('@/components/session', () => ({
  default: () => <div>Session</div>,
}));

vi.mock('@/components/logo-icon', () => ({
  default: () => <div>Logo</div>,
}));

describe('Page Component', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('renders the home page with sign-in links for guests', async () => {
    const PageResolved = await Page();
    render(PageResolved);

    expect(screen.getByText('Technical Pilot LMS')).toBeDefined();
    expect(screen.getByText('Sign In')).toBeDefined();
    expect(screen.getByText('Sign Up')).toBeDefined();
  });
});
