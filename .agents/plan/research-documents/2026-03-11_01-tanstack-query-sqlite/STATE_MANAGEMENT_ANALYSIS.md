# Little Words - Complete State Management Catalog

## 1. USESTATESTATE INVENTORY

### App-Level Screens

#### `/app/(tabs)/words.tsx`
- **Line 32**: `const [words, setWords] = useState<Word[]>([])` → **server state** (loaded from DB)
- **Line 33**: `const [search, setSearch] = useState('')` → **local UI state** (search input)
- **Line 36**: `const [sort, setSort] = useState<SortKey>('date_desc')` → **local UI state** (sort preference)
- **Line 37**: `const [showSortMenu, setShowSortMenu] = useState(false)` → **local UI state** (menu visibility)
- **Line 38**: `const [refreshing, setRefreshing] = useState(false)` → **local UI state** (pull-to-refresh)
- **Line 39**: `const [showAddWord, setShowAddWord] = useState(false)` → **local UI state** (modal visibility)
- **Line 40**: `const [showAddVariant, setShowAddVariant] = useState(false)` → **local UI state** (modal visibility)
- **Line 41**: `const [showAddCategory, setShowAddCategory] = useState(false)` → **local UI state** (modal visibility)
- **Line 42**: `const [editCategory, setEditCategory] = useState<CategoryToEdit | null>(null)` → **local UI state** (selected category for edit)
- **Line 43**: `const [editWord, setEditWord] = useState<Word | null>(null)` → **local UI state** (selected word for edit)
- **Line 44**: `const [selectedWord] = useState<Word | null>(null)` → **local UI state** (unused - always null)
- **Line 45**: `const [editVariant, setEditVariant] = useState<Variant | null>(null)` → **local UI state** (selected variant for edit)

#### `/app/(tabs)/home.tsx` (Dashboard)
- **Line 23**: `const [stats, setStats] = useState<DashboardStats | null>(null)` → **server state** (loaded from DB)
- **Line 24**: `const [profile, setProfile] = useState<ChildProfile | null>(null)` → **server state** (loaded from DB settings)
- **Line 25**: `const [refreshing, setRefreshing] = useState(false)` → **local UI state** (pull-to-refresh)

#### `/app/(tabs)/settings.tsx`
- **Line 38**: `const [categories, setCategories] = useState<Category[]>([])` → **server state** (loaded from DB)
- **Line 39**: `const [editCategory, setEditCategory] = useState<CategoryToEdit | null>(null)` → **local UI state** (selected category for edit)
- **Line 40**: `const [showAddCategory, setShowAddCategory] = useState(false)` → **local UI state** (modal visibility)
- **Line 42**: `const [childName, setChildName] = useState('')` → **server state** (loaded from DB settings)
- **Line 43**: `const [childSex, setChildSex] = useState<'boy' | 'girl' | null>(null)` → **server state** (loaded from DB settings)
- **Line 44**: `const [googleConnected, setGoogleConnected] = useState(false)` → **server state** (Google Drive auth status)
- **Line 45**: `const [googleEmail, setGoogleEmail] = useState<string | null>(null)` → **server state** (Google account email)
- **Line 46**: `const [lastSync, setLastSync] = useState<string | null>(null)` → **server state** (last sync timestamp)
- **Line 47**: `const [syncing, setSyncing] = useState(false)` → **local UI state** (async operation flag)
- **Line 48**: `const [signingIn, setSigningIn] = useState(false)` → **local UI state** (async operation flag)
- **Line 49**: `const [exporting, setExporting] = useState(false)` → **local UI state** (async operation flag)
- **Line 50**: `const [saving, setSaving] = useState(false)` → **local UI state** (async operation flag)
- **Line 51**: `const [showImport, setShowImport] = useState(false)` → **local UI state** (modal visibility)

