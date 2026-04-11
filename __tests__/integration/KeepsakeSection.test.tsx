import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { KeepsakeSection } from '../../src/components/keepsake/KeepsakeSection';
import { useSettingsStore } from '../../src/stores/settingsStore';

jest.mock('../../src/services/keepsakeService', () => ({
  loadKeepsakeState: jest.fn(),
  getKeepsakeFileUri: jest.fn(() => 'file:///mock/keepsake.jpg'),
  getKeepsakeWords: jest.fn(() => Promise.resolve([])),
  captureKeepsake: jest.fn(() => Promise.resolve()),
  saveKeepsakeToLibrary: jest.fn(() => Promise.resolve()),
  shareKeepsake: jest.fn(() => Promise.resolve()),
  setPhotoOverride: jest.fn(() => Promise.resolve()),
}));

const { loadKeepsakeState } = require('../../src/services/keepsakeService') as {
  loadKeepsakeState: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  useSettingsStore.setState({ name: 'Noah', sex: 'boy', birth: undefined, isOnboardingDone: true });
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

  it('renders centered thumbnail when keepsake is generated', async () => {
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

    const thumbnail = await findByTestId('keepsake-thumbnail');
    expect(thumbnail).toBeTruthy();
  });

  it('shows timeline label below keepsake section', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: false,
      generatedAt: null,
      photoOverrides: {},
    });

    const { findByText } = renderWithProviders(
      <KeepsakeSection totalWords={5} />,
    );

    const label = await findByText('Timeline');
    expect(label).toBeTruthy();
  });

  it('shows keepsake section label', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: false,
      generatedAt: null,
      photoOverrides: {},
    });

    const { findByText } = renderWithProviders(
      <KeepsakeSection totalWords={5} />,
    );

    const label = await findByText('Keepsake Book');
    expect(label).toBeTruthy();
  });

  it('pressing create button opens the keepsake preview modal', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: false,
      generatedAt: null,
      photoOverrides: {},
    });

    const { findByTestId } = renderWithProviders(
      <KeepsakeSection totalWords={5} />,
    );

    const createBtn = await findByTestId('keepsake-create-btn');
    fireEvent.press(createBtn);

    const modal = await findByTestId('keepsake-preview-modal');
    expect(modal).toBeTruthy();
  });

  it('pressing thumbnail button opens the keepsake preview modal', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: true,
      generatedAt: '2026-01-15T12:00:00Z',
      photoOverrides: {},
    });

    const { findByTestId } = renderWithProviders(
      <KeepsakeSection totalWords={5} />,
    );

    const thumbnailBtn = await findByTestId('keepsake-thumbnail-btn');
    fireEvent.press(thumbnailBtn);

    const modal = await findByTestId('keepsake-preview-modal');
    expect(modal).toBeTruthy();
  });

  it('pressing close button hides the modal', async () => {
    loadKeepsakeState.mockResolvedValue({
      isGenerated: false,
      generatedAt: null,
      photoOverrides: {},
    });

    const { findByTestId, queryByTestId } = renderWithProviders(
      <KeepsakeSection totalWords={5} />,
    );

    const createBtn = await findByTestId('keepsake-create-btn');
    fireEvent.press(createBtn);

    const closeBtn = await findByTestId('keepsake-close-btn');
    fireEvent.press(closeBtn);

    // Modal should be hidden after close
    expect(queryByTestId('keepsake-close-btn')).toBeNull();
  });
});
