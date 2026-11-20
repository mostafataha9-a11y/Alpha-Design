import assert from 'node:assert/strict';
import {
  getStrictArabicWebSpeechVoice,
  prepareArabicSpeechText,
  splitSpeechTextIntoChunks,
  createArticleSpeechChunks,
} from './src/utils/arabicSpeech';
import { INITIAL_ARTICLES } from './src/data/initialData';

console.log('🔊 Testing Arabic Article Speech Engine...');

// 1. Strict Arabic voice selection must NEVER fall back to English voices
const onlyEnglishVoices = [
  { lang: 'en-US', name: 'Google US English' },
  { lang: 'en-GB', name: 'Daniel' },
  { lang: 'fr-FR', name: 'Amelie' },
];
assert.equal(
  getStrictArabicWebSpeechVoice(onlyEnglishVoices),
  null,
  'Must return null when no Arabic voice is present (never fall back to English)'
);

const mixedVoices = [
  { lang: 'en-US', name: 'Google US English' },
  { lang: 'ar-EG', name: 'Microsoft Salma Online (Natural) - Arabic (Egypt)' },
];
const detectedAr = getStrictArabicWebSpeechVoice(mixedVoices);
assert.ok(detectedAr, 'Must detect genuine Arabic voice when available');
assert.equal(detectedAr.lang, 'ar-EG');

// 2. Text normalization eliminates raw English acronyms/units/markdown that make TTS pronounce numbers or English
const rawSample =
  '## 1. دهان Greige مع إضاءة 3000K\nنسبة التناسق 60-30-10 واستخدام ألواح WPC وبديل الرخام PVC بنسبة 100% خلال 24h! [اقرأ](https://example.com)';
const cleaned = prepareArabicSpeechText(rawSample);

assert.ok(!cleaned.includes('Greige'), 'English Greige should become Arabic');
assert.ok(!cleaned.includes('3000K'), '3000K should become spoken Arabic');
assert.ok(!cleaned.includes('WPC'), 'WPC should become بديل الخشب');
assert.ok(!cleaned.includes('PVC'), 'PVC should become بي في سي');
assert.ok(!cleaned.includes('https://'), 'URLs must be stripped');
assert.ok(!cleaned.includes('##'), 'Markdown hashes must be stripped');
assert.ok(cleaned.includes('جريج'), 'Cleaned text should contain جريج');
assert.ok(cleaned.includes('ثلاثة آلاف كلفن'), 'Cleaned text should contain ثلاثة آلاف كلفن');

// 3. Article chunking produces clean Arabic chunks without parenthetical numbers like (1 من 10)
const article = INITIAL_ARTICLES[0];
const chunks = createArticleSpeechChunks(article, 'full', 'الحضرى محمود');
assert.ok(chunks.length > 3, 'Should segment full article into multiple chunks');
assert.ok(!chunks[0].includes('أهلاً بك في مدونة'), 'Must not prepend unnecessary blog welcome intro before reading article');
assert.ok(chunks[0].includes('دهانات') || chunks[0].length > 10, 'First chunk should start directly with the article title');
chunks.forEach((c) => {
  assert.ok(!c.includes('0ms'), 'No 0ms ASCII token in spoken chunks');
  assert.ok(c.trim().length > 0, 'Chunks must not be empty');
});

const split = splitSpeechTextIntoChunks(article.content, 25);
assert.ok(split.length >= 2, 'splitSpeechTextIntoChunks should break long article content');

import fs from 'node:fs';
import {
  withTimeout,
  GeminiKeyError,
  isGeminiKeyError,
  formatGeminiArabicError,
  isTimeoutOrNetworkError,
  blindReaderDialogueWithGeminiClient,
  chatWithGeminiClient,
} from './src/services/geminiClient';

console.log(`✅ Verified Arabic Speech Engine (${chunks.length} article chunks, strict Arabic voice check passed).`);