#### `/app/(tabs)/variants.tsx`
- **Line 24**: `const [variants, setVariants] = useState<Variant[]>([])` → **server state** (loaded from DB)
- **Line 25**: `const [filteredVariants, setFilteredVariants] = useState<Variant[]>([])` → **local UI state** (filtered by search)
- **Line 26**: `const [search, setSearch] = useState('')` → **local UI state** (search input)
- **Line 29**: `const [sort, setSort] = useState<SortKey>('date_desc')` → **local UI state** (sort preference)
- **Line 30**: `const [showSortMenu, setShowSortMenu] = useState(false)` → **local UI state** (menu visibility)
- **Line 31**: `const [refreshing, setRefreshing] = useState(false)` → **local UI state** (pull-to-refresh)
- **Line 32**: `const [showAddVariant, setShowAddVariant] = useState(false)` → **local UI state** (modal visibility)
- **Line 33**: `const [editVariant, setEditVariant] = useState<Variant | null>(null)` → **local UI state** (selected variant for edit)
- **Line 34**: `const [words, setWords] = useState<Word[]>([])` → **server state** (loaded from DB, used to find parent word)
- **Line 35**: `const [selectedWord, setSelectedWord] = useState<Word | null>(null)` → **local UI state** (parent word for variant)

#### `/app/onboarding.tsx`
- **Line 20**: `const [name, setName] = useState('')` → **local UI state** (form input)
- **Line 21**: `const [showPicker, setShowPicker] = useState(false)` → **local UI state** (date picker modal)
- **Line 22**: `const [loading, setLoading] = useState(false)` → **local UI state** (async operation)
- **Line 23-25**: `const [pickerDay, setPickerDay] = useState(...)` → **local UI state** (date picker wheels)
- **Line 24**: `const [pickerMonth, setPickerMonth] = useState(...)` → **local UI state** (date picker wheels)
- **Line 25**: `const [pickerYear, setPickerYear] = useState(...)` → **local UI state** (date picker wheels)

### Component-Level State

#### `/src/components/AddWordModal.tsx`
- **Line 50**: `const [word, setWord] = useState('')` → **local UI state** (form input)
- **Line 51**: `const [selectedCategory, setSelectedCategory] = useState<number | null>(null)` → **local UI state** (form input)
- **Line 52**: `const [dateAdded, setDateAdded] = useState(today)` → **local UI state** (form input)
- **Line 53**: `const [notes, setNotes] = useState('')` → **local UI state** (form input)
- **Line 54**: `const [editCategory, setEditCategory] = useState<CategoryToEdit | null>(null)` → **local UI state** (nested modal)
- **Line 55**: `const [showNewCategory, setShowNewCategory] = useState(false)` → **local UI state** (nested modal visibility)
- **Line 56**: `const [categories, setCategories] = useState<Category[]>([])` → **server state** (loaded in component)
- **Line 57**: `const [loading, setLoading] = useState(false)` → **local UI state** (async save operation)
- **Line 58**: `const [duplicate, setDuplicate] = useState<Word | null>(null)` → **server state** (duplicate check result)
- **Line 59**: `const [variants, setVariants] = useState<VariantEntry[]>([])` → **local UI state** (inline variant rows)
- **Line 60**: `const [existingVariants, setExistingVariants] = useState<Variant[]>([])` → **server state** (loaded from DB)
- **Line 61**: `const [editingVariantIds, setEditingVariantIds] = useState<Set<number>>(new Set())` → **local UI state** (inline edit tracking)
- **Line 62**: `const [editingVariantTexts, setEditingVariantTexts] = useState<Record<number, string>>({})` → **local UI state** (inline edit values)
- **Line 91**: `const [catScrolled, setCatScrolled] = useState(false)` → **local UI state** (scroll position)
- **Line 92**: `const [catAtEnd, setCatAtEnd] = useState(false)` → **local UI state** (scroll end flag)

#### `/src/components/AddCategoryModal.tsx`
- **Line 35**: `const [name, setName] = useState('')` → **local UI state** (form input)
- **Line 36**: `const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0])` → **local UI state** (form input)
- **Line 37**: `const [selectedEmoji, setSelectedEmoji] = useState(CATEGORY_EMOJIS[0])` → **local UI state** (form input)
- **Line 38**: `const [loading, setLoading] = useState(false)` → **local UI state** (async operation)

