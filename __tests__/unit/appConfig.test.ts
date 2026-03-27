import fs from 'node:fs';
import path from 'node:path';

describe('app.json image picker crop contrast config', () => {
  it('defines high-contrast Android crop toolbar colors for expo-image-picker', () => {
    const appJsonPath = path.resolve(__dirname, '../../app.json');
    const raw = fs.readFileSync(appJsonPath, 'utf-8');
    const appConfig = JSON.parse(raw) as {
      expo?: { plugins?: Array<string | [string, Record<string, unknown>]> };
    };

    const plugins = appConfig.expo?.plugins ?? [];
    const imagePickerPlugin = plugins.find(
      (plugin): plugin is [string, Record<string, unknown>] =>
        Array.isArray(plugin) && plugin[0] === 'expo-image-picker',
    );

    expect(imagePickerPlugin).toBeDefined();
    const options = imagePickerPlugin![1];

    expect(options).toMatchObject({
      colors: {
        cropToolbarColor: '#FFFFFF',
        cropToolbarIconColor: '#0B1F33',
        cropToolbarActionTextColor: '#0B1F33',
        cropBackButtonIconColor: '#0B1F33',
        cropBackgroundColor: '#FFFFFF',
      },
      dark: {
        colors: {
          cropToolbarColor: '#0B1F33',
          cropToolbarIconColor: '#FFFFFF',
          cropToolbarActionTextColor: '#FFFFFF',
          cropBackButtonIconColor: '#FFFFFF',
          cropBackgroundColor: '#000000',
        },
      },
    });
  });
});

describe('android image picker crop color resources', () => {
  it('defines high-contrast expo crop colors in values and values-night', () => {
    const lightColorsPath = path.resolve(__dirname, '../../android/app/src/main/res/values/colors.xml');
    const darkColorsPath = path.resolve(__dirname, '../../android/app/src/main/res/values-night/colors.xml');

    const lightXml = fs.readFileSync(lightColorsPath, 'utf-8');
    const darkXml = fs.readFileSync(darkColorsPath, 'utf-8');

    expect(lightXml).toContain('<color name="expoCropToolbarColor">#FFFFFF</color>');
    expect(lightXml).toContain('<color name="expoCropToolbarIconColor">#0B1F33</color>');
    expect(lightXml).toContain('<color name="expoCropToolbarActionTextColor">#0B1F33</color>');
    expect(lightXml).toContain('<color name="expoCropBackButtonIconColor">#0B1F33</color>');
    expect(lightXml).toContain('<color name="expoCropBackgroundColor">#FFFFFF</color>');

    expect(darkXml).toContain('<color name="expoCropToolbarColor">#0B1F33</color>');
    expect(darkXml).toContain('<color name="expoCropToolbarIconColor">#FFFFFF</color>');
    expect(darkXml).toContain('<color name="expoCropToolbarActionTextColor">#FFFFFF</color>');
    expect(darkXml).toContain('<color name="expoCropBackButtonIconColor">#FFFFFF</color>');
    expect(darkXml).toContain('<color name="expoCropBackgroundColor">#000000</color>');
  });
});

