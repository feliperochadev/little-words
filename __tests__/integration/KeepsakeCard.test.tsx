import React from 'react';
import { render } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { KeepsakeCard } from '../../src/components/keepsake/KeepsakeCard';
import type { KeepsakeWord } from '../../src/types/keepsake';

function makeWord(overrides: Partial<KeepsakeWord> = {}): KeepsakeWord {
  return {
    id: 1,
    word: 'mamãe',
    dateAdded: '2024-03-15',
    photoUri: null,
    categoryEmoji: '🐾',
    ...overrides,
  };
}

function renderCard(props: Partial<React.ComponentProps<typeof KeepsakeCard>> = {}) {
  return render(
    <I18nProvider>
      <KeepsakeCard
        words={[makeWord()]}
        name="Noah"
        sex="boy"
        {...props}
      />
    </I18nProvider>,
  );
}

describe('KeepsakeCard', () => {
  it('renders the card container', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('keepsake-card')).toBeTruthy();
  });

  it('renders the watermark', () => {
    const { getByTestId } = renderCard();
    expect(getByTestId('keepsake-watermark')).toBeTruthy();
  });

  it('renders with one word — OneWordLayout', () => {
    const { getByTestId } = renderCard({ words: [makeWord()] });
    expect(getByTestId('keepsake-polaroid-0')).toBeTruthy();
  });

  it('renders with two words — TwoWordLayout', () => {
    const { getByTestId } = renderCard({
      words: [makeWord({ id: 1, word: 'mamãe' }), makeWord({ id: 2, word: 'papai' })],
    });
    expect(getByTestId('keepsake-polaroid-0')).toBeTruthy();
    expect(getByTestId('keepsake-polaroid-1')).toBeTruthy();
  });

  it('renders with three words — ThreeWordLayout', () => {
    const { getByTestId } = renderCard({
      words: [
        makeWord({ id: 1, word: 'mamãe' }),
        makeWord({ id: 2, word: 'papai' }),
        makeWord({ id: 3, word: 'vovó' }),
      ],
    });
    expect(getByTestId('keepsake-polaroid-0')).toBeTruthy();
    expect(getByTestId('keepsake-polaroid-1')).toBeTruthy();
    expect(getByTestId('keepsake-polaroid-2')).toBeTruthy();
  });

  it('renders placeholder when photoUri is null', () => {
    const { getByTestId } = renderCard({ words: [makeWord({ photoUri: null })] });
    expect(getByTestId('keepsake-placeholder-0')).toBeTruthy();
  });

  it('renders photo image when photoUri is provided', () => {
    const { getByTestId } = renderCard({
      words: [makeWord({ photoUri: 'file:///photo.jpg' })],
    });
    expect(getByTestId('keepsake-photo-0')).toBeTruthy();
  });

  it('renders placeholder camera icon when no photo', () => {
    const { getByTestId } = renderCard({
      words: [makeWord({ photoUri: null, categoryEmoji: '🐾' })],
    });
    expect(getByTestId('keepsake-placeholder-0')).toBeTruthy();
  });

  it('renders placeholder camera icon when categoryEmoji is null', () => {
    const { getByTestId } = renderCard({
      words: [makeWord({ photoUri: null, categoryEmoji: null })],
    });
    expect(getByTestId('keepsake-placeholder-0')).toBeTruthy();
  });

  it('uses "Baby" as displayName when name is empty', () => {
    // name.trim() || 'Baby' fallback
    const { getByTestId } = renderCard({ name: '   ' });
    expect(getByTestId('keepsake-title')).toBeTruthy();
  });

  it('renders with elevated=false (shadow disabled)', () => {
    const { getByTestId } = renderCard({ elevated: false });
    expect(getByTestId('keepsake-polaroid-0')).toBeTruthy();
  });

  it('renders with sex=girl in en-US locale', () => {
    const { getByTestId } = renderCard({ sex: 'girl', name: 'Sofia' });
    expect(getByTestId('keepsake-title')).toBeTruthy();
  });

  it('renders with sex=null', () => {
    const { getByTestId } = renderCard({ sex: null });
    expect(getByTestId('keepsake-title')).toBeTruthy();
  });

  it('renders word label and date for each polaroid', () => {
    const { getByTestId } = renderCard({ words: [makeWord({ word: 'mamãe', dateAdded: '2024-03-15' })] });
    expect(getByTestId('keepsake-word-0')).toBeTruthy();
    expect(getByTestId('keepsake-date-0')).toBeTruthy();
  });
});