#### `/src/components/AddVariantModal.tsx`
- **Line 51**: `const [variant, setVariant] = useState('')` → **local UI state** (form input)
- **Line 52**: `const [dateAdded, setDateAdded] = useState(today)` → **local UI state** (form input)
- **Line 53**: `const [notes, setNotes] = useState('')` → **local UI state** (form input)
- **Line 54**: `const [loading, setLoading] = useState(false)` → **local UI state** (async operation)
- **Line 55**: `const [duplicate, setDuplicate] = useState<Variant | null>(null)` → **server state** (duplicate check)
- **Line 57**: `const [allWords, setAllWords] = useState<Word[]>([])` → **server state** (loaded when showing word search)
- **Line 58**: `const [wordSearch, setWordSearch] = useState('')` → **local UI state** (search input)
- **Line 59**: `const [chosenWord, setChosenWord] = useState<Word | null>(null)` → **local UI state** (selected word)

#### `/src/components/ImportModal.tsx`
- **Line 93**: `const [tab, setTab] = useState<'text' | 'csv'>('text')` → **local UI state** (tab selection)
- **Line 94**: `const [textInput, setTextInput] = useState('')` → **local UI state** (form input)
- **Line 95**: `const [csvFileName, setCsvFileName] = useState<string | null>(null)` → **local UI state** (file name)
- **Line 96**: `const [csvContent, setCsvContent] = useState<string | null>(null)` → **local UI state** (file content)
- **Line 97**: `const [loading, setLoading] = useState(false)` → **local UI state** (async import operation)
- **Line 98**: `const [preview, setPreview] = useState<ParsedRow[]>([])` → **local UI state** (preview rows)

#### `/src/components/DatePickerField.tsx`
- **Line 115**: `const [open, setOpen] = useState(false)` → **local UI state** (modal visibility)
- **Line 117**: `const [pd, setPd] = useState(parsed.d)` → **local UI state** (picker wheel day)
- **Line 118**: `const [pm, setPm] = useState(parsed.m)` → **local UI state** (picker wheel month)
- **Line 119**: `const [py, setPy] = useState(parsed.y)` → **local UI state** (picker wheel year)

#### `/src/i18n/i18n.tsx` (Provider)
- **Line 82**: `const [locale, setLocaleState] = useState<Locale>('en-US')` → **app global state** (current language)
- **Line 83**: `const [ready, setReady] = useState(false)` → **local UI state** (initialization flag)

---

## 2. USECONTEXT USAGE

### Context Definitions & Usage

**`I18nContext`** (defined in `/src/i18n/i18n.tsx:79`)
- **Provider**: `I18nProvider` wraps entire app (likely in `app/_layout.tsx`)
- **Consumers**:
  - `/src/i18n/i18n.tsx:141` - `useI18n()` hook
  - `/src/i18n/i18n.tsx:154` - `useCategoryName()` hook
  - EVERYWHERE: `useI18n()` is consumed in nearly every screen and modal:
    - `/app/(tabs)/words.tsx:22` - `const { t, tc } = useI18n()`
    - `/app/(tabs)/home.tsx:21` - `const { t } = useI18n()`
    - `/app/(tabs)/settings.tsx:33` - `const { t, locale, setLocale } = useI18n()`
    - `/app/(tabs)/variants.tsx:15` - `const { t, tc } = useI18n()`
    - `/app/onboarding.tsx:36` - `const { t } = useI18n()`
    - `/src/components/AddWordModal.tsx:29` - `const { t } = useI18n()`
    - `/src/components/AddCategoryModal.tsx:30` - `const { t } = useI18n()`
    - `/src/components/AddVariantModal.tsx:23` - `const { t } = useI18n()`
    - `/src/components/ImportModal.tsx:90` - `const { t, tc } = useI18n()`
    - `/src/components/DatePickerField.tsx:111` - `const { t, ta } = useI18n()`
    - `/src/components/BrandHeader.tsx` - likely uses it
    - And many more

