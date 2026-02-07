import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdvisoryTicker from '../../src/components/AdvisoryTicker';
import type { Advisory } from '../../src/types';

function makeAdvisory(overrides: Partial<Advisory> = {}, index = 0): Advisory {
  return {
    id: index + 1,
    label: 'NOTICE',
    message: `Advisory message ${index + 1}`,
    active: true,
    ...overrides,
  };
}

describe('AdvisoryTicker', () => {
  it('renders advisory labels and messages', () => {
    const advisories = [makeAdvisory({ label: 'WEATHER ALERT', message: 'Storm warning tonight' })];
    render(<AdvisoryTicker advisories={advisories} />);
    expect(screen.getByText('WEATHER ALERT')).toBeInTheDocument();
    expect(screen.getByText('Storm warning tonight')).toBeInTheDocument();
  });

  it('filters out inactive advisories', () => {
    const advisories = [
      makeAdvisory({ label: 'ACTIVE', message: 'Visible', active: true }),
      makeAdvisory({ label: 'INACTIVE', message: 'Hidden', active: false }, 1),
    ];
    render(<AdvisoryTicker advisories={advisories} />);
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.queryByText('INACTIVE')).toBeNull();
    expect(screen.queryByText('Hidden')).toBeNull();
  });

  it('returns null when no active advisories', () => {
    const { container } = render(<AdvisoryTicker advisories={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders multiple advisories', () => {
    const advisories = [
      makeAdvisory({ label: 'NOTICE', message: 'First' }),
      makeAdvisory({ label: 'ALERT', message: 'Second' }, 1),
    ];
    render(<AdvisoryTicker advisories={advisories} />);
    // Content is duplicated for seamless scrolling, so use getAllByText
    expect(screen.getAllByText('First').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Second').length).toBeGreaterThanOrEqual(1);
  });

  it('applies label styling', () => {
    const advisories = [makeAdvisory({ label: 'EMERGENCY' })];
    render(<AdvisoryTicker advisories={advisories} />);
    const label = screen.getByText('EMERGENCY');
    // Label should have background color and white text
    expect(label).toBeInTheDocument();
    const style = label.getAttribute('style') || '';
    expect(style).toContain('font-weight');
  });

  it('returns null when all advisories are inactive', () => {
    const advisories = [
      makeAdvisory({ active: false }),
      makeAdvisory({ active: false }, 1),
    ];
    const { container } = render(<AdvisoryTicker advisories={advisories} />);
    expect(container.innerHTML).toBe('');
  });
});
