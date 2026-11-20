import { Article } from '../types/blog';
import {
  synthesizeArabicSpeechWithGeminiClient,
  getClientGeminiStatus,
  isGeminiKeyError,
  formatGeminiArabicError,
} from '../services/geminiClient';

export type SpeechEngineMode = 'auto' | 'gemini' | 'browser';
export type ActiveSpeechEngine = 'gemini' | 'browser' | 'unavailable';

/**
 * Arabic Voice Detection:
 * Strictly matches genuine Arabic OS voices and NEVER falls back to English/default voices
 * (which skip Arabic script and speak only numbers/English letters).
 */
const KNOWN_ARABIC_VOICE_NAMES = [
  'arabic',
  'العربية',
  'ar-',
  'ar_',
  'hoda',
  'naayf',
  'laila',
  'maged',
  'tarik',
  'salma',
  'shakir',
  'mariam',
  'rana',
  'zayd',
  'amira',
  'leila',
  'fatima',
  'omar',
];

export function getStrictArabicWebSpeechVoice(
  explicitVoices?: Array<{ lang?: string; name?: string }>
): SpeechSynthesisVoice | null {
  let voices: Array<{ lang?: string; name?: string }> = explicitVoices || [];
  if (!explicitVoices && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      voices = window.speechSynthesis.getVoices() || [];
    } catch {
      voices = [];
    }
  }

  if (!Array.isArray(voices) || voices.length === 0) return null;

  const isNonArabicLang = (lang?: string) => {
    const l = (lang || '').trim().toLowerCase();
    return Boolean(l) && !/^ar([_-]|$)/i.test(l);
  };

  // 1. Exact Arabic language tag (e.g. ar-EG, ar-SA, ar)
  const exactAr = voices.find((v) => /^ar([_-]|$)/i.test((v.lang || '').trim()));
  if (exactAr) {
    return exactAr as SpeechSynthesisVoice;
  }

  // 2. Voice explicitly named Arabic without an English language tag
  const namedAr = voices.find((v) => {
    if (isNonArabicLang(v.lang)) return false;
    const nameLower = (v.name || '').toLowerCase();
    return KNOWN_ARABIC_VOICE_NAMES.some((kw) => nameLower.includes(kw));
  });

  return (namedAr as SpeechSynthesisVoice) || null;
}

/**
 * Replaces English acronyms, units, numbers-with-units, and Markdown syntax
 * with natural Arabic spoken phrases so any Arabic TTS engine reads smoothly
 * instead of spelling ASCII tokens or reading isolated digits.
 */
