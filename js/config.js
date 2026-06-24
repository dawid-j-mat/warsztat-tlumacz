// =============================================================================
//  KONFIGURACJA – Tłumacz na żywo (Szkoła Metodologiczna UŚ)
// =============================================================================
//  Jedyny plik, który musisz edytować przed warsztatem.
//  Wklej tu dwie wartości z panelu Supabase oraz (opcjonalnie) swój e-mail.
// =============================================================================

window.APP_CONFIG = {

  // ---------------------------------------------------------------------------
  //  1. SUPABASE  (kanał real-time / broadcast)
  // ---------------------------------------------------------------------------
  //  Gdzie to znaleźć:
  //    supabase.com → Twój projekt → Project Settings → API
  //      • Project URL      → wklej do SUPABASE_URL
  //      • anon public key  → wklej do SUPABASE_ANON_KEY  (zaczyna się od "eyJ…")
  //  UWAGA: używaj klucza "anon public", NIGDY "service_role".
  //  Klucz anon jest bezpieczny w kodzie front-endu – takie jest jego przeznaczenie.
  // ---------------------------------------------------------------------------
  SUPABASE_URL: 'https://unbbztvililescvfplqk.supabase.co/rest/v1/',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmJ6dHZpbGlsZXNjdmZwbHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjE0NjYsImV4cCI6MjA5Nzg5NzQ2Nn0.0fbSzDzMY1waJd4zoIwoPOhQl3RmdutfGSY-WK6h3z0',

  // Stała nazwa kanału broadcast. Jeden kanał = jeden wspólny link.
  // (Na przyszłość: można tu wstawić kod sesji, by mieć wiele równoległych warsztatów.)
  CHANNEL: 'workshop-live',

  // ---------------------------------------------------------------------------
  //  2. TŁUMACZENIE – kolejność darmowych silników (kaskada, sekcja 3 specyfikacji)
  // ---------------------------------------------------------------------------
  //  Dwa pierwsze stopnie kaskady to NIEZALEŻNE darmowe silniki.
  //  Aby zamienić ich kolejność (np. po teście jakości na realnym materiale),
  //  zmień TĘ JEDNĄ LINIĘ. Dozwolone wartości w tablicy: 'lingva', 'mymemory'.
  //
  //    ['lingva', 'mymemory']  → najpierw Lingva (Google Translate), potem MyMemory
  //    ['mymemory', 'lingva']  → najpierw MyMemory, potem Lingva
  // ---------------------------------------------------------------------------
  FREE_ENGINE_ORDER: ['lingva', 'mymemory'],

  // ---------------------------------------------------------------------------
  //  3. LINGVA – lista instancji (fasada na Google Translate, bez klucza)
  // ---------------------------------------------------------------------------
  //  Publiczne instancje społecznościowe bywają niestabilne. Apka próbuje
  //  kolejnej z listy, jeśli poprzednia nie odpowie. Pierwsza = główna.
  //  Jeśli któraś przestanie działać – po prostu zmień kolejność / dopisz nową.
  // ---------------------------------------------------------------------------
  LINGVA_INSTANCES: [
    'https://lingva.ml',
    'https://lingva.lunar.icu',
    'https://translate.plausibility.cloud',
    'https://lingva.garudalinux.org',
  ],

  // ---------------------------------------------------------------------------
  //  4. MYMEMORY – opcjonalny e-mail zwiększający dzienny limit znaków
  // ---------------------------------------------------------------------------
  //  Darmowo podnosi dzienny limit. Zostaw pusty string, by nie wysyłać e-maila.
  //  np. MYMEMORY_EMAIL: 'twoj@email.pl'
  // ---------------------------------------------------------------------------
  MYMEMORY_EMAIL: '',

  // ---------------------------------------------------------------------------
  //  5. HIGHER – Claude API (opcjonalne, płatne; klucz wpisuje się w UI mówcy)
  // ---------------------------------------------------------------------------
  //  Stopień 3 kaskady. Klucza NIE wpisuje się tutaj – mówca podaje go w panelu
  //  speaker.html (pole pojawia się po przełączeniu na tryb Higher).
  // ---------------------------------------------------------------------------
  CLAUDE_MODEL: 'claude-haiku-4-5-20251001',
  CLAUDE_MAX_TOKENS: 400,

  // ---------------------------------------------------------------------------
  //  6. BUFOR ZDAŃ (sekcja 6 specyfikacji) – kiedy wysłać zdanie do tłumaczenia
  // ---------------------------------------------------------------------------
  BUFFER: {
    PAUSE_MS: 1200,   // wyślij po tej pauzie od ostatniego fragmentu
    MAX_CHARS: 140,   // wyślij, gdy bufor przekroczy tę długość (bardzo długie zdania)
  },

  // ---------------------------------------------------------------------------
  //  7. WIDOK SŁUCHACZA (teleprompter)
  // ---------------------------------------------------------------------------
  LISTENER: {
    MAX_SENTENCES: 3,      // ile ostatnich zdań trzymać na ekranie (2–3)
    PARAGRAPH_GAP_MS: 4500, // po tej ciszy kolejne zdanie zaczyna nowy blok
  },
};
