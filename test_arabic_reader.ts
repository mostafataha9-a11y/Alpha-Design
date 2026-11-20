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
assert.ok(chunks[0].includes('نبدأ قراءة مقال'), 'First chunk should introduce the article in Arabic');
chunks.forEach((c) => {
  assert.ok(!c.includes('0ms'), 'No 0ms ASCII token in spoken chunks');
  assert.ok(c.trim().length > 0, 'Chunks must not be empty');
});

const split = splitSpeechTextIntoChunks(article.content, 25);
assert.ok(split.length >= 2, 'splitSpeechTextIntoChunks should break long article content');

console.log(`✅ Verified Arabic Speech Engine (${chunks.length} article chunks, strict Arabic voice check passed).`);