**No other contexts are defined in the codebase** - only the i18n context.

---

## 3. USECALLBACK / USEMEMO USAGE

### useCallback Hooks

#### Data Loading Callbacks (performance for deps)
- `/app/(tabs)/words.tsx:47` - `load = useCallback(async (searchQuery?: string) => {...}, [])` → Loads words from DB with optional search
- `/app/(tabs)/home.tsx:27` - `load = useCallback(async () => {...}, [])` → Loads dashboard stats + child settings
- `/app/(tabs)/settings.tsx:67` - `useFocusEffect(useCallback(() => { load(); }, []))` → Loads settings data
- `/app/(tabs)/variants.tsx:48` - `load = useCallback(async () => {...}, [applySearch])` → Loads all variants + words
- `/app/(tabs)/variants.tsx:37` - `applySearch = useCallback((data: Variant[], text: string) => {...}, [])` → Filters variants by search

#### i18n Callbacks (memoized translation functions)
- `/src/i18n/i18n.tsx:95` - `setLocale = useCallback(async (next: Locale) => {...}, [])` → Changes language + persists
- `/src/i18n/i18n.tsx:100` - `t = useCallback((key: string, params?) => {...}, [locale])` → Translates key with params
- `/src/i18n/i18n.tsx:107` - `ta = useCallback((key: string) => {...}, [locale])` → Gets array from catalogue
- `/src/i18n/i18n.tsx:121` - `tc = useCallback((key: string, count: number, params?) => {...}, [locale])` → Pluralizes by count

#### Focus Effect Callbacks
- `/app/(tabs)/words.tsx:52` - `useFocusEffect(useCallback(() => { load(); }, [load]))`
- `/app/(tabs)/home.tsx:40` - `useFocusEffect(useCallback(() => { load(); }, [load]))`
- `/app/(tabs)/variants.tsx:56` - `useFocusEffect(useCallback(() => { load(); }, [load]))`

**No useMemo hooks found in the codebase.**

---

## 4. DATA PROP DRILLING

### Case 1: AddWordModal → Category Sub-Modal
**File**: `/src/components/AddWordModal.tsx`
- **Parent loads**: categories via `getCategories()`
- **Props passed to child**: `AddCategoryModal` receives:
  - `visible={showAddCategory || !!editCategory}`
  - `onClose={() => {...}}`
  - `onSave={() => { load(); ... }}`
  - `editCategory={editCategory}`
- **Drilling level**: 1 level (modal in modal) - acceptable
- **Alternative**: Categories could be fetched in the sub-modal instead

### Case 2: Words Screen → Modal Props (Light Drilling)
**File**: `/app/(tabs)/words.tsx`
- **Data loaded at screen level**: `words` state
- **Passed to modals**: 
  - `AddWordModal` receives `editWord={editWord}` (selectedword)
  - `AddVariantModal` receives `word={selectedWord}` + `editVariant={editVariant}`
  - `AddCategoryModal` receives `editCategory={editCategory}`
- **Drilling level**: 1 level - acceptable, these are sibling modal components

### Case 3: Settings → Category Display (No Drilling)
**File**: `/app/(tabs)/settings.tsx`
- **Data loaded at screen**: `categories` via `getCategories()`
- **Direct use**: Rendered inline in ScrollView
- **Modal receives**: `editCategory={editCategory}` - 1 level
- **No prop drilling concerns**

### Case 4: Variants Screen → Word Data Lookup
**File**: `/app/(tabs)/variants.tsx` lines 48-54
```tsx
const load = useCallback(async () => {
  const data = await getAllVariants();
  setVariants(data);
  applySearch(data, searchRef.current);
  const wordData = await getWords();  // Loaded just to find parent words!
  setWords(wordData);
}, [applySearch]);
```
- **Issue**: `words` is loaded purely to map `variant.word_id` → parent word name
- **Data**: Only used in `handleEditVariant` to find parent word (line 63)
- **Drilling**: Stored at screen level, passed to `AddVariantModal` as `word={selectedWord}`
- **Recommendation**: Could fetch single word on demand, or denormalize parent word name in variants table

