/**
 * VoiceInput — Real-time voice-to-text using the browser's Web Speech API.
 * Parses name, phone, and description from a single spoken sentence.
 * Supports English (en-IN), Hindi (hi-IN), Marathi (mr-IN) — all built-in, no API key.
 *
 * Props:
 *   onFieldsFilled({ name, phone, description }) — called with parsed fields
 *   disabled?: boolean
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, AlertCircle, Languages, Info, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from '../../lib/axios';

// ── Language definitions ─────────────────────────────────────────────────────
const LANGUAGES = [
  {
    code: 'en-IN',
    label: 'English',
    flag: '🇬🇧',
    hint: 'Say: "My name is [name], phone [number], I have [emergency details]"',
  },
  {
    code: 'hi-IN',
    label: 'हिन्दी',
    flag: '🇮🇳',
    hint: 'बोलें: "मेरा नाम [नाम] है, फोन [नंबर] है, [समस्या बताएं]"',
  },
  {
    code: 'mr-IN',
    label: 'मराठी',
    flag: '🇮🇳',
    hint: 'सांगा: "माझे नाव [नाव] आहे, फोन [नंबर] आहे, [समस्या सांगा]"',
  },
];

// ── Check browser support (Chrome, Edge, Safari) ─────────────────────────────
const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

// ── Number-word → digit maps (English + Hindi + Marathi) ─────────────────────
const DIGIT_WORDS = {
  // English
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  // Hindi (Devanagari + romanised)
  'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5, 'पाँच': 5,
  'छह': 6, 'छ:': 6, 'सात': 7, 'आठ': 8, 'नौ': 9,
  shunya: 0, ek: 1, do: 2, teen: 3, char: 4, paanch: 5, panch: 5,
  chhe: 6, chha: 6, saat: 7, sath: 7, aath: 8, nau: 9,
  // Marathi (Devanagari + romanised)
  'शून्य': 0, 'एक': 1, 'दोन': 2, 'तीन': 3, 'चार': 4, 'पाच': 5,
  'सहा': 6, 'सात': 7, 'आठ': 8, 'नऊ': 9,
  don: 2, paach: 5, sahaa: 6, saha: 6, nav: 9,
};

/**
 * Convert a string that may contain spoken digit-words into compact digits.
 * e.g. "nine eight seven six five four three two one zero" → "9876543210"
 */
