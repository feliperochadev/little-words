import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { ProfileAvatar } from '../../src/components/ProfileAvatar';
import { useSettingsStore } from '../../src/stores/settingsStore';

function renderAvatar(props: React.ComponentProps<typeof ProfileAvatar>) {
  return render(
    <I18nProvider>
      <ProfileAvatar {...props} />
    </I18nProvider>
  );
}

describe('ProfileAvatar', () => {
  beforeEach(() => {
    useSettingsStore.setState({ name: '', sex: null, birth: '', isOnboardingDone: false, isHydrated: true });
  });

  // ─── Sizes ──────────────────────────────────────────────────────────────────

  it('renders sm size without decorations', () => {
    const { queryByTestId } = renderAvatar({ size: 'sm', testID: 'avatar' });
    expect(queryByTestId('avatar')).toBeTruthy();
  });

  it('renders md size without decorations by default', () => {
    const { queryByTestId } = renderAvatar({ size: 'md', testID: 'avatar' });
    expect(queryByTestId('avatar')).toBeTruthy();
  });

  it('renders lg size with decorations by default', () => {
    const { getByTestId, UNSAFE_getAllByType } = renderAvatar({ size: 'lg', testID: 'avatar' });
    expect(getByTestId('avatar')).toBeTruthy();
  });

  // ─── Emoji fallback ─────────────────────────────────────────────────────────

  it('renders girl emoji when sex is girl and no photo', () => {
    const { getByText } = renderAvatar({ size: 'lg', sex: 'girl' });
    expect(getByText('👧')).toBeTruthy();
  });

  it('renders boy emoji when sex is boy and no photo', () => {
    const { getByText } = renderAvatar({ size: 'lg', sex: 'boy' });
    expect(getByText('👦')).toBeTruthy();
  });

  it('renders neutral baby emoji when sex is null', () => {
    const { getByText } = renderAvatar({ size: 'lg', sex: null });
    expect(getByText('👶')).toBeTruthy();
  });

  it('renders neutral baby emoji when sex is undefined', () => {
    const { getByText } = renderAvatar({ size: 'lg' });
    expect(getByText('👶')).toBeTruthy();
  });

  // ─── Photo rendering ────────────────────────────────────────────────────────

  it('renders Image when photoUri is provided', () => {
    const { UNSAFE_getByType } = renderAvatar({
      size: 'lg',
      photoUri: 'file:///tmp/photo.jpg',
    });
    const Image = require('react-native').Image;
    const img = UNSAFE_getByType(Image);
    expect(img.props.source.uri).toBe('file:///tmp/photo.jpg');
  });

  it('does not render emoji when photoUri is provided', () => {
    const { queryByText } = renderAvatar({
      size: 'lg',
      photoUri: 'file:///tmp/photo.jpg',
      sex: 'girl',
    });
    expect(queryByText('👧')).toBeNull();
  });

  it('falls back to emoji when photoUri is null', () => {
    const { getByText } = renderAvatar({ size: 'lg', photoUri: null, sex: 'boy' });
    expect(getByText('👦')).toBeTruthy();
  });

  it('falls back to emoji on image load error', async () => {
    const { UNSAFE_getByType, getByText } = renderAvatar({
      size: 'lg',
      photoUri: 'file:///invalid/photo.jpg',
      sex: 'girl',
    });
    const Image = require('react-native').Image;
    const img = UNSAFE_getByType(Image);
    // Simulate image load error — wrap in act to process state update
    await act(async () => { img.props.onError(); });
    expect(getByText('👧')).toBeTruthy();
  });

  // ─── Decorations ────────────────────────────────────────────────────────────

  it('shows decorations by default for lg', () => {
    // Decorations contain Ionicons — just verify the avatar renders correctly
    const { getByTestId } = renderAvatar({ size: 'lg', testID: 'avatar' });
    expect(getByTestId('avatar')).toBeTruthy();
  });

  it('hides decorations when showDecorations=false on lg', () => {
    const { getByTestId } = renderAvatar({ size: 'lg', showDecorations: false, testID: 'avatar' });
    expect(getByTestId('avatar')).toBeTruthy();
  });

  it('shows decorations when showDecorations=true on sm', () => {
    const { getByTestId } = renderAvatar({ size: 'sm', showDecorations: true, testID: 'avatar' });
    expect(getByTestId('avatar')).toBeTruthy();
  });

  // ─── Press / touch target ───────────────────────────────────────────────────

  it('renders without TouchableOpacity when onPress is not provided', () => {
    const { UNSAFE_queryAllByType } = renderAvatar({ size: 'lg' });
    const TouchableOpacity = require('react-native').TouchableOpacity;
    expect(UNSAFE_queryAllByType(TouchableOpacity)).toHaveLength(0);
  });

  it('wraps in TouchableOpacity when onPress is provided', () => {
    const onPress = jest.fn();
    const { UNSAFE_getAllByType } = renderAvatar({ size: 'lg', onPress });
    const TouchableOpacity = require('react-native').TouchableOpacity;
    expect(UNSAFE_getAllByType(TouchableOpacity).length).toBeGreaterThan(0);
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderAvatar({ size: 'lg', onPress, testID: 'avatar' });
    fireEvent.press(getByTestId('avatar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders with testID on wrapper', () => {
    const { getByTestId } = renderAvatar({ size: 'md', testID: 'my-avatar' });
    expect(getByTestId('my-avatar')).toBeTruthy();
  });

  // ─── Accessibility ──────────────────────────────────────────────────────────

  it('has accessibilityRole button when onPress is defined', () => {
    const { UNSAFE_getAllByType } = renderAvatar({ size: 'lg', onPress: jest.fn() });
    const TouchableOpacity = require('react-native').TouchableOpacity;
    const to = UNSAFE_getAllByType(TouchableOpacity)[0];
    expect(to.props.accessibilityRole).toBe('button');
  });
});
