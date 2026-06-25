// =============================================================================
//  translate.js – logika tłumaczenia (Lower, Higher, fallback) + bufor zdań
// =============================================================================
//  Kaskada (sekcja 3 specyfikacji), z dywersyfikacją silników:
//    Stopień 1 + 2 : DWA niezależne darmowe silniki (Lingva, MyMemory) –
//                    kolejność z config.FREE_ENGINE_ORDER (zmiana jednej linii).
//    Stopień 3     : Higher (Claude API), jeśli podano klucz.
//    Stopień 4     : oryginał PL (ekran słuchacza nigdy nie milczy).
//
//  Eksportuje globalnie: window.Translator
//    .translate(text, { mode, apiKey })  -> Promise<{ text, source, pl }>
//    .makeBuffer(onSentence)             -> bufor zdań (sklejanie fragmentów)
// =============================================================================

(function () {
  'use strict';

  var CFG = window.APP_CONFIG || {};

  // --------------------------------------------------------------------------
  //  Pojedyncze silniki – każdy rzuca wyjątkiem, jeśli zawiedzie / trafi w limit
  // --------------------------------------------------------------------------

  // Stopień darmowy A: Lingva (fasada na Google Translate). Próbuje kolejnych
  // instancji z listy, bo publiczne bywają niestabilne.
  async function engineLingva(text) {
    var instances = CFG.LINGVA_INSTANCES || ['https://lingva.ml'];
    var lastErr = null;
    for (var i = 0; i < instances.length; i++) {
      var base = instances[i].replace(/\/+$/, '');
      var url = base + '/api/v1/pl/en/' + encodeURIComponent(text);
      try {
        var res = await fetchTimeout(url, {}, 7000);
        if (!res.ok) { lastErr = new Error('Lingva HTTP ' + res.status); continue; }
        var data = await res.json();
        if (data && data.translation) return data.translation.trim();
        lastErr = new Error('Lingva: brak pola translation');
      } catch (e) {
        lastErr = e; // spróbuj następnej instancji
      }
    }
    throw lastErr || new Error('Lingva: wszystkie instancje zawiodły');
  }

  // Stopień darmowy B: MyMemory (pamięć tłumaczeniowa).
  async function engineMyMemory(text) {
    var url = 'https://api.mymemory.translated.net/get?q=' +
      encodeURIComponent(text) + '&langpair=pl|en';
    if (CFG.MYMEMORY_EMAIL) url += '&de=' + encodeURIComponent(CFG.MYMEMORY_EMAIL);
    var res = await fetchTimeout(url, {}, 7000);
    if (!res.ok) throw new Error('MyMemory HTTP ' + res.status);
    var data = await res.json();
    // responseStatus != 200 to sygnał limitu / błędu -> dalej w kaskadę
    if (data && data.responseStatus && Number(data.responseStatus) !== 200) {
      throw new Error('MyMemory status ' + data.responseStatus);
    }
    var out = data && data.responseData && data.responseData.translatedText;
    if (!out) throw new Error('MyMemory: brak tłumaczenia');
    // MyMemory czasem zwraca komunikaty limitu w polu translatedText
    if (/MYMEMORY WARNING|QUOTA|YOU USED ALL/i.test(out)) {
      throw new Error('MyMemory: limit dzienny');
    }
    return out.trim();
  }

  // Stopień 3: Higher – Claude API (klucz podaje mówca w UI).
  async function engineHigher(text, apiKey) {
    if (!apiKey) throw new Error('Higher: brak klucza API');
    var res = await fetchTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: CFG.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: CFG.CLAUDE_MAX_TOKENS || 400,
        system: 'You are a live interpreter at an academic workshop. Translate the ' +
          'Polish input into natural, fluent English. Output ONLY the English ' +
          'translation, no notes, no quotes. Preserve academic register and terminology.',
        messages: [{ role: 'user', content: text }]
      })
    }, 12000);
    if (!res.ok) {
      if (res.status === 401) throw new Error('Higher: nieprawidłowy klucz API');
      throw new Error('Higher: API ' + res.status);
    }
    var data = await res.json();
    var out = data.content &&
      data.content.filter(function (b) { return b.type === 'text'; })
        .map(function (b) { return b.text; }).join(' ').trim();
    if (!out) throw new Error('Higher: pusta odpowiedź');
    return out;
  }

  var ENGINES = {
    lingva: engineLingva,
    mymemory: engineMyMemory,
  };

  // --------------------------------------------------------------------------
  //  Złóż kolejność kaskady dla danego trybu
  //    mode 'lower'  : darmowe (wg config) -> Higher (jeśli klucz) -> PL
  //    mode 'higher' : Higher -> darmowe (wg config) -> PL
  // --------------------------------------------------------------------------
  function buildCascade(mode, hasKey, freeOrder) {
    var free = (freeOrder || CFG.FREE_ENGINE_ORDER || ['lingva', 'mymemory']).slice();
    var steps = [];
    if (mode === 'higher' && hasKey) steps.push('higher');
    free.forEach(function (name) { if (ENGINES[name]) steps.push(name); });
    if (mode === 'lower' && hasKey) steps.push('higher');
    return steps; // PL fallback dokładany na końcu w translate()
  }

  // --------------------------------------------------------------------------
  //  Główna funkcja: przejdź kaskadę aż coś zadziała; ostatecznie zwróć PL.
  //  Zwraca { text, source, pl, failures }.
  // --------------------------------------------------------------------------
  async function translate(text, opts) {
    opts = opts || {};
    var mode = opts.mode || 'lower';
    var apiKey = (opts.apiKey || '').trim();
    var hasKey = !!apiKey;
    var clean = (text || '').trim();
    if (!clean) return { text: '', source: 'pl', pl: '', failures: 0 };

    var steps = buildCascade(mode, hasKey, opts.freeOrder);
    var failures = 0;
    var errors = [];

    for (var i = 0; i < steps.length; i++) {
      var name = steps[i];
      try {
        var fn = (name === 'higher')
          ? function () { return engineHigher(clean, apiKey); }
          : function () { return ENGINES[name](clean); };
        var out = await fn();
        if (out) return { text: out, source: name, pl: clean, failures: failures };
      } catch (e) {
        failures++;
        errors.push(name + ': ' + (e && e.message || e));
      }
    }

    // Stopień 4: wszystko zawiodło -> oryginał PL (dyskretny znacznik w UI).
    return { text: clean, source: 'pl', pl: clean, failures: failures, errors: errors };
  }

  // --------------------------------------------------------------------------
  //  fetch z timeoutem (AbortController) – żeby martwa instancja nie wisiała
  // --------------------------------------------------------------------------
  function fetchTimeout(url, options, ms) {
    options = options || {};
    var ctrl = new AbortController();
    var id = setTimeout(function () { ctrl.abort(); }, ms || 8000);
    options.signal = ctrl.signal;
    return fetch(url, options).finally(function () { clearTimeout(id); });
  }

  // ==========================================================================
  //  BUFOR ZDAŃ (sekcja 6) – sklejanie krótkich fragmentów w całe zdania
  // ==========================================================================
  //  Wyślij zdanie, gdy:
  //    • tekst kończy się .?! (koniec zdania), LUB
  //    • minęła pauza > PAUSE_MS od ostatniego fragmentu, LUB
  //    • bufor przekroczył MAX_CHARS (bardzo długie zdanie nie czeka w nieskończoność)
  //  makeBuffer(onSentence) zwraca obiekt z metodami:
  //    .push(finalChunk)  – dorzuć finalny fragment z Web Speech API
  //    .flush()           – wymuś wysłanie tego, co jest (np. Stop / Wyczyść)
  // --------------------------------------------------------------------------
  function makeBuffer(onSentence) {
    var cfg = CFG.BUFFER || {};
    var PAUSE = cfg.PAUSE_MS || 1200;
    var MAX = cfg.MAX_CHARS || 140;

    var buffer = '';
    var timer = null;

    function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }

    function emit() {
      clearTimer();
      var s = buffer.trim();
      buffer = '';
      if (s) onSentence(s);
    }

    function endsSentence(s) { return /[.?!…]["”’)]?\s*$/.test(s); }

    return {
      // bieżący podgląd (do pokazania jako "buforuję…")
      peek: function () { return buffer.trim(); },

      push: function (chunk) {
        if (!chunk) return;
        buffer += (buffer && !/\s$/.test(buffer) ? ' ' : '') + chunk.trim();
        clearTimer();

        if (endsSentence(buffer) || buffer.length >= MAX) {
          emit();
        } else {
          timer = setTimeout(emit, PAUSE);
        }
      },

      flush: emit,

      reset: function () { clearTimer(); buffer = ''; }
    };
  }

  // --------------------------------------------------------------------------
  window.Translator = {
    translate: translate,
    makeBuffer: makeBuffer,
    buildCascade: buildCascade, // eksport pomocniczy (np. do podglądu w UI)
  };
})();