function wordsToDigitString(str) {
  return str
    .trim()
    .split(/[\s,]+/)
    .map((tok) => {
      const lower = tok.toLowerCase().replace(/[^a-z0-9\u0900-\u097f]/g, '');
      if (/^\d$/.test(lower)) return lower;
      if (lower in DIGIT_WORDS) return String(DIGIT_WORDS[lower]);
      // Check Devanagari token directly
      if (tok in DIGIT_WORDS) return String(DIGIT_WORDS[tok]);
      return null;
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
    // Strategy B: phone keyword followed by digits/words
    const keywordRegex =
      /(?:phone(?:\s+number)?|number|contact|mob(?:ile)?|फोन|नंबर|फ़ोन|नम्बर|मोबाइल)\s*(?:is|hai|है|ahe|आहे)?\s*([\w\s,\u0900-\u097f]{5,70})/i;
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
          text = text.replace(slice.join(' '), '').trim();
          break;
        }
      }
    }

    // Strategy D: spaced digits like "9 8 7 6 5 4 3 2 1 0"
    if (!fields.phone) {
      const spacedDigits = text.match(/\b(\d\s+){9}\d\b/);
      if (spacedDigits) {
        const compact = spacedDigits[0].replace(/\s+/g, '');
        if (/^[6-9]\d{9}$/.test(compact)) {
          fields.phone = compact;
          text = text.replace(spacedDigits[0], '').trim();
        }
      }
    }
  }

  // ── 2. Name extraction via multilingual keyword patterns ──────────────────
  const nameCapture = '([^\\d,;.!?]+?)';
  const namePatterns = [
    // English
    new RegExp('(?:my name is|i am|i\'m|name is|name)\\s+' + nameCapture + '(?:\\s*[,.]|\\s+(?:phone|number|and|mera|aur|contact|mob|$))', 'i'),
    new RegExp('(?:my name is|i am|i\'m|name is|name)\\s+' + '([^\\s\\d,;.!?]+(?:\\s+[^\\s\\d,;.!?]+){0,3})', 'i'),
    // Hindi (Devanagari script)
    new RegExp('(?:मेरा नाम|नाम)\\s+' + nameCapture + '(?:\\s*[,.]|\\s+(?:है|फोन|नंबर|और|$))', 'i'),
    new RegExp('(?:mera naam|mera name|naam)\\s+' + '([^\\s\\d,;.!?]+(?:\\s+[^\\s\\d,;.!?]+){0,3})', 'i'),
    // Marathi (Devanagari script)
    new RegExp('(?:माझे नाव|माझं नाव|नाव)\\s+' + nameCapture + '(?:\\s*[,.]|\\s+(?:आहे|फोन|नंबर|आणि|$))', 'i'),
    new RegExp('(?:maza nav|mazha nav|maze nav|maaze naav|majha nav)\\s+' + '([^\\s\\d,;.!?]+(?:\\s+[^\\s\\d,;.!?]+){0,3})', 'i'),
  ];
  for (const pattern of namePatterns) {
    const m = text.match(pattern);
    if (m && m[1].trim().length > 1) {
      // Clean up trailing "hai/ahe/आहे" from name
      fields.name = m[1].trim().replace(/\s+(है|आहे|hai|ahe|he)\s*$/i, '').trim();
      text = text.replace(m[0], '').trim();
      break;
    }
  }

  // ── 3. Remaining text → description (strip connector noise) ──────────────
  const noise = [
    /^[,;.\s]+|[,;.\s]+$/g,
    /\b(?:phone(?:\s+number)?|number is|contact|mob(?:ile)?)\b/gi,
    /\b(?:फोन|नंबर|नम्बर|मोबाइल)\b/gi,
    /\b(?:aur|and|ani|va|tatha|और|आणि|व)\b/gi,
    /\b(?:hai|he|ahe|aahe|is|are|है|आहे)\b/gi,
  ];
  for (const r of noise) text = text.replace(r, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  if (text) fields.description = text;

  return fields;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VoiceInput({ onFieldsFilled, disabled = false }) {
  const [recording, setRecording] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [lastParsed, setLastParsed] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  const recognitionRef = useRef(null);
  const collectedRef = useRef('');

  // Detect browser support on mount
  useEffect(() => {
    if (!SpeechRecognition) setUnsupported(true);
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* already stopped */ }
      recognitionRef.current = null;
    }
    setRecording(false);
    setInterimText('');
  }, []);

  const startRecording = useCallback(() => {
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setInterimText('');
    setFinalText('');
    setLastParsed(null);
    collectedRef.current = '';

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLang.code;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setRecording(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      if (final.trim()) {
        collectedRef.current = final.trim();
        setFinalText(final.trim());
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        toast.warning('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow mic permission.');
      } else if (event.error === 'network') {
        toast.error('Network error. Speech recognition requires an internet connection.');
      } else {
        toast.error(`Voice error: ${event.error}`);
      }
      stopRecording();
    };

    recognition.onend = async () => {
      setRecording(false);
      setInterimText('');
      const collected = collectedRef.current;
      if (!collected) return;

      // Try AI parsing first, fall back to regex
      setParsing(true);
      try {
        const { data } = await axios.post('/citizen/parse-voice', {
          transcript: collected,
          language: selectedLang.code,
        });
        if (data && (data.name || data.phone || data.description)) {
          setLastParsed(data);
          onFieldsFilled(data);
          toast.success('✅ Form filled via AI voice parsing!');
        } else {
          throw new Error('Empty AI response');
        }
      } catch (err) {
        console.warn('AI parse failed, using local parsing:', err.message);
        const parsed = parseTranscript(collected);
        setLastParsed(parsed);
        onFieldsFilled(parsed);
        toast.success('✅ Form filled via voice!');
      } finally {
        setParsing(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      toast.error('Could not start voice recognition. Try again.');
      setRecording(false);
    }
  }, [selectedLang, onFieldsFilled, stopRecording]);

  const toggle = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  // Browser not supported
  if (unsupported) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <AlertCircle size={20} className="text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-700">Voice input not available</p>
            <p className="text-xs text-gray-500">
              Please use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for voice input support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              recording ? 'bg-red-600 animate-pulse' : 'bg-red-100'
            }`}
          >
            <Mic size={16} className={recording ? 'text-white' : 'text-red-600'} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Voice Fill</p>
            <p className="text-[10px] text-gray-500 leading-tight">
              Speak once — fills all fields
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language picker */}
          <div className="relative">
            <button
              type="button"
              disabled={disabled || recording}
              onClick={() => setShowLangMenu((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm"
            >
              <Languages size={12} />
              {selectedLang.flag} {selectedLang.label}
            </button>
            {showLangMenu && (
              <div className="absolute top-full right-0 mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setSelectedLang(lang);
                      setShowLangMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                      lang.code === selectedLang.code
                        ? 'font-semibold text-red-600 bg-red-50'
                        : 'text-gray-700'
                    }`}
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
            disabled={disabled || parsing}
            onClick={toggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 shadow-sm ${
              recording
                ? 'bg-red-600 text-white shadow-red-200 animate-pulse'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } disabled:opacity-50`}
          >
            {recording ? (
              <>
                <MicOff size={14} /> Stop
              </>
            ) : (
              <>
                <Mic size={14} /> Start Recording
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hint */}
      {!recording && (
        <div className="flex items-start gap-2 bg-white/70 rounded-lg px-3 py-2">
          <Info size={12} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-600 leading-relaxed">{selectedLang.hint}</p>
        </div>
      )}

      {/* Recording indicator */}
      {recording && (
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping inline-block" />
          <span className="text-xs font-semibold text-red-700">
            Listening ({selectedLang.label})… speak clearly
          </span>
        </div>
      )}

      {/* AI parsing indicator */}
      {parsing && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <Loader2 size={14} className="text-blue-600 animate-spin" />
          <span className="text-xs font-semibold text-blue-700">
            AI is extracting name, phone & description…
          </span>
        </div>
      )}

      {/* Live transcript */}
      {(interimText || (recording && finalText)) && (
        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 space-y-1">
          {finalText && (
            <p>
              <span className="font-medium text-gray-900">Heard: </span>
              {finalText}
            </p>
          )}
          {interimText && (
            <p className="italic text-gray-500">
              <Mic size={10} className="inline mr-1" />
              {interimText}
            </p>
          )}
        </div>
      )}

      {/* Parsed result preview */}
      {lastParsed && !recording && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 space-y-1">
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
            Detected from voice
          </p>
          {lastParsed.name && (
            <p className="text-xs text-emerald-800">
              👤 Name: <strong>{lastParsed.name}</strong>
            </p>
          )}
          {lastParsed.phone && (
            <p className="text-xs text-emerald-800">
              📞 Phone: <strong>{lastParsed.phone}</strong>
            </p>
          )}
          {lastParsed.description && (
            <p className="text-xs text-emerald-800">
              📝 Details: <strong>{lastParsed.description}</strong>
            </p>
          )}
          <p className="text-[10px] text-emerald-600 mt-1">
            You can still edit the fields manually.
          </p>
        </div>
      )}
    </div>
  );
}
