import React from 'react';
import { render } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { BrandHeader } from '../../src/components/BrandHeader';

function renderWithProvider(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('BrandHeader', () => {
  it('renders app name', async () => {
    const { findByText } = renderWithProvider(<BrandHeader />);
    expect(await findByText('Little Words')).toBeTruthy();
  });

  it('renders tagline', async () => {
    const { findByText } = renderWithProvider(<BrandHeader />);
    // The tagline key is 'brandHeader.tagline' — verify it renders
    expect(await findByText('Every word, a memory')).toBeTruthy();
  });

  it('accepts a custom style prop without crashing', async () => {
    const { findByText } = renderWithProvider(<BrandHeader style={{ marginTop: 10 }} />);
    expect(await findByText('Little Words')).toBeTruthy();
  });
});
