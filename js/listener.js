// =============================================================================
//  listener.js – ekran słuchacza (widok teleprompter)
// =============================================================================
//  Subskrybuje kanał broadcast Supabase i pokazuje TYLKO ostatnie 2–3 zdania.
//  Najnowsze zdanie jest na dole, największe i najjaśniejsze; starsze gasną.
//
//  Tryb podglądu: dopisz ?demo do adresu, by zobaczyć układ na atrapie danych
//  (bez Supabase).
// =============================================================================

(function () {
  'use strict';

  var CFG = window.APP_CONFIG || {};
  var MAX = (CFG.LISTENER && CFG.LISTENER.MAX_SENTENCES) || 3;
  var PARA_GAP = (CFG.LISTENER && CFG.LISTENER.PARAGRAPH_GAP_MS) || 4500;

  var $tele = document.getElementById('tele');
  var $idle = document.getElementById('idle');
  var $conn = document.getElementById('conn');
  var $connText = document.getElementById('connText');
  var $plToggle = document.getElementById('plToggle');

  var showPL = false;
  var lastTs = 0;           // czas ostatniego zdania (do domykania akapitu)
  var sentences = [];       // [{en, pl, newPara, el}] – tylko widoczne

  // --- Diagnostyka (widoczna w konsoli słuchacza) ---
  console.log('[listener] init', {
    search: window.location.search,
    hasSupabaseLib: typeof window.supabase !== 'undefined',
    channel: CFG.CHANNEL,
    urlSet: !!(CFG.SUPABASE_URL && CFG.SUPABASE_URL.indexOf('TWOJ_') !== 0),
    keySet: !!(CFG.SUPABASE_ANON_KEY && CFG.SUPABASE_ANON_KEY.indexOf('TWOJ_') !== 0),
    // pokaż sam początek URL-a, żeby wychwycić błędne /rest/v1 itp. (bez sekretów)
    urlPreview: (CFG.SUPABASE_URL || '').slice(0, 40)
  });

  // --------------------------------------------------------------------------
  //  Render: pokaż ostatnie MAX zdań, przypisz klasy s0 (najnowsze) … s2
  // --------------------------------------------------------------------------
  function render() {
    if (sentences.length === 0) {
      $idle.style.display = '';
      return;
    }
    $idle.style.display = 'none';

    // ostatnie MAX zostają; resztę usuwamy (z animacją wygaszenia)
    while (sentences.length > MAX) {
      var old = sentences.shift();
      if (old.el && old.el.parentNode) {
        old.el.classList.add('out');
        (function (node) {
          setTimeout(function () {
            if (node && node.parentNode) node.parentNode.removeChild(node);
          }, 650);
        })(old.el);
      }
    }

    // przypisz klasy pozycji: najnowsze (ostatnie w tablicy) = s0
    for (var i = 0; i < sentences.length; i++) {
      var s = sentences[i];
      var posFromNewest = sentences.length - 1 - i; // 0 = najnowsze
      s.el.className = 'tele-line s' + Math.min(posFromNewest, 2);
      if (s.newPara) s.el.classList.add('new-para');
      togglePLOn(s);
    }
  }

  function togglePLOn(s) {
    var plEl = s.el.querySelector('.pl');
    if (!plEl) return;
    if (showPL && s.pl) plEl.classList.remove('hidden');
    else plEl.classList.add('hidden');
  }

  // --------------------------------------------------------------------------
  //  Dodaj nowe zdanie
  // --------------------------------------------------------------------------
  function addSentence(en, pl) {
    var now = Date.now();
    var newPara = lastTs > 0 && (now - lastTs) > PARA_GAP;
    lastTs = now;

    var el = document.createElement('div');
    el.className = 'tele-line enter';

    var enSpan = document.createElement('span');
    enSpan.className = 'en';
    enSpan.textContent = en;
    el.appendChild(enSpan);

    if (pl) {
      var plSpan = document.createElement('span');
      plSpan.className = 'pl hidden';
      plSpan.textContent = pl;
      el.appendChild(plSpan);
    }

    $tele.appendChild(el);
    // wymuś reflow, potem zdejmij klasę 'enter' żeby animacja wejścia ruszyła
    void el.offsetWidth;
    el.classList.remove('enter');

    sentences.push({ en: en, pl: pl, newPara: newPara, el: el });
    render();
  }

  function clearAll() {
    sentences.forEach(function (s) {
      if (s.el && s.el.parentNode) s.el.parentNode.removeChild(s.el);
    });
    sentences = [];
    lastTs = 0;
    render();
  }

  // --------------------------------------------------------------------------
  //  Przełącznik PL
  // --------------------------------------------------------------------------
  $plToggle.addEventListener('click', function () {
    showPL = !showPL;
    $plToggle.classList.toggle('active', showPL);
    $plToggle.textContent = showPL ? 'Ukryj PL' : 'Pokaż PL';
    sentences.forEach(togglePLOn);
  });

  // --------------------------------------------------------------------------
  //  Stan połączenia (dyskretna kropka)
  // --------------------------------------------------------------------------
  function setConn(state, text) {
    $conn.className = 'conn ' + state; // ok | off | retry
    $connText.textContent = text;
  }

  // ==========================================================================
  //  TRYB DEMO – atrapa danych do podglądu układu (bez Supabase)
  // ==========================================================================
  function runDemo() {
    setConn('ok', 'demo');
    var samples = [
      { pl: 'Dzień dobry, witam wszystkich na dzisiejszym warsztacie.',
        en: 'Good morning, welcome everyone to today’s workshop.' },
      { pl: 'Zacznijmy od krótkiego wprowadzenia do metodologii.',
        en: 'Let us begin with a short introduction to the methodology.' },
      { pl: 'Kluczowe pytanie brzmi: jak weryfikujemy nasze hipotezy?',
        en: 'The key question is: how do we verify our hypotheses?' },
      { pl: 'W kolejnej części przejdziemy do konkretnych przykładów.',
        en: 'In the next part we will move on to concrete examples.' },
      { pl: 'Proszę zwrócić uwagę na rozróżnienie tych dwóch pojęć.',
        en: 'Please note the distinction between these two concepts.' },
    ];
    var i = 0;
    (function next() {
      addSentence(samples[i].en, samples[i].pl);
      i = (i + 1) % samples.length;
      setTimeout(next, 3500);
    })();
  }

  // ==========================================================================
  //  TRYB REALNY – subskrypcja Supabase Broadcast
  // ==========================================================================
  function configMissing() {
    return !CFG.SUPABASE_URL || CFG.SUPABASE_URL.indexOf('TWOJ_') === 0 ||
           !CFG.SUPABASE_ANON_KEY || CFG.SUPABASE_ANON_KEY.indexOf('TWOJ_') === 0;
  }

  function runLive() {
    console.log('[listener] runLive() – tryb realny (bez ?demo)');
    if (typeof window.supabase === 'undefined') {
      console.warn('[listener] STOP: brak biblioteki @supabase/supabase-js (window.supabase undefined)');
      setConn('off', 'brak biblioteki');
      return;
    }
    if (configMissing()) {
      console.warn('[listener] STOP: brak/placeholder kluczy Supabase w js/config.js');
      setConn('off', 'brak kluczy');
      $idle.innerHTML = 'Konfiguracja niekompletna.<br>' +
        '<span style="font-size:0.7em;opacity:0.8">Wklej klucze Supabase w js/config.js ' +
        '(albo otwórz ten ekran z ?demo, by zobaczyć podgląd układu).</span>';
      return;
    }

    setConn('retry', 'łączę…');
    var channelName = CFG.CHANNEL || 'workshop-live';
    var client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    var channel = client.channel(channelName, {
      config: { broadcast: { self: false }, presence: { key: 'listener-' + Math.random().toString(36).slice(2) } }
    });

    channel.on('broadcast', { event: 'sentence' }, function (msg) {
      console.log('[listener] odebrano broadcast "sentence":', msg && msg.payload);
      var p = msg.payload || {};
      if (p.en) addSentence(p.en, p.pl);
    });

    channel.on('broadcast', { event: 'clear' }, function () {
      console.log('[listener] odebrano broadcast "clear"');
      clearAll();
    });

    console.log('[listener] subscribing to', channelName);
    channel.subscribe(function (status, err) {
      console.log('[listener] channel status:', status, err ? '| error: ' + (err.message || err) : '');
      if (err) console.error('[listener] channel error detail:', err);
      if (status === 'SUBSCRIBED') {
        setConn('ok', 'połączono');
        // zgłoś obecność, by mówca widział licznik słuchaczy
        channel.track({ role: 'listener', at: Date.now() });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConn('retry', 'ponawiam…');
      } else if (status === 'CLOSED') {
        setConn('off', 'rozłączono');
      }
    });

    // Drobny dozór: gdy karta wróci na pierwszy plan, odśwież status wizualnie.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && channel.state === 'joined') setConn('ok', 'połączono');
    });
  }

  // --------------------------------------------------------------------------
  //  Start
  // --------------------------------------------------------------------------
  // Tryb demo TYLKO gdy ?demo jest jawnie w query stringu.
  var isDemo = new URLSearchParams(window.location.search).has('demo');
  console.log('[listener] dispatch →', isDemo ? 'DEMO (atrapa)' : 'LIVE (Supabase)');
  if (isDemo) {
    runDemo();
  } else {
    runLive();
  }
})();
