export interface KeepsakeWord {
  id: number;
  word: string;
  dateAdded: string;
  photoUri: string | null;
  categoryEmoji: string | null;
}

export interface KeepsakeState {
  isGenerated: boolean;
  generatedAt: string | null;
  photoOverrides: Record<number, string>; // wordId -> photo URI
}
