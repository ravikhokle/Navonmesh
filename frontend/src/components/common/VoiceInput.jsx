/**
 * VoiceInput — Real-time voice-to-text via Deepgram streaming.
 * Parses name, phone, and description from a single spoken sentence.
 * Supports English (en-IN), Hindi (hi), Marathi (mr).
 *
 * Props:
 *   onFieldsFilled({ name, phone, description }) — called with parsed fields
 *   disabled?: boolean
 */
import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, Languages, Info } from 'lucide-react';
import { toast } from 'react-toastify';

const DEEPGRAM_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY;

const LANGUAGES = [
  {
    code: 'en-IN',
    label: 'English',
    flag: '������',
    hint: 'Say: "My name is [name], phone [number], I have [emergency details]"',
  },
  {
    code: 'hi',
    label: 'Hindi',
    flag: '������',
    hint: 'बोलें: "मेरा नाम [नाम] है, फोन [नंबर] है, [समस्या बताएं]"',
  },
  {
    code: 'mr',
    label: 'Marathi',
    flag: '������',
    hint: 'सांगा: "माझे नाव [नाव] आहे, फोन [नंबर] आहे, [समस्या सांगा]"',
  },
];

function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

// ── Number-word → digit maps (English + Hindi + Marathi) ─────────────────────
const DIGIT_WORDS = {
  // English
  zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9,
  // Hindi / Marathi (romanised Deepgram output)
  shunya:0, ek:1, do:2, don:2, teen:3, char:4, paanch:5, panch:5,
  chhe:6, chha:6, saat:7, sath:7, aath:8, nau:9, nav:9,
};

/**
 * Convert a string that may contain spoken digit-words into compact digits.
 * e.g. "nine eight seven six five four three two one zero" → "9876543210"
 *      "9 8 7 6 5 4 3 2 1 0"                              → "9876543210"
 */
function wordsToDigitString(str) {
  return str
    .trim()
    .split(/[\s,]+/)
    .map((tok) => {
      const lower = tok.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (/^\d$/.test(lower)) return lower;            // single digit already
      if (lower in DIGIT_WORDS) return String(DIGIT_WORDS[lower]);
      return null; // not a digit word
    })
    .filter((d) => d !== null)
    .join('');
}