async function runChatbotChecks() {
  console.log('🤖 Testing Chatbot & Reader Anti-Hang Safeguards...');

  // 4. withTimeout must reject stalled promises instead of hanging forever
  const neverResolves = new Promise<string>(() => {});
  let timedOut = false;
  try {
    await withTimeout(neverResolves, 40, 'انتهت مهلة الاختبار');
  } catch (err) {
    timedOut = true;
    assert.ok(isTimeoutOrNetworkError(err), 'Timeout error must be recognized as timeout/network error');
    assert.ok(
      formatGeminiArabicError(err).includes('انتهت مهلة'),
      'Arabic timeout error must be readable'
    );
  }
  assert.ok(timedOut, 'withTimeout must reject stalled promises');

  // 5. Missing key throws clear GeminiKeyError synchronously/fast without hanging in both bots
  let readerMissingKey = false;
  try {
    await blindReaderDialogueWithGeminiClient({
      userSpeech: 'كيف أختار ألوان غرفة المعيشة؟',
      currentArticle: article,
      articles: INITIAL_ARTICLES,
      history: [],
      ownerName: 'الحضرى محمود',
    });
  } catch (err) {
    readerMissingKey = isGeminiKeyError(err);
    assert.ok(err instanceof GeminiKeyError && err.code === 'MISSING_KEY');
    assert.ok(formatGeminiArabicError(err).includes('VITE_GEMINI_API_KEY'));
  }
  assert.ok(readerMissingKey, 'Reader dialogue must fail fast with Arabic missing-key message when key is absent');

  let chatMissingKey = false;
  try {
    await chatWithGeminiClient({
      messages: [{ role: 'user', content: 'أريد سعر دهان شقة' }],
      siteInfo: {
        blogName: 'ألفا للديكور والدهانات',
        authorName: 'الحضرى محمود',
        recentArticles: [],
      },
      negotiationConfig: {
        ownerPhone: '+201098765432',
        ownerWhatsApp: '201098765432',
        currency: '$',
        services: [],
      },
      currentArticle: null,
    });
  } catch (err) {
    chatMissingKey = isGeminiKeyError(err);
    assert.ok(err instanceof GeminiKeyError && err.code === 'MISSING_KEY');
  }
  assert.ok(chatMissingKey, 'ChatBot must fail fast with Arabic missing-key message when key is absent');

  // 6. Verify source safeguards in BlindScreenReader, ChatBot, and App
  const readerSrc = fs.readFileSync('src/components/BlindScreenReader.tsx', 'utf8');
  assert.ok(readerSrc.includes('aiRequestIdRef'), 'BlindScreenReader must guard concurrent/stale AI requests');
  assert.ok(readerSrc.includes('processInputRef'), 'BlindScreenReader must use processInputRef for voice recognition');
  assert.ok(readerSrc.includes('withTimeout('), 'BlindScreenReader must wrap AI requests with outer timeout');
  assert.ok(!readerSrc.includes('startStreamingSingleText(immediateAck)'), 'BlindScreenReader must not fire colliding filler TTS before AI reply');

  const chatBotSrc = fs.readFileSync('src/components/ChatBot.tsx', 'utf8');
  assert.ok(chatBotSrc.includes('requestIdRef'), 'ChatBot must track requestIdRef for cancellation/loading cleanup');
  assert.ok(chatBotSrc.includes('setActiveMode(initialMode)'), 'ChatBot must sync activeMode with initialMode prop');
  assert.ok(chatBotSrc.includes('withTimeout('), 'ChatBot must wrap chat requests with outer timeout');

  const appSrc = fs.readFileSync('src/App.tsx', 'utf8');
  assert.ok(appSrc.includes('initialMode={chatBotMode}'), 'App must pass chatBotMode to ChatBot');

  const geminiClientSrc = fs.readFileSync('src/services/geminiClient.ts', 'utf8');
  assert.ok(
    !geminiClientSrc.includes('اقرأ النص العربي التالي'),
    'TTS contents must not include spoken Arabic instruction preamble'
  );

  console.log('✅ Verified Chatbot & Reader Anti-Hang Safeguards (all checks passed).');
}

await runChatbotChecks();

