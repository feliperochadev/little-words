import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { AudioPlayerInline } from '../../src/components/AudioPlayerInline';

const mockPlayAssetByParent = jest.fn().mockResolvedValue(undefined);
const mockStopPlayback = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/hooks/useMediaCapture', () => ({
  useMediaCapture: () => ({
    playAssetByParent: mockPlayAssetByParent,
    stopPlayback: mockStopPlayback,
    playingAssetId: null,
    phase: 'idle' as const,
    pendingMedia: null,
    prefilledWordName: '',
    setPhase: jest.fn(),
    setCapturedMedia: jest.fn(),
    resetCapture: jest.fn(),
    linkMediaToWord: jest.fn(),
    startCreateWord: jest.fn(),
    onWordCreated: jest.fn(),
    launchPhotoPicker: jest.fn(),
  }),
}));

describe('AudioPlayerInline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct testID for word parent', () => {
    const { getByTestId } = renderWithProviders(
      <AudioPlayerInline parentType="word" parentId={42} />
    );
    expect(getByTestId('audio-play-word-42')).toBeTruthy();
  });

  it('renders with correct testID for variant parent', () => {
    const { getByTestId } = renderWithProviders(
      <AudioPlayerInline parentType="variant" parentId={7} />
    );
    expect(getByTestId('audio-play-variant-7')).toBeTruthy();
  });

  it('renders volume-high icon', () => {
    const { getByTestId, toJSON } = renderWithProviders(
      <AudioPlayerInline parentType="word" parentId={1} />
    );
    // Verify the button renders
    expect(getByTestId('audio-play-word-1')).toBeTruthy();
    // Find the Ionicons mock node in the tree
    const tree = toJSON();
    const findIcon = (node: any): any => {
      if (!node) return null;
      if (node.type === 'Ionicons' && node.props?.name === 'volume-high') return node;
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          const found = findIcon(child);
          if (found) return found;
        }
      }
      return null;
    };
    const icon = findIcon(tree);
    expect(icon).toBeTruthy();
    expect(icon.props.size).toBe(14);
  });

  it('calls playAssetByParent on press with correct parentType and parentId', () => {
    const { getByTestId } = renderWithProviders(
      <AudioPlayerInline parentType="word" parentId={99} />
    );
    fireEvent.press(getByTestId('audio-play-word-99'));
    expect(mockPlayAssetByParent).toHaveBeenCalledTimes(1);
    expect(mockPlayAssetByParent).toHaveBeenCalledWith('word', 99);
  });

  it('calls playAssetByParent with variant parentType', () => {
    const { getByTestId } = renderWithProviders(
      <AudioPlayerInline parentType="variant" parentId={5} />
    );
    fireEvent.press(getByTestId('audio-play-variant-5'));
    expect(mockPlayAssetByParent).toHaveBeenCalledWith('variant', 5);
  });

  it('calls playAssetByParent with profile parentType', () => {
    const { getByTestId } = renderWithProviders(
      <AudioPlayerInline parentType="profile" parentId={1} />
    );
    fireEvent.press(getByTestId('audio-play-profile-1'));
    expect(mockPlayAssetByParent).toHaveBeenCalledWith('profile', 1);
  });
});