// ── Parse transcript into name / phone / description ─────────────────────────
function parseTranscript(rawText) {
  let text = rawText.trim();
  const fields = { name: '', phone: '', description: '' };

  // ── 1. Phone extraction ───────────────────────────────────────────────────
  // Strategy A: compact digits already present  e.g. "9876543210" or "+91 98765 43210"
  const compactRegex = /(?:\+91[\s-]?|0)?([6-9]\d{9})/;
  const compactMatch = text.match(compactRegex);

  if (compactMatch) {
    fields.phone = compactMatch[1];
    text = text.replace(compactMatch[0], '').trim();
  } else {
    // Strategy B: spoken words around a phone keyword, then convert words→digits
    // Captures up to ~20 tokens after the keyword
    const keywordRegex =
      /(?:phone(?:\s+number)?|number|contact|mob(?:ile)?|फोन|नंबर|फ़ोन)\s*(?:is|hai|ahe|aahe)?\s*([\w\s,]{5,70})/i;
    const kwMatch = text.match(keywordRegex);
    if (kwMatch) {
      const candidate = wordsToDigitString(kwMatch[1]);
      if (/^[6-9]\d{9}$/.test(candidate)) {
        fields.phone = candidate;
        text = text.replace(kwMatch[0], '').trim();
      }
    }

    // Strategy C: any sequence of 10 consecutive digit-words anywhere in text
    if (!fields.phone) {
      const tokens = text.split(/[\s,]+/);
      for (let i = 0; i <= tokens.length - 10; i++) {
        const slice = tokens.slice(i, i + 10);
        const digits = wordsToDigitString(slice.join(' '));
        if (/^[6-9]\d{9}$/.test(digits)) {
          fields.phone = digits;
          // Remove matched tokens from text
          const matched = slice.join(' ');
          text = text.replace(matched, '').trim();
          break;
        }
      }
    }
  }

  // ── 2. Name extraction via multilingual keyword patterns ──────────────────
  const nameCapture = '([^\\s\\d,;.!?]+(?:\\s+[^\\s\\d,;.!?]+){0,3})';
  const namePatterns = [
    new RegExp('(?:my name is|i am|i\'m|name is|name)\\s+' + nameCapture, 'i'),
    new RegExp('(?:mera naam|mera name|meri name|naam)\\s+' + nameCapture, 'i'),
    new RegExp('(?:maza nav|mazha nav|maze nav|maaze naav)\\s+' + nameCapture, 'i'),
  ];
  for (const pattern of namePatterns) {
    const m = text.match(pattern);
    if (m) {
      fields.name = m[1].trim();
      text = text.replace(m[0], '').trim();
      break;
    }
  }

  // ── 3. Remaining text → description (strip connector noise) ──────────────
  const noise = [
    /^[,;.\s]+|[,;.\s]+$/g,
    /\b(?:phone(?:\s+number)?|number is|contact|mob(?:ile)?)\b/gi,
    /\b(?:aur|and|ani|va|tatha)\b/gi,
    /\b(?:hai|he|ahe|aahe|is|are)\b/gi,
  ];
  for (const r of noise) text = text.replace(r, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  if (text) fields.description = text;

  return fields;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VoiceInput({ onFieldsFilled, disabled = false }) {
  const [recording, setRecording]       = useState(false);
  const [connecting, setConnecting]     = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [interimText, setInterimText]   = useState('');
  const [lastParsed, setLastParsed]     = useState(null);

  const wsRef       = useRef(null);
  const recorderRef = useRef(null);
  const streamRef   = useRef(null);

  const stopAll = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ type: 'CloseStream' })); } catch { /* ignore */ }
      wsRef.current.close();
      wsRef.current = null;
    }
    recorderRef.current = null;
    setRecording(false);
    setConnecting(false);
    setInterimText('');
  }, []);

  const startRecording = useCallback(async () => {
    if (!DEEPGRAM_KEY || DEEPGRAM_KEY === 'your_deepgram_api_key_here') {
      toast.error('Deepgram API key not configured. Add VITE_DEEPGRAM_API_KEY to .env');
      return;
    }
    setConnecting(true);
    setInterimText('');
    setLastParsed(null);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error('Microphone access denied. Please allow mic permission.');
      setConnecting(false);
      return;
    }
    streamRef.current = stream;

    const params = new URLSearchParams({
      language:        selectedLang.code,
      punctuate:       'true',
      interim_results: 'true',
      model:           'nova-2',
    });
    const ws = new WebSocket(
      `wss://api.deepgram.com/v1/listen?${params.toString()}`,
      ['token', DEEPGRAM_KEY]
    );
    wsRef.current = ws;

    let collected = '';

    ws.onopen = () => {
      setConnecting(false);
      setRecording(true);
      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
      };
      recorder.start(250);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const alt = msg?.channel?.alternatives?.[0];
        if (!alt) return;
        const t = alt.transcript?.trim() ?? '';
        if (!t) return;
        if (msg.is_final) { collected += (collected ? ' ' : '') + t; setInterimText(''); }
        else { setInterimText(t); }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => { toast.error('Voice error. Check Deepgram API key.'); stopAll(); };

    ws.onclose = () => {
      if (collected) {
        const parsed = parseTranscript(collected);
        setLastParsed(parsed);
        onFieldsFilled(parsed);
        toast.success('✅ Form filled via voice!');
      }
      setRecording(false);
      setConnecting(false);
      setInterimText('');
    };
  }, [selectedLang, onFieldsFilled, stopAll]);

  const toggle = () => { if (recording || connecting) stopAll(); else startRecording(); };

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${recording ? 'bg-red-600 animate-pulse' : 'bg-red-100'}`}>
            <Mic size={16} className={recording ? 'text-white' : 'text-red-600'} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Voice Fill</p>
            <p className="text-[10px] text-gray-500 leading-tight">Speak once — fills all fields</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language picker */}
          <div className="relative">
            <button
              type="button"
              disabled={disabled || recording || connecting}
              onClick={() => setShowLangMenu((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              <Languages size={12} />
              {selectedLang.flag} {selectedLang.label}
            </button>
            {showLangMenu && (
              <div className="absolute top-full right-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[130px]">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => { setSelectedLang(lang); setShowLangMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${lang.code === selectedLang.code ? 'font-semibold text-red-600 bg-red-50' : 'text-gray-700'}`}
                  >
                    <span>{lang.flag}</span> {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mic button */}
          <button
            type="button"
            disabled={disabled}
            onClick={toggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 shadow-sm ${
              recording
                ? 'bg-red-600 text-white shadow-red-200 animate-pulse'
                : connecting
                ? 'bg-amber-100 text-amber-700 cursor-wait'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } disabled:opacity-50`}
          >
            {connecting ? (
              <><Loader2 size={14} className="animate-spin" /> Connecting…</>
            ) : recording ? (
              <><MicOff size={14} /> Stop</>
            ) : (
              <><Mic size={14} /> Start Recording</>
            )}
          </button>
        </div>
      </div>

      {/* Hint */}
      {!recording && !connecting && (
        <div className="flex items-start gap-2 bg-white/70 rounded-lg px-3 py-2">
          <Info size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-600 leading-relaxed">{selectedLang.hint}</p>
        </div>
      )}

      {/* Recording indicator */}
      {recording && (
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping inline-block" />
          <span className="text-xs font-semibold text-red-700">Listening… speak clearly</span>
        </div>
      )}

      {/* Interim text */}
      {interimText && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 italic">
          <Mic size={11} className="flex-shrink-0 mt-0.5 text-amber-500" />
          {interimText}
        </div>
      )}

      {/* Parsed result preview */}
      {lastParsed && !recording && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 space-y-1">
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Detected from voice</p>
          {lastParsed.name        && <p className="text-xs text-emerald-800">��� Name: <strong>{lastParsed.name}</strong></p>}
          {lastParsed.phone       && <p className="text-xs text-emerald-800">��� Phone: <strong>{lastParsed.phone}</strong></p>}
          {lastParsed.description && <p className="text-xs text-emerald-800">��� Details: <strong>{lastParsed.description}</strong></p>}
          <p className="text-[10px] text-emerald-600 mt-1">You can still edit the fields manually.</p>
        </div>
      )}
    </div>
  );
}