export function prepareArabicSpeechText(rawText: string): string {
  if (!rawText) return '';

  let text = String(rawText)
    // Strip markdown images & HTML tags
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    // Links -> keep readable anchor text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Headings & blockquotes
    .replace(/^#{1,6}\s*(.+)$/gm, '$1.')
    .replace(/^>\s*(.+)$/gm, '$1.')
    // Bullets
    .replace(/^[-*•]\s+/gm, ' ')
    // Bold/italic/code markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    // Strip common emojis that break phrasing
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ');

  // Convert technical decor terms, units, and acronyms into Arabic spoken phrasing
  const replacements: Array<[RegExp, string]> = [
    [/\b3000\s*k\b/gi, 'ثلاثة آلاف كلفن الدافئة'],
    [/\b4000\s*k\b/gi, 'أربعة آلاف كلفن المحايدة'],
    [/\b6500\s*k\b/gi, 'ستة آلاف وخمسمائة كلفن الباردة'],
    [/\b24\s*h\b/gi, 'أربع وعشرين ساعة'],
    [/\b0\s*ms\b/gi, 'فوري'],
    [/\b60\s*[-–]\s*30\s*[-–]\s*10\b/g, 'ستين ثلاثين عشرة'],
    [/\bui\s*\/\s*ux\b/gi, 'تجربة المستخدم'],
    [/\bgreige\b/gi, 'جريج'],
    [/\boff[\s-]*white\b/gi, 'أوف وايت'],
    [/\blimewash\b/gi, 'لايم واش'],
    [/\bcross[\s-]*hatch\b/gi, 'ضربات متقاطعة'],
    [/\baccent\s*wall\b/gi, 'جدار التمييز'],
    [/\bbacklit\b/gi, 'مضيء خلفي'],
    [/\btranslucent\b/gi, 'نصف شفاف'],
    [/\bwpc\b/gi, 'بديل الخشب'],
    [/\bpvc\b/gi, 'بي في سي'],
    [/\bspc\b/gi, 'إس بي سي'],
    [/\bmdf\b/gi, 'إم دي إف'],
    [/\bled\b/gi, 'ليد'],
    [/\bsmart\s*home\b/gi, 'المنزل الذكي'],
    [/\bstucco\s*antico\b/gi, 'ستوكو أنتيكو'],
    [/\bstucco\b/gi, 'ستوكو'],
    [/\bvelvet\b/gi, 'قطيفة'],
    [/\be-e-a-t\b/gi, 'معايير الخبرة والمصداقية'],
    [/\bseo\b/gi, 'السيو'],
    [/\badsense\b/gi, 'أدسنس'],
    [/\bgoogle\s*maps\b/gi, 'خرائط جوجل'],
    [/\bai\b/gi, 'الذكاء الاصطناعي'],
    [/(\d+)\s*%/g, '$1 بالمئة'],
    [/(\d+)\s*°\s*c/gi, '$1 درجة مئوية'],
    [/(\d+)\s*(سم|cm)\b/gi, '$1 سنتيمتر'],
    [/(\d+)\s*(مم|mm)\b/gi, '$1 مليمتر'],
    [/(\d+)\s*(م²|م2|m2)\b/gi, '$1 متر مربع'],
    [/(\d+)\s*x\b/gi, 'سرعة $1'],
  ];

  for (const [pattern, arabic] of replacements) {
    text = text.replace(pattern, arabic);
  }

  // Strip leftover URLs and parenthetical English translations e.g. "(Soft Neutral)"
  text = text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\(([A-Za-z0-9\s\-_\/,&.+]+)\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

export function splitSpeechTextIntoChunks(rawText: string, maxWords = 28): string[] {
  const clean = prepareArabicSpeechText(rawText);
  if (!clean) return [];

  const sentences = clean
    .split(/(?<=[.،؛؟!\n])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  if (sentences.length === 0) return [clean];

  const chunks: string[] = [];
  let block = '';

  for (const sent of sentences) {
    const candidate = block ? `${block} ${sent}` : sent;
    if (candidate.split(/\s+/).length > maxWords) {
      if (block.trim()) chunks.push(block.trim());
      block = sent;
    } else {
      block = candidate;
    }
  }
  if (block.trim()) {
    chunks.push(block.trim());
  }

  return chunks;
}

export function createArticleSpeechChunks(
  article: Article,
  mode: 'full' | 'summary' = 'full',
  ownerName = 'الحضرى محمود'
): string[] {
  const chunks: string[] = [];

  const cleanTitle = prepareArabicSpeechText(article.title || '');
  const cleanAuthor = prepareArabicSpeechText(article.author?.name || ownerName);
  chunks.push(
    `أهلاً بك في مدونة ألفا للديكور والدهانات. نبدأ قراءة مقال: ${cleanTitle}، بقلم كاتب المقال المهندس ${cleanAuthor}.`
  );

  if (article.excerpt) {
    chunks.push(`الملخص: ${prepareArabicSpeechText(article.excerpt)}`);
  }

  if (mode === 'summary') {
    chunks.push(
      `هذا المقال ضمن تصنيف ${prepareArabicSpeechText(article.category || 'الديكور')}، ووقت قراءته نحو ${article.readingTime || 5} دقائق.`
    );
    return chunks;
  }

  const bodyChunks = splitSpeechTextIntoChunks(article.content || '', 30);
  chunks.push(...bodyChunks);

  chunks.push(
    `تمت قراءة المقال بالكامل. يسعدنا تواصلك مع المهندس ${cleanAuthor} لحجز استشارة أو معاينة لمشروعك.`
  );

  return chunks;
}

export interface ArabicSpeechCallbacks {
  onStartChunk?: (index: number, chunkText: string, total: number) => void;
  onStateChange?: (state: {
    isSpeaking: boolean;
    isPaused: boolean;
    isLoadingAudio: boolean;
    engine: ActiveSpeechEngine;
  }) => void;
  onError?: (arabicMessage: string) => void;
  onComplete?: () => void;
}

/**
 * Dual-engine Arabic Speech Controller:
 * 1) Prefers Gemini Arabic HD Voice (gemini-3.8-flash-lite-tts) with next-chunk lookahead
 *    whenever a Gemini API key is configured, ensuring authentic Arabic pronunciation on ALL OS/browsers.
 * 2) Falls back to genuine OS Arabic Web Speech voice (ar-*) ONLY when an Arabic voice actually exists.
 * 3) NEVER uses an English/default OS voice to read Arabic (which caused English speech & isolated numbers).
 */
export class ArabicSpeechController {
  private chunks: string[] = [];
  private index = 0;
  private active = false;
  private paused = false;
  private loadingAudio = false;
  private speed = 1.0;
  private mode: SpeechEngineMode = 'auto';
  private runToken = 0;
  private currentAudio: HTMLAudioElement | null = null;
  private currentAudioUrl: string | null = null;
  private prefetchCache = new Map<number, Promise<string>>();
  private callbacks: ArabicSpeechCallbacks = {};

  constructor(callbacks?: ArabicSpeechCallbacks) {
    if (callbacks) this.callbacks = callbacks;
  }

  public setCallbacks(callbacks: ArabicSpeechCallbacks) {
    this.callbacks = callbacks;
  }

  public setSpeed(speed: number) {
    this.speed = speed;
    if (this.currentAudio) {
      try {
        this.currentAudio.playbackRate = speed;
      } catch {}
    }
  }

  public setMode(mode: SpeechEngineMode) {
    this.mode = mode;
  }

  public getCapabilities() {
    const geminiConfigured = getClientGeminiStatus().configured;
    const browserArabicVoice = getStrictArabicWebSpeechVoice();
    return {
      geminiConfigured,
      hasBrowserArabicVoice: Boolean(browserArabicVoice),
      browserArabicVoiceName: browserArabicVoice?.name || null,
      canSpeakArabic: geminiConfigured || Boolean(browserArabicVoice),
    };
  }

  private resolveEngine(): ActiveSpeechEngine {
    const { geminiConfigured, hasBrowserArabicVoice } = this.getCapabilities();
    if (this.mode === 'gemini') {
      return geminiConfigured ? 'gemini' : hasBrowserArabicVoice ? 'browser' : 'unavailable';
    }
    if (this.mode === 'browser') {
      return hasBrowserArabicVoice ? 'browser' : geminiConfigured ? 'gemini' : 'unavailable';
    }
    // Auto: prefer Gemini Arabic TTS when configured so Arabic always sounds natural and never falls back to English
    if (geminiConfigured) return 'gemini';
    if (hasBrowserArabicVoice) return 'browser';
    return 'unavailable';
  }

  private emitState(engine?: ActiveSpeechEngine) {
    this.callbacks.onStateChange?.({
      isSpeaking: this.active,
      isPaused: this.paused,
      isLoadingAudio: this.loadingAudio,
      engine: engine || this.resolveEngine(),
    });
  }

  private cleanupAudioElement() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.src = '';
      } catch {}
      this.currentAudio = null;
    }
    if (this.currentAudioUrl) {
      try {
        URL.revokeObjectURL(this.currentAudioUrl);
      } catch {}
      this.currentAudioUrl = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  public stop() {
    this.runToken += 1;
    this.active = false;
    this.paused = false;
    this.loadingAudio = false;
    this.chunks = [];
    this.index = 0;
    this.prefetchCache.clear();
    this.cleanupAudioElement();
    this.emitState();
  }

  public pause() {
    if (!this.active || this.paused) return;
    this.paused = true;
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
      } catch {}
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.pause();
      } catch {}
    }
    this.emitState();
  }

  public resume() {
    if (!this.active || !this.paused) return;
    this.paused = false;
    if (this.currentAudio) {
      this.currentAudio.play().catch(() => {});
    } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
      } catch {}
    }
    this.emitState();
  }

  public skipNext() {
    if (!this.active || this.index >= this.chunks.length - 1) return;
    this.runToken += 1;
    this.cleanupAudioElement();
    this.index += 1;
    void this.playCurrentChunk(this.runToken);
  }

  public skipPrev() {
    if (!this.active || this.index <= 0) return;
    this.runToken += 1;
    this.cleanupAudioElement();
    this.index -= 1;
    void this.playCurrentChunk(this.runToken);
  }

  public playChunks(chunks: string[]) {
    const cleanChunks = chunks.map((c) => prepareArabicSpeechText(c)).filter(Boolean);
    if (cleanChunks.length === 0) return false;

    const engine = this.resolveEngine();
    if (engine === 'unavailable') {
      this.stop();
      this.callbacks.onError?.(
        'متصفحك الحالي لا يحتوي على حزمة صوت عربي مثبتة، ولم يتم إعداد مفتاح Gemini API للصوت العربي. لمنع القراءة بالإنجليزية أو نطق الأرقام فقط، يرجى إضافة VITE_GEMINI_API_KEY في الإعدادات أو تثبيت حزمة الصوت العربية في نظامك.'
      );
      return false;
    }

    this.runToken += 1;
    const token = this.runToken;
    this.cleanupAudioElement();
    this.prefetchCache.clear();
    this.chunks = cleanChunks;
    this.index = 0;
    this.active = true;
    this.paused = false;
    this.emitState(engine);

    void this.playCurrentChunk(token);
    return true;
  }

  private getOrFetchGeminiAudioDataUrl(chunkIdx: number): Promise<string> {
    const cached = this.prefetchCache.get(chunkIdx);
    if (cached) return cached;

    const text = this.chunks[chunkIdx];
    const promise = synthesizeArabicSpeechWithGeminiClient({ text, voiceName: 'Kore' }).then(
      (res) => res.dataUrl
    );
    this.prefetchCache.set(chunkIdx, promise);
    return promise;
  }

  private prefetchNext(nextIdx: number) {
    if (nextIdx >= this.chunks.length) return;
    if (!this.prefetchCache.has(nextIdx)) {
      this.getOrFetchGeminiAudioDataUrl(nextIdx).catch(() => {
        this.prefetchCache.delete(nextIdx);
      });
    }
  }

  private async playCurrentChunk(token: number) {
    if (!this.active || token !== this.runToken) return;

    if (this.index >= this.chunks.length) {
      this.active = false;
      this.paused = false;
      this.loadingAudio = false;
      this.emitState();
      this.callbacks.onComplete?.();
      return;
    }

    const chunkText = this.chunks[this.index];
    this.callbacks.onStartChunk?.(this.index, chunkText, this.chunks.length);

    const engine = this.resolveEngine();
    if (engine === 'unavailable') {
      this.stop();
      this.callbacks.onError?.(
        'تعذر العثور على محرك نطق عربي في المتصفح ولا يتوفر مفتاح Gemini للصوت العربي.'
      );
      return;
    }

    if (engine === 'gemini') {
      this.loadingAudio = true;
      this.emitState('gemini');

      try {
        // Start fetching current chunk and prefetch next chunk
        const dataUrl = await this.getOrFetchGeminiAudioDataUrl(this.index);
        if (!this.active || token !== this.runToken) return;

        this.loadingAudio = false;
        this.emitState('gemini');
        this.prefetchNext(this.index + 1);

        const audio = new Audio(dataUrl);
        audio.playbackRate = this.speed;
        this.currentAudio = audio;

        audio.onended = () => {
          if (!this.active || token !== this.runToken) return;
          this.currentAudio = null;
          this.index += 1;
          void this.playCurrentChunk(token);
        };

        audio.onerror = () => {
          if (!this.active || token !== this.runToken) return;
          this.currentAudio = null;
          const arVoice = getStrictArabicWebSpeechVoice();
          if (arVoice) {
            this.speakWithBrowserArabicVoice(chunkText, arVoice, token);
          } else {
            this.index += 1;
            void this.playCurrentChunk(token);
          }
        };

        await audio.play();
        return;
      } catch (err) {
        if (!this.active || token !== this.runToken) return;
        this.loadingAudio = false;
        const arVoice = getStrictArabicWebSpeechVoice();
        if (arVoice && !isGeminiKeyError(err)) {
          this.speakWithBrowserArabicVoice(chunkText, arVoice, token);
          return;
        }
        const msg = formatGeminiArabicError(
          err,
          'تعذر تشغيل الصوت العربي عبر Gemini TTS'
        );
        if (arVoice) {
          this.callbacks.onError?.(`${msg} (تم التحويل مؤقتاً لصوت المتصفح العربي)`);
          this.speakWithBrowserArabicVoice(chunkText, arVoice, token);
          return;
        }
        this.stop();
        this.callbacks.onError?.(msg);
        return;
      }
    }

    const arVoice = getStrictArabicWebSpeechVoice();
    if (!arVoice) {
      this.stop();
      this.callbacks.onError?.(
        'لا توجد حزمة صوت عربي في هذا المتصفح. يرجى إضافة مفتاح Gemini API أو تفعيل اللغة العربية للصوت.'
      );
      return;
    }

    this.speakWithBrowserArabicVoice(chunkText, arVoice, token);
  }

  private speakWithBrowserArabicVoice(
    chunkText: string,
    arVoice: SpeechSynthesisVoice,
    token: number
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.stop();
      return;
    }

    this.loadingAudio = false;
    this.emitState('browser');

    const utterance = new SpeechSynthesisUtterance(chunkText);
    utterance.voice = arVoice;
    utterance.lang = arVoice.lang || 'ar-SA';
    utterance.rate = this.speed;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      if (!this.active || token !== this.runToken) return;
      setTimeout(() => {
        if (this.active && token === this.runToken) {
          this.index += 1;
          void this.playCurrentChunk(token);
        }
      }, 40);
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      if (!this.active || token !== this.runToken) return;
      this.index += 1;
      void this.playCurrentChunk(token);
    };

    window.speechSynthesis.speak(utterance);
  }
}
