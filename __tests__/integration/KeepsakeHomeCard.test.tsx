import React from 'react';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { KeepsakeHomeCard } from '../../src/components/keepsake/KeepsakeHomeCard';

jest.mock('../../src/services/keepsakeService', () => ({
  loadKeepsakeState: jest.fn(),
  getKeepsakeFileUri: jest.fn(() => 'file:///mock/keepsake.jpg'),
}));

const { loadKeepsakeState } = require('../../src/services/keepsakeService') as {
  loadKeepsakeState: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('KeepsakeHomeCard', () => {
  it('shows hint text when keepsake not generated', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: false,
      generatedAt: null,
      photoOverrides: {},
    });

    const { findByTestId } = renderWithProviders(<KeepsakeHomeCard />);
    const hint = await findByTestId('home-keepsake-hint');
    expect(hint).toBeTruthy();
  });

  it('shows thumbnail when keepsake is generated', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: true,
      generatedAt: '2026-01-15T12:00:00Z',
      photoOverrides: {},
    });

    const { findByTestId } = renderWithProviders(<KeepsakeHomeCard />);
    const thumbnail = await findByTestId('home-keepsake-thumbnail');
    expect(thumbnail).toBeTruthy();
  });

  it('shows hint when no keepsake state exists', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: false,
      generatedAt: null,
      photoOverrides: {},
    });

    const { findByTestId } = renderWithProviders(<KeepsakeHomeCard />);
    const hint = await findByTestId('home-keepsake-hint');
    expect(hint).toBeTruthy();
  });
});
