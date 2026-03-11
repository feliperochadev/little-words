# Testing Standards

---

## Directory Layout

```
__tests__/
  unit/         Pure logic — no rendering (helpers, parsers, date utils, i18n catalogues)
  integration/  Component render tests (RNTL) — modals, UI components, database layer
  screens/      Full screen render tests
  e2e/          Maestro YAML flows
  helpers/      renderWithProviders, shared setup
```

Test file names mirror the source with a `.test.ts(x)` suffix:
- `src/utils/importHelpers.ts` → `__tests__/unit/importHelpers.test.ts`
- `src/components/AddWordModal.tsx` → `__tests__/integration/AddWordModal.test.tsx`
- `app/(tabs)/words.tsx` → `__tests__/screens/words.test.tsx`

---

## Jest Conventions

### Describe / it structure

```ts
describe('AddWordModal', () => {           // module or component name
  beforeEach(() => { jest.clearAllMocks(); });

  it('saves a new word on submit', async () => { ... });   // present-tense behaviour
  it('shows an error when word is empty', async () => { ... });
});
```

- `describe` = module/component name
- `it` = present-tense description of the *behaviour* being tested
- `jest.clearAllMocks()` in `beforeEach` — not `jest.resetAllMocks()` (which clears implementations, breaking spies)

### Mocking strategy

```ts
// ✅ Do — mock at module boundary
jest.mock('../../src/database/database', () => ({
  query: jest.fn(),
  run: jest.fn(),
}));

// ✅ Do — jest.spyOn for partial mocking
jest.spyOn(wordService, 'getWords').mockResolvedValue([]);

// ❌ Don't — mock the thing being tested
jest.mock('../../src/components/AddWordModal');
```

- Database mocked at `database.ts` level — never at service or hook level
- `global.__mockDb` exposes the shared mock DB instance (set up in `jest.setup.js`)

### Component tests

Always wrap in `renderWithProviders`:

```ts
import { renderWithProviders } from '../helpers/renderWithProviders';

it('renders the word list', async () => {
  const { getByTestId } = renderWithProviders(<WordsScreen />);
  expect(getByTestId('words-screen')).toBeTruthy();
});
```

Seed Zustand state before rendering:

```ts
beforeEach(() => {
  useSettingsStore.setState({ name: 'Ana', sex: 'F', birth: '2023-01-01', isOnboardingDone: true });
  useAuthStore.setState({ isConnected: false, email: null, lastSync: null });
});
```

### Selectors — testID over text

```ts
// ✅ Do
expect(getByTestId('add-word-button')).toBeTruthy();
await userEvent.press(getByTestId('add-word-button'));

// ❌ Don't (fragile — breaks on translation changes)
expect(getByText('Add Word')).toBeTruthy();
```

`getByText` is acceptable only for OS-level alerts (which can't have testIDs) or unique, stable hardcoded strings that are never translated.

### `userEvent` vs `fireEvent`

Prefer `userEvent` (RNTL 12+) for more realistic user interactions:

```ts
// ✅ Do
import { userEvent } from '@testing-library/react-native';
await userEvent.press(getByTestId('save-button'));
await userEvent.type(getByTestId('word-input'), 'banana');

// ❌ Don't (use only when userEvent isn't viable)
fireEvent.press(getByTestId('save-button'));
```

### Async assertions

```ts
// ✅ Do — waitFor with assertion
await waitFor(() => expect(getByTestId('word-item-banana')).toBeTruthy());

// ❌ Don't — bare waitFor
await waitFor(() => {});
```

---

## Coverage Floor

| Metric | Minimum |
|---|---|
| Lines | 99% on changed code |
| Functions | 95% on changed code |
| Branches | 95% on changed code |
| Statements | 95% on changed code |

Coverage is a floor, not a goal. A test that touches a line without asserting behaviour is a false pass. Always assert the output, side effect, or rendered element.

Run with: `npm run test:coverage`

---

## Maestro (E2E)

### Selectors

Always use `id:` selectors — never assert by text on app-rendered elements:

```yaml
# ✅ Do
- assertVisible:
    id: "word-item-banana"
- tapOn:
    id: "add-word-button"

# ❌ Don't
- assertVisible: "banana"
- tapOn: "Add Word"
```

Text assertions are only acceptable for OS-level alerts.

### Dynamic list item testIDs

List items must include the item key so individual entries are addressable:

```tsx
// ✅ Do
testID={`word-item-${item.word}`}
testID={`import-preview-word-${row.word}`}
```

### Scroll before assert

Never assert an element that may be below the fold without first scrolling:

```yaml
# ✅ Do
- scrollUntilVisible:
    element:
      id: "save-button"
- assertVisible:
    id: "save-button"
```

### Animation and keyboard

```yaml
# After modal open/close, navigation, or form submission:
- waitForAnimationToEnd

# After hideKeyboard:
- hideKeyboard
- waitForAnimationToEnd
# Then scroll or assert
```

### Text input

- `\n` in double-quoted YAML strings does **not** reliably produce a newline in a `TextInput`.
- For single-word import tests, input one word with no newlines.
- Do not use `pressKey: Enter` to simulate newlines — behavior is inconsistent.