---

## 5. DUPLICATE DATA LOADING

### Query: `getCategories()`
**Loaded in:**
1. `/app/(tabs)/settings.tsx:64` - `load()` function, line 64
2. `/src/components/AddWordModal.tsx:108` - useEffect on visible, line 108
3. `/src/components/AddCategoryModal.tsx` - (not explicitly, but modal handles its own data)
4. `/src/components/ImportModal.tsx:44` - `importRows()` function to check existing categories

**Impact**: Categories loaded in BOTH words screen modal AND settings screen. Settings screen page could call modal's load callback instead of duplicating.

### Query: `getWords()`
**Loaded in:**
1. `/app/(tabs)/words.tsx:47-49` - `load()` on words screen
2. `/app/(tabs)/variants.tsx:52` - `load()` on variants screen (line 52)
3. `/src/components/AddVariantModal.tsx:87` - When showing word search modal (line 87)

**Impact**: Words loaded on 3 separate pages, plus inside modals. This is necessary but could benefit from caching/memoization at app level.

### Query: `getSetting('child_name')`, `getSetting('child_sex')`, `getSetting('child_birth')`
**Loaded in:**
1. `/app/(tabs)/home.tsx:28-32` - Dashboard loads all via `Promise.all()` (lines 28-32)
2. `/app/(tabs)/settings.tsx:60-63` - Settings loads child_name and child_sex (lines 60-63)

**Impact**: Child settings loaded on 2 screens separately. 

### Query: `getSetting('google_last_sync')`, `getGoogleUserEmail()`, `isGoogleConnected()`
**Loaded in:**
1. `/app/(tabs)/settings.tsx:53-59` - All loaded together in `load()` (lines 53-59)

**Impact**: Only in settings, no duplication.

---

## 6. CUSTOM HOOKS

### 1. `useI18n()` 
**File**: `/src/i18n/i18n.tsx:140-144`
**Type**: Global state hook (via Context)
**Returns**: `I18nContextValue`
  - `locale: Locale` - current language
  - `setLocale: (locale: Locale) => Promise<void>` - change & persist language
  - `t: (key: string, params?) => string` - translate key
  - `ta: (key: string) => string[]` - get array from catalogue
  - `tc: (key: string, count: number, params?) => string` - pluralize
**Manages**: App global state (language setting)
**Usage**: 45+ locations across all screens and modals

### 2. `useCategoryName()`
**File**: `/src/i18n/i18n.tsx:153-161`
**Type**: Derived hook (wraps useI18n)
**Returns**: `(name: string) => string`
**Purpose**: Resolves category display names
  - If name is built-in category key (e.g., 'animals'), returns translated label
  - Otherwise returns name as-is (user-created categories)
**Manages**: No state - pure utility
**Usage**: 10+ locations (words screen, modals, settings, dashboard)

### No other custom hooks exist in the codebase

---

## SUMMARY STATISTICS

**Total useState calls**: ~63 instances
- **Server state**: ~25 (words, variants, categories, stats, profile, duplicates, etc.)
- **Local UI state**: ~38 (modals, inputs, toggles, loading flags)
- **App global state via Context**: 1 (`locale` in I18nContext)

**useCallback usage**: 12 instances
- **Data loading**: 5 (load functions on 4 screens)
- **Translation**: 4 (useI18n memoized functions)
- **Search/Filter**: 1 (variants search)
- **Focus effects**: 3 (wrapped load callbacks for screens)

**useContext usage**: 1 context (I18nContext)
- Consumed in 20+ locations

**Custom hooks**: 2
- `useI18n()` - **App global state**
- `useCategoryName()` - **Utility/derived hook**

**Prop drilling concerns**: Minimal (mostly modals 1 level deep)

**Duplicate data loading**: 3 queries duplicated across screens
- `getCategories()` - Settings + WordsModal
- `getWords()` - Words + Variants + VariantModal
- `child_*` settings - Home + Settings


---

## 7. RECOMMENDATIONS & OPTIMIZATION OPPORTUNITIES

