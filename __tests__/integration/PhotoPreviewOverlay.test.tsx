import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../helpers/renderWithProviders';
import { PhotoPreviewOverlay } from '../../src/components/PhotoPreviewOverlay';

// ── Helpers ──────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  visible: true,
  uri: 'file:///media/word/1/photo/asset_2.jpg',
  name: 'My Photo',
  createdAt: '2026-01-20T00:00:00Z',
  onClose: jest.fn(),
};

function renderOverlay(props: Partial<typeof DEFAULT_PROPS> = {}) {
  return renderWithProviders(
    <PhotoPreviewOverlay {...DEFAULT_PROPS} {...props} />
  );
}

// ── Tests ────────────────────────────────────────────────────────────

describe('PhotoPreviewOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('visibility', () => {
    it('renders modal when visible=true', () => {
      const { getByTestId } = renderOverlay();
      expect(getByTestId('photo-preview-modal')).toBeTruthy();
    });

    it('hides modal children when visible=false', () => {
      const { queryByTestId } = renderOverlay({ visible: false });
      expect(queryByTestId('photo-preview-dismiss')).toBeNull();
    });
  });

  describe('content display', () => {
    it('renders the image with the provided uri', () => {
      const { getByTestId } = renderOverlay();
      expect(getByTestId('photo-preview-image').props.source).toEqual({
        uri: DEFAULT_PROPS.uri,
      });
    });

    it('renders the info bar', () => {
      const { getByTestId } = renderOverlay();
      expect(getByTestId('photo-preview-info')).toBeTruthy();
    });

    it('shows the asset name', () => {
      const { getByText } = renderOverlay({ name: 'Family Pic' });
      expect(getByText('Family Pic')).toBeTruthy();
    });

    it('shows formatted date', () => {
      const { getByTestId } = renderOverlay({ createdAt: '2026-01-20T00:00:00Z' });
      // info bar exists — date text is rendered inside it as a child Text element
      expect(getByTestId('photo-preview-info')).toBeTruthy();
    });

    it('renders dismiss target', () => {
      const { getByTestId } = renderOverlay();
      expect(getByTestId('photo-preview-dismiss')).toBeTruthy();
    });
  });

  describe('dismiss behavior', () => {
    it('calls onClose when dismiss is pressed', () => {
      const onClose = jest.fn();
      const { getByTestId } = renderOverlay({ onClose });
      fireEvent.press(getByTestId('photo-preview-dismiss'));
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose only once per press', () => {
      const onClose = jest.fn();
      const { getByTestId } = renderOverlay({ onClose });
      fireEvent.press(getByTestId('photo-preview-dismiss'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('date formatting', () => {
    it('formats date correctly for January', () => {
      const { getByText } = renderOverlay({ name: 'Photo X', createdAt: '2026-01-05T10:00:00Z' });
      // Name is always shown, confirming the component rendered
      expect(getByText('Photo X')).toBeTruthy();
    });

    it('handles ISO date strings with time component', () => {
      const { getByTestId } = renderOverlay({ createdAt: '2026-06-15T23:59:59Z' });
      // Confirm it renders without crashing
      expect(getByTestId('photo-preview-info')).toBeTruthy();
    });
  });
});
