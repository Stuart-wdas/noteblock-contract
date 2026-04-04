export const ONBOARDING_GENRES = [
  'Afro House',
  'Amapiano',
  'Afrobeats',
  'Afro Soul',
  'Afro Pop',
  'Afro Tech',
  'Bongo Flava',
  'Highlife',
  'Maskandi',
  'Kizomba',
  'Kuduro',
  'Bacardi',
  '3 Step',
  'Hip Hop',
  'Rap',
  'Drill',
  'Boom Bap',
  'Lo-Fi Hip Hop',
  'R&B',
  'Pop',
  'Indie Pop',
  'Alternative',
  'Rock',
  'Indie Rock',
  'Trap',
  'Dancehall',
  'Reggae',
  'Reggaeton',
  'Soca',
  'Gqom',
  'Kwaito',
  'Electronic',
  'House',
  'Deep House',
  'Tech House',
  'Techno',
  'EDM',
  'Trance',
  'Drum & Bass',
  'Garage',
  'Soul',
  'Neo Soul',
  'Funk',
  'Blues',
  'Jazz',
  'Piano',
  'Acoustic',
  'Singer-Songwriter',
  'Folk',
  'Country',
  'Gospel',
  'Classical',
  'Orchestral',
  'Ambient',
  'Instrumental',
] as const;

export function parseStoredGenres(value: string | null | undefined) {
  if (!value) return [] as string[];
  const trimmed = value.trim();
  if (!trimmed) return [] as string[];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => String(entry).trim())
        .filter(Boolean);
    }
  } catch {
    // fall through to CSV parsing
  }

  return trimmed
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function serializeGenres(value: string[]) {
  const unique = Array.from(
    new Set(
      value
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
  return JSON.stringify(unique);
}
