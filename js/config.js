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
  SUPABASE_URL: 'https://unbbztvililescvfplqk.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_rY_RudCASdzEQX2Ff8B2iQ_0wk6bTDz',

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
  //    ['mymemory']            → tylko MyMemory
  //    ['lingva', 'mymemory']  → Lingva pierwsza, MyMemory jako fallback (domyślnie)
  //    ['mymemory', 'lingva']  → MyMemory pierwszy, Lingva jako zapas
  //
  //  STAN (2026-06): stopniem 1 jest WŁASNA instancja Lingva (patrz sekcja 3),
  //  która działa stabilnie z poprawnym CORS. MyMemory zostaje jako stopień 2
  //  (fallback) — gdy Lingva zwróci błąd lub timeout, kaskada płynnie przechodzi
  //  do MyMemory. Publiczne instancje Lingva (martwe: 500/403/CORS) usunięto.
  // ---------------------------------------------------------------------------
  FREE_ENGINE_ORDER: ['lingva', 'mymemory'],

  // ---------------------------------------------------------------------------
  //  3. LINGVA – lista instancji (fasada na Google Translate, bez klucza)
  // ---------------------------------------------------------------------------
  //  Stopień 1 kaskady to WŁASNA, samodzielnie postawiona instancja Lingva
  //  (Vercel). Endpoint REST: [URL]/api/v1/pl/en/[tekst] → JSON z polem
  //  translation. Apka próbuje kolejnej z listy, jeśli poprzednia nie odpowie
  //  (pierwsza = główna), więc tu można dopisać własne instancje zapasowe.
  //  Publiczne instancje społecznościowe (lingva.ml itd.) były martwe
  //  (500/403/CORS) i zostały usunięte.
  // ---------------------------------------------------------------------------
  LINGVA_INSTANCES: [
    'https://lingva-djm.vercel.app',
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
