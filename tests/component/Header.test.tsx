import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from '../../src/components/Header';
import type { BuildingConfig } from '../../src/types';

function makeConfig(overrides: Partial<BuildingConfig> = {}): BuildingConfig {
  return {
    id: 1,
    buildingNumber: '77',
    buildingName: 'Hudson',
    subtitle: 'Real-time System Monitor',
    scrollSpeed: 30,
    tickerSpeed: 25,
    servicesScrollSpeed: 8,
    ...overrides,
  };
}

describe('Header', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders building number and name', () => {
    render(<Header config={makeConfig()} />);
    expect(screen.getByText('77')).toBeInTheDocument();
    expect(screen.getByText('Hudson')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(<Header config={makeConfig({ subtitle: 'Building Dashboard' })} />);
    expect(screen.getByText('Building Dashboard')).toBeInTheDocument();
  });

  it('shows default values when config is null', () => {
    render(<Header config={null} />);
    expect(screen.getByText('77')).toBeInTheDocument();
    expect(screen.getByText('Building Services Status')).toBeInTheDocument();
    expect(screen.getByText('Real-time System Monitor')).toBeInTheDocument();
  });

  it('displays current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T14:30:00'));
    render(<Header config={makeConfig()} />);
    // Should show time in 12-hour format
    expect(screen.getByText('02:30 PM')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
