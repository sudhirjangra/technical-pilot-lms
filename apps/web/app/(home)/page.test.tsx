import Page from '@/app/(home)/page';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
  it('renders the home page with sign-in links for guests', async () => {
    const PageResolved = await Page();
    render(PageResolved);

    expect(screen.getByText('Technical Pilot LMS')).toBeDefined();
    expect(screen.getByText('Sign In')).toBeDefined();
    expect(screen.getByText('Sign Up')).toBeDefined();
  });
});
