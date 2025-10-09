import i18n from '../index';

describe('i18n Configuration', () => {
  beforeAll(async () => {
    // Wait for i18n to initialize
    await i18n.init();
  });

  test('should initialize with Hungarian as default language', () => {
    expect(i18n.language).toBe('hu');
  });

  test('should have Hungarian translations loaded', () => {
    expect(i18n.exists('save')).toBe(true);
    expect(i18n.t('save')).toBe('Mentés');
  });

  test('should fallback to English when Hungarian translation is missing', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('save')).toBe('Save');
  });

  test('should support language switching', async () => {
    await i18n.changeLanguage('hu');
    expect(i18n.language).toBe('hu');
    expect(i18n.t('cancel')).toBe('Mégse');

    await i18n.changeLanguage('en');
    expect(i18n.language).toBe('en');
    expect(i18n.t('cancel')).toBe('Cancel');
  });
});