import React from 'react';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { KeepsakeSection } from '../../src/components/keepsake/KeepsakeSection';

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

describe('KeepsakeSection', () => {
  it('renders nothing when totalWords is 0', () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: false,
      generatedAt: null,
      photoOverrides: {},
    });
    const { queryByTestId } = renderWithProviders(
      <KeepsakeSection totalWords={0} />,
    );
    expect(queryByTestId('keepsake-section')).toBeNull();
  });

  it('renders create button when keepsake not generated', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: false,
      generatedAt: null,
      photoOverrides: {},
    });

    const { findByTestId } = renderWithProviders(
      <KeepsakeSection totalWords={5} />,
    );

    const section = await findByTestId('keepsake-section');
    expect(section).toBeTruthy();

    const createBtn = await findByTestId('keepsake-create-btn');
    expect(createBtn).toBeTruthy();
  });

  it('renders thumbnail when keepsake is generated', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: true,
      generatedAt: '2026-01-15T12:00:00Z',
      photoOverrides: {},
    });

    const { findByTestId } = renderWithProviders(
      <KeepsakeSection totalWords={5} />,
    );

    const thumbnailBtn = await findByTestId('keepsake-thumbnail-btn');
    expect(thumbnailBtn).toBeTruthy();
  });
});
