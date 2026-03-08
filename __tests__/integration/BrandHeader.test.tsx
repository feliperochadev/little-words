import React from 'react';
import { render } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/i18n';
import { BrandHeader } from '../../src/components/BrandHeader';

function renderWithProvider(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('BrandHeader', () => {
  it('renders app name and tagline', async () => {
    const { findByText } = renderWithProvider(<BrandHeader />);
    expect(await findByText('Little Words')).toBeTruthy();
  });
});
