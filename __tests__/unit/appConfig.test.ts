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

describe('android cropper theme and label overrides', () => {
  it('overrides Expo crop activity theme and popup menu style for readable flip submenu', () => {
    const manifestPath = path.resolve(__dirname, '../../android/app/src/main/AndroidManifest.xml');
    const stylesPath = path.resolve(__dirname, '../../android/app/src/main/res/values/styles.xml');
    const manifestXml = fs.readFileSync(manifestPath, 'utf-8');
    const stylesXml = fs.readFileSync(stylesPath, 'utf-8');

    expect(manifestXml).toContain('android:name="expo.modules.imagepicker.ExpoCropImageActivity"');
    expect(manifestXml).toContain('android:theme="@style/ExpoCropImageThemeOverride"');
    expect(manifestXml).toContain('tools:replace="android:theme"');

    expect(stylesXml).toContain('<style name="ExpoCropImageThemeOverride" parent="Base.Theme.AppCompat">');
    expect(stylesXml).toContain('<item name="android:popupMenuStyle">@style/ExpoCropPopupMenuStyle</item>');
    expect(stylesXml).toContain('<item name="popupMenuStyle">@style/ExpoCropPopupMenuStyle</item>');
    expect(stylesXml).toContain('<item name="android:itemTextAppearance">@style/ExpoCropPopupMenuItemText</item>');
    expect(stylesXml).toContain('<item name="android:popupBackground">#FFFFFF</item>');
    expect(stylesXml).toContain('<item name="android:textColor">#0B1F33</item>');
    expect(stylesXml).toContain('<item name="android:textColorPrimary">#0B1F33</item>');
  });

  it('overrides crop action label to Save and Salvar for pt and pt-BR', () => {
    const defaultStringsPath = path.resolve(__dirname, '../../android/app/src/main/res/values/strings.xml');
    const ptStringsPath = path.resolve(__dirname, '../../android/app/src/main/res/values-pt/strings.xml');
    const ptBrStringsPath = path.resolve(__dirname, '../../android/app/src/main/res/values-pt-rBR/strings.xml');
    const defaultStrings = fs.readFileSync(defaultStringsPath, 'utf-8');
    const ptStrings = fs.readFileSync(ptStringsPath, 'utf-8');
    const ptBrStrings = fs.readFileSync(ptBrStringsPath, 'utf-8');

    expect(defaultStrings).toContain('<string name="crop_image_menu_crop">Save</string>');
    expect(ptStrings).toContain('<string name="crop_image_menu_crop">Salvar</string>');
    expect(ptBrStrings).toContain('<string name="crop_image_menu_crop">Salvar</string>');
  });
});