### 🎯 Quick Wins

#### 1. **Remove unused state** (Low effort, immediate benefit)
- **Line 44** in `/app/(tabs)/words.tsx`: `const [selectedWord] = useState<Word | null>(null)` 
  - Declared but never used or updated
  - **Action**: Remove this line

#### 2. **Add caching layer for repeated queries** (Medium effort)
- Categories are loaded separately in:
  - `/app/(tabs)/settings.tsx` (line 64)
  - `/src/components/AddWordModal.tsx` (line 108)
- **Option A**: Create a `useCategoriesCache()` hook
  - Store in app context alongside `useI18n()`
  - Share via context provider
- **Option B**: Use React Query or SWR for automatic caching
- **Benefit**: Reduces DB queries and loading states

#### 3. **Memoize search/filter results** (Low effort)
- `/app/(tabs)/variants.tsx` - `filteredVariants` computed fresh on every render
- **Action**: Add `useMemo` to `applySearch` or wrap `filteredVariants` in useMemo
  ```tsx
  const filteredVariants = useMemo(() => {
    return variants.filter(v =>
      v.variant.toLowerCase().includes(search.toLowerCase()) ||
      (v.main_word || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [variants, search]);
  ```
- **Benefit**: Prevents unnecessary re-renders of FlatList

---

### 📦 Medium-term Improvements

#### 4. **Create a "Child Profile" context** (Medium effort)
Currently child settings are loaded separately:
- Dashboard loads: `child_name`, `child_sex`, `child_birth` (3 queries)
- Settings loads: `child_name`, `child_sex` (2 queries)

**Suggested approach:**
```tsx
// Create ChildProfileContext similar to I18nContext
interface ChildProfile {
  name: string;
  sex: 'boy' | 'girl' | null;
  birth: string;
}

// useChildProfile() hook
const useChildProfile = (): ChildProfile | null => {
  const ctx = useContext(ChildProfileContext);
  return ctx;
};
```
- **Benefit**: Single source of truth, eliminates query duplication
- **Effort**: ~2-3 hours (create context, provider, hook, update screens)
- **Impact**: Significant UX improvement (faster dashboard/settings loads)

#### 5. **Create a "Categories" context** (Medium effort)
Similar to child profile approach:
```tsx
interface CategoriesContextValue {
  categories: Category[];
  loading: boolean;
  refresh: () => Promise<void>;
}

const useCategoriesContext = (): CategoriesContextValue => {
  const ctx = useContext(CategoriesContext);
  return ctx;
};
```
- **Benefit**: Share categories across Words, Settings, and Modals
- **Usage locations to update**:
  - `/app/(tabs)/words.tsx` - removes local categories state
  - `/app/(tabs)/settings.tsx` - removes local categories state
  - `/src/components/AddWordModal.tsx` - uses context instead of loading
  - `/src/components/AddCategoryModal.tsx` - uses context
  - `/src/components/ImportModal.tsx` - uses context
- **Effort**: ~3-4 hours
- **ROI**: Very high (used in 5 places)

#### 6. **Move variant word lookup optimization** (Low-medium effort)
**Current issue**: `/app/(tabs)/variants.tsx` loads ALL words just to find parent word names

**Solution options:**
- **Option A** (Easy): Load word on-demand when editing
  ```tsx
  const handleEditVariant = async (variant: Variant) => {
    const word = await getWordById(variant.word_id);
    setSelectedWord(word);
    setEditVariant(variant);
    setShowAddVariant(true);
  };
  ```
  
- **Option B** (Better): Denormalize `main_word` in variants table (already done! Line 87 of variants.tsx shows `v.main_word`)
  - This means the query already has parent word name!
  - **Action**: Verify if `main_word` is fully populated, simplify load function

---

### 🏗️ Long-term Architecture Considerations

#### 7. **Consider a state management library** (Large effort)
If the app grows to handle:
- Multiple child profiles
- Offline-first sync
- Complex real-time updates

