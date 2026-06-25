# Tłumacz na żywo – Szkoła Metodologiczna UŚ

Aplikacja webowa do tłumaczenia na żywo wypowiedzi prowadzącego (polski) na
napisy po angielsku, wyświetlane na ekranach uczestników w tej samej sali.

**Model:** jeden mówca → wielu słuchaczy, połączeni jednym wspólnym linkiem.
Rozpoznawanie mowy i tłumaczenie dzieje się **po stronie mówcy**; gotowe
angielskie zdania są rozsyłane przez Supabase Broadcast do wszystkich słuchaczy.

```
index.html      → wybór roli (Mówca / Słuchacz)
speaker.html    → ekran mówcy: mikrofon → STT → bufor zdań → tłumaczenie → broadcast
listener.html   → ekran słuchacza: subskrypcja → widok teleprompter (duże napisy)
```

---

## 1. Wklejenie kluczy Supabase

Supabase pełni tu wyłącznie rolę kanału real-time. **Nie przechowujemy żadnych
danych** w bazie – tekst tylko przepływa (to upraszcza i omija kwestie RODO).

1. Wejdź na <https://supabase.com> → **New project**.
   - Nazwa: np. `tlumacz-warsztat`. Region: **Frankfurt (eu-central-1)**.
   - Ustaw hasło do bazy (zapisz w menedżerze haseł – w apce nie jest potrzebne).
2. W projekcie: **Project Settings → API**. Skopiuj dwie wartości:
   - **Project URL** (np. `https://xxxx.supabase.co`)
   - **anon public key** (długi token zaczynający się od `eyJ…`)
3. Otwórz **`js/config.js`** i wklej je:

   ```js
   SUPABASE_URL: 'https://xxxx.supabase.co',
   SUPABASE_ANON_KEY: 'eyJhbGciOi...',
   ```

> ⚠️ Używaj klucza **anon public** – nigdy `service_role`. Klucz anon jest
> bezpieczny w kodzie front-endu, takie jest jego przeznaczenie.

Realtime (tryb Broadcast) jest włączony domyślnie – nie trzeba tworzyć tabel
ani ustawiać RLS. Kanał ma stałą nazwę `workshop-live` (też w `config.js`).

### Pozostałe ustawienia w `js/config.js`

| Klucz | Do czego |
|---|---|
| `FREE_ENGINE_ORDER` | Kolejność dwóch darmowych silników. **Zamiana = jedna linia**, np. `['mymemory','lingva']`. |
| `LINGVA_INSTANCES` | Lista instancji Lingva (próbowane po kolei, gdy główna padnie). |
| `MYMEMORY_EMAIL` | Opcjonalny e-mail – darmowo podnosi dzienny limit MyMemory. |
| `CLAUDE_MODEL` | Model dla trybu Higher (domyślnie `claude-haiku-4-5-20251001`). |
| `BUFFER` | Próg buforowania zdań (pauza / długość). |
| `LISTENER` | Ile zdań widać u słuchacza, odstęp domykania akapitu. |

---

## 2. Uruchomienie lokalne

To statyczne pliki, ale ze względu na `fetch` i moduły **otwórz je przez serwer
HTTP**, a nie jako `file://`. Najprościej:

```bash
# w katalogu projektu – dowolne z poniższych:
python3 -m http.server 8000
# lub
npx serve .
```

Następnie w przeglądarce **Chrome**:

- Mówca:    <http://localhost:8000/speaker.html>
- Słuchacz: <http://localhost:8000/listener.html>
- Start:    <http://localhost:8000/> (wybór roli)

**Uwaga o rozpoznawaniu mowy:** Web Speech API działa w Chrome (Android /
desktop). Na `localhost` mikrofon działa; na innych hostach wymaga HTTPS.

### Podgląd widoku słuchacza bez Supabase

Dopisz `?demo` do adresu, by zobaczyć układ teleprompter na atrapie danych
(przydatne do oceny czcionki/odległości):

<http://localhost:8000/listener.html?demo>

---

## 3. Odporność na awarię tłumaczenia (kaskada)

Ekran słuchacza **nigdy nie milknie**. Każde zdanie przechodzi kaskadę:

1. **Lingva** (fasada na Google Translate) – darmowy silnik A
2. **MyMemory** (pamięć tłumaczeniowa) – darmowy silnik B *(niezależny od A)*
3. **Higher (Claude)** – jeśli w trybie Higher wpisano klucz API
4. **Oryginał PL** – dyskretny, wyszarzony, z kropką, gdy wszystko inne zawiedzie

Dwa pierwsze stopnie to **różne, niezależne** darmowe silniki – gdy jeden
trafi w limit, drugi zwykle działa. Kolejność (1 ↔ 2) zmienia się jedną linią
w `config.js` (`FREE_ENGINE_ORDER`). Tryb **Higher** stawia Claude na początku
kaskady (a darmowe jako zapas).

Panel mówcy pokazuje na żywo: bieżące źródło tłumaczenia, licznik błędów, stan
połączenia i liczbę podłączonych słuchaczy.

---

## 4. Deployment na Vercel

1. Wrzuć projekt na GitHub.
2. <https://vercel.com> → zaloguj przez GitHub → **Add New → Project** → wybierz
   repozytorium.
3. **Framework preset: Other.** Build command: *brak*. Output directory: `/`
   (katalog główny). To czysto statyczny projekt – nic się nie buduje.
4. **Deploy.** Dostajesz adres `https://twoj-projekt.vercel.app`.
5. Linki:
   - Twój ekran:  `…/speaker.html`
   - Dla słuchaczy: `…/listener.html` (albo rozsyłaj sam adres główny – `index.html`
     pozwala wybrać rolę).
6. QR z linkiem słuchacza możesz wrzucić na slajd – uczestnicy skanują i są w środku.

Na Vercel (HTTPS, prawdziwa domena) tryb Higher (Claude) działa bez problemu CORS.

---

## 5. Tuż przed warsztatem (skrót checklisty)

- **Obudź projekt Supabase** – darmowy tier usypia po ~7 dniach bezczynności
  (wejście do panelu lub otwarcie apki budzi go w ~30–60 s). Możesz to
  zautomatyzować – patrz sekcja 6 niżej.
- Otwórz `speaker.html` na telefonie, `listener.html` na drugim urządzeniu –
  powiedz jedno zdanie, potwierdź, że dociera.
- **Porównaj Lingva vs MyMemory** na kilku swoich typowych zdaniach i ustaw
  lepszy jako pierwszy w `FREE_ENGINE_ORDER`.
- Test długiej sesji (~5 min ciągłej mowy) – STT auto-restartuje się w tle.
- Mikrofon blisko ust (kieszeń / lavalier / mównica) – to klucz do jakości STT.
- Powtarzaj pytania z sali do mikrofonu, zanim odpowiesz.

---

## 6. (Opcjonalnie) Keep-alive – „ustaw i zapomnij"

Żeby nie budzić Supabase ręcznie, w repo jest workflow GitHub Actions
**`.github/workflows/supabase-keepalive.yml`**, który co 5 dni wysyła jedno
żądanie do projektu. Jest **niezależny od apki**.

Konfiguracja (raz): GitHub → repo → **Settings → Secrets and variables →
Actions → New repository secret**, dodaj:

- `SUPABASE_URL` = `https://xxxx.supabase.co`
- `SUPABASE_ANON_KEY` = `eyJ…`

Możesz też odpalić go ręcznie w zakładce **Actions** („Run workflow"), by od
razu sprawdzić, że działa. Nie wchodzi w drogę apce – jeśli go nie potrzebujesz,
po prostu usuń ten plik.

---

## Stos technologiczny

Waniliowy HTML / CSS / JS, bez frameworka. Jedyna zależność: biblioteka
[`@supabase/supabase-js`](https://github.com/supabase/supabase-js) ładowana z CDN,
**przypięta do wersji `2.108.2`**. Wymagana wersja **≥ 2.50**, bo projekt używa
nowego klucza **publishable** (`sb_publishable_…`) — starsze linie (np. 2.49)
nie wysyłają go poprawnie do Realtime i kanał kończy się `CHANNEL_ERROR`.
Rozpoznawanie mowy: Web Speech API (`pl-PL`). Tłumaczenie: MyMemory (darmowe,
domyślne) oraz opcjonalnie Claude API (Higher); Lingva dostępna, ale wyłączona
(CORS).
