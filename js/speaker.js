// =============================================================================
//  speaker.js – ekran mówcy
//  STT (Web Speech API, pl-PL) → bufor zdań → tłumaczenie (kaskada) → broadcast
// =============================================================================

(function () {
  'use strict';

  var CFG = window.APP_CONFIG || {};

  // --- Stan ---
  var quality = 'lower';
  var freeEngine = 'lingva'; // który darmowy silnik próbować pierwszy (drugi = fallback)
  var listening = false;
  var recognition = null;
  var errorCount = 0;

  // --- Elementy ---
  var $source = document.getElementById('source');
  var $output = document.getElementById('output');
  var $status = document.getElementById('status');
  var $micBtn = document.getElementById('micBtn');
  var $micLabel = document.getElementById('micLabel');
  var $apiKeyRow = document.getElementById('apiKeyRow');
  var $apiKey = document.getElementById('apiKey');
  var $srcVal = document.getElementById('srcVal');
  var $errVal = document.getElementById('errVal');
  var $listenerVal = document.getElementById('listenerVal');
  var $conn = document.getElementById('conn');
  var $connText = document.getElementById('connText');

  // ==========================================================================
  //  Supabase – kanał broadcast
  // ==========================================================================
  var channel = null;

  function configMissing() {
    return !CFG.SUPABASE_URL || CFG.SUPABASE_URL.indexOf('TWOJ_') === 0 ||
           !CFG.SUPABASE_ANON_KEY || CFG.SUPABASE_ANON_KEY.indexOf('TWOJ_') === 0;
  }

  function setConn(state, text) {
    $conn.className = 'stat conn ' + state;
    $connText.textContent = text;
  }

  function initSupabase() {
    if (typeof window.supabase === 'undefined') {
      setConn('off', 'brak biblioteki'); return;
    }
    if (configMissing()) {
      setConn('off', 'brak kluczy');
      setStatus('Wklej klucze Supabase w js/config.js, aby rozsyłać do słuchaczy', true);
      return;
    }
    setConn('retry', 'łączę…');
    var client = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    channel = client.channel(CFG.CHANNEL || 'workshop-live', {
      config: { broadcast: { self: false }, presence: { key: 'speaker' } }
    });

    // Presence: policz podłączonych słuchaczy (każdy klient śledzi swoją obecność)
    channel.on('presence', { event: 'sync' }, function () {
      var state = channel.presenceState();
      var count = 0;
      Object.keys(state).forEach(function (k) {
        (state[k] || []).forEach(function (m) {
          if (!m || m.role !== 'speaker') count++;
        });
      });
      $listenerVal.textContent = count;
    });

    channel.subscribe(function (status, err) {
      console.log('[speaker] channel status:', status, err ? '| error: ' + (err.message || err) : '');
      if (err) console.error('[speaker] channel error detail:', err);
      if (status === 'SUBSCRIBED') {
        setConn('ok', 'połączono');
        channel.track({ role: 'speaker', at: Date.now() });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConn('retry', 'ponawiam…');
      } else if (status === 'CLOSED') {
        setConn('off', 'rozłączono');
      }
    });
  }

  function broadcastSentence(pl, en, source) {
    if (!channel) return;
    channel.send({
      type: 'broadcast', event: 'sentence',
      payload: { pl: pl, en: en, source: source, ts: Date.now() }
    });
  }

  // ==========================================================================
  //  Tłumaczenie + bufor zdań
  // ==========================================================================
  var SRC_LABEL = { lingva: 'Lingva', mymemory: 'MyMemory', higher: 'Higher (paid API)', pl: 'oryginał PL' };

  function setSource(src) {
    $srcVal.textContent = SRC_LABEL[src] || src;
    $srcVal.className = 'val src-' + (src === 'pl' ? 'pl' : src === 'higher' ? 'higher' : src);
  }

  function bumpErrors(n) {
    errorCount += n;
    $errVal.textContent = errorCount;
    $errVal.className = 'val' + (errorCount > 0 ? ' warn' : '');
  }

  // Bufor: gdy zbierze całe zdanie, tłumacz i wyślij.
  var buffer = window.Translator.makeBuffer(handleSentence);

  async function handleSentence(plSentence) {
    clearPlaceholder($output);
    var seg = document.createElement('div');
    seg.className = 'seg';
    seg.innerHTML = '<span class="pending">tłumaczę…</span>';
    $output.appendChild(seg);
    $output.scrollTop = $output.scrollHeight;

    var apiKey = $apiKey.value;
    // Wybrany silnik pierwszy, drugi jako fallback (badge "źródło" pokazuje, który zadziałał).
    var freeOrder = (freeEngine === 'mymemory') ? ['mymemory', 'lingva'] : ['lingva', 'mymemory'];
    var result = await window.Translator.translate(plSentence, { mode: quality, apiKey: apiKey, freeOrder: freeOrder });

    if (result.failures) bumpErrors(result.failures);
    setSource(result.source);

    seg.textContent = result.text;
    if (result.source === 'pl') seg.classList.add('fallback-pl');
    $output.scrollTop = $output.scrollHeight;

    // Wyślij do słuchaczy gotowe EN (lub PL w razie pełnego fallbacku).
    broadcastSentence(plSentence, result.text, result.source);
  }

  // ==========================================================================
  //  UI
  // ==========================================================================
  window.setQuality = function (q) {
    quality = q;
    document.getElementById('q-lower').classList.toggle('active', q === 'lower');
    document.getElementById('q-higher').classList.toggle('active', q === 'higher');
    $apiKeyRow.classList.toggle('show', q === 'higher');
    setStatus(q === 'higher' ? 'Tryb Higher — wpisz klucz API' : 'Tryb Lower — gotowy');
  };

  // Wybór darmowego silnika (stopień 1). Drugi z pary zostaje jako fallback.
  window.setEngine = function (e) {
    freeEngine = e;
    document.getElementById('e-lingva').classList.toggle('active', e === 'lingva');
    document.getElementById('e-mymemory').classList.toggle('active', e === 'mymemory');
  };

  function setStatus(msg, isErr) {
    $status.textContent = msg;
    $status.classList.toggle('err', !!isErr);
  }

  function clearPlaceholder(el) {
    var ph = el.querySelector('.placeholder');
    if (ph) el.innerHTML = '';
  }

  window.clearListeners = function () {
    buffer.reset();
    $output.innerHTML = '<span class="placeholder">Tu pojawi się tłumaczenie wysyłane do słuchaczy.</span>';
    $source.innerHTML = '<span class="placeholder">Tu pojawi się to, co usłyszy mikrofon…</span>';
    if (channel) channel.send({ type: 'broadcast', event: 'clear', payload: {} });
    setStatus('Wyczyszczono u wszystkich');
  };

  // ==========================================================================
  //  Web Speech API (rozpoznawanie PL) – z auto-restartem
  // ==========================================================================
  function initRecognition() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setStatus('Przeglądarka nie wspiera rozpoznawania mowy — użyj Chrome', true);
      return null;
    }
    var r = new SR();
    r.lang = 'pl-PL';
    r.continuous = true;
    r.interimResults = true;

    r.onresult = function (e) {
      var interim = '';
      var finalChunk = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalChunk += t;
        else interim += t;
      }
      clearPlaceholder($source);
      if (finalChunk) {
        var span = document.createElement('span');
        span.textContent = finalChunk + ' ';
        // wstaw przed elementem interim, jeśli istnieje
        var interimEl = $source.querySelector('.interim');
        if (interimEl) $source.insertBefore(span, interimEl);
        else $source.appendChild(span);
        buffer.push(finalChunk.trim());
      }
      var iEl = $source.querySelector('.interim');
      if (!iEl) {
        iEl = document.createElement('span');
        iEl.className = 'interim';
        $source.appendChild(iEl);
      }
      iEl.textContent = interim;
      $source.scrollTop = $source.scrollHeight;
    };

    r.onerror = function (e) {
      if (e.error === 'no-speech') return;
      if (e.error === 'not-allowed') { setStatus('Brak dostępu do mikrofonu', true); stopMic(); }
      else if (e.error === 'aborted') { /* zwykle przy restarcie – ignoruj */ }
      else setStatus('Błąd rozpoznawania: ' + e.error, true);
    };

    r.onend = function () {
      // Web Speech API potrafi się wyłączyć po dłuższej sesji – wznawiaj.
      if (listening) { try { r.start(); } catch (_) {} }
    };

    return r;
  }

  window.toggleMic = function () { listening ? stopMic() : startMic(); };

  function startMic() {
    if (!recognition) recognition = initRecognition();
    if (!recognition) return;
    try {
      recognition.start();
      listening = true;
      document.body.classList.add('listening');
      $micBtn.classList.add('on');
      $micLabel.textContent = 'Stop';
      setStatus('Słucham…');
    } catch (err) {
      // start() rzuca, jeśli już działa – to nie jest błąd krytyczny
      setStatus('Mikrofon już działa');
    }
  }

  function stopMic() {
    listening = false;
    document.body.classList.remove('listening');
    $micBtn.classList.remove('on');
    $micLabel.textContent = 'Start';
    if (recognition) { try { recognition.stop(); } catch (_) {} }
    buffer.flush(); // dokończ ostatnie zdanie z bufora
    setStatus('Zatrzymano');
  }

  // ==========================================================================
  //  Start
  // ==========================================================================
  setEngine('lingva');
  setQuality('lower');
  initSupabase();
})();