**Candidates:**
- **Zustand** (lightweight, 2-3 KB)
  ```tsx
  const useStore = create((set) => ({
    locale: 'en-US',
    setLocale: (l) => set({ locale: l }),
    categories: [],
    setCategories: (c) => set({ categories: c }),
  }));
  ```
  
- **Redux Toolkit** (heavier but very structured)
- **TanStack Query (React Query)** (for async state only)

**Current code is fine without this** - only consider if app complexity increases 2-3x

#### 8. **Type-safe async state machine** (Low-medium effort)
Many components repeat this pattern:
```tsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
```

**Create a generic hook:**
```tsx
function useAsyncState<T>(asyncFn: () => Promise<T>, deps?: any[]) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: false, error: null });
  
  useEffect(() => {
    setState(s => ({ ...s, loading: true }));
    asyncFn()
      .then(data => setState({ data, loading: false, error: null }))
      .catch(error => setState(s => ({ ...s, loading: false, error })));
  }, deps);
  
  return state;
}
```

- **Usage**: Replace 3 useState calls with 1 useAsyncState
- **Benefit**: Less boilerplate, consistent error handling
- **Locations to apply**: 10+ components have async state

---

## ACTION PLAN (Priority Order)

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Remove unused `selectedWord` state from words.tsx
2. ✅ Add `useMemo` to variant filter in variants.tsx
3. ✅ Document current state (this file!)

### Phase 2: Medium Priority (4-6 hours)
4. ✅ Create `useChildProfileContext` and provider
5. ✅ Update Dashboard and Settings to use context
6. ✅ Create `useCategoriesContext` and provider
7. ✅ Update Words, Settings, and Modals to use context

### Phase 3: Polish (2-3 hours)
8. ✅ Optimize variants word lookup (verify denormalization)
9. ✅ Create `useAsyncState` generic hook
10. ✅ Refactor 5+ components to use it

### Phase 4: Optional Long-term (if needed)
11. ⚠️  Consider state library if complexity grows
12. ⚠️  Add TanStack Query for advanced caching needs

---

## FILES TO MONITOR FOR STATE CHANGES

When making state management changes, prioritize review of:

### Core State Files
- `/src/i18n/i18n.tsx` - I18n provider & hooks (should be reference implementation)
- `/app/_layout.tsx` - App root provider wrapper (check it wraps I18nProvider)

### High State Complexity
- `/src/components/AddWordModal.tsx` - 14 useState calls (potential for refactoring)
- `/app/(tabs)/settings.tsx` - 12 useState calls with async operations
- `/app/(tabs)/words.tsx` - 12 useState calls across modals

### Heavy Data Loading
- `/app/(tabs)/variants.tsx` - Loads words unnecessarily
- `/src/components/AddWordModal.tsx` - Loads categories on open
- `/src/components/AddVariantModal.tsx` - Loads all words for search

---

## APPENDIX: All State by Category

### 🔵 Server State (needs persistence/DB)
- `words`, `variants`, `categories` (primary data)
- `stats`, `profile` (calculated/derived)
- `duplicate` (from duplicate check query)
- `googleConnected`, `googleEmail`, `lastSync` (auth/sync status)
- `childName`, `childSex` (settings)
- `existingVariants` (DB query result)
- `allWords` (DB query result)
- `csvContent` (imported file)

### 🟠 Local UI State (ephemeral)
- `search`, `filteredVariants` (user input processing)
- `sort`, `showSortMenu` (UI preferences - session-only)
- `refreshing` (loading indicator)
- `showAddWord`, `showAddVariant`, `showAddCategory` (modal visibility)
- `loading`, `syncing`, `signingIn`, `exporting`, `saving` (async flags)
- `editWord`, `editVariant`, `editCategory` (form context)
- `word`, `variant`, `notes`, `dateAdded` (form inputs)
- `pd`, `pm`, `py` (date picker wheels)
- `tab`, `textInput`, `preview` (import wizard state)
- `catScrolled`, `catAtEnd` (scroll tracking)

### 🟢 Global App State
- `locale` (current language) - in I18nContext
- (Candidate for context): `categories`, `childProfile`

