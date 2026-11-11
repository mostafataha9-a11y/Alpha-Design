import dotenv from 'dotenv';
dotenv.config();

import { countActualWords, validateArticlePayload } from './src/utils/articleValidator.ts';
import { computePerceptualHash, hammingDistance, isPerceptualDuplicate } from './src/utils/imageHasher.ts';
import { allocateContextualDecorImages, EXPANDED_DECOR_CATALOG } from './src/data/curatedImagesCatalog.ts';
import {
  getDbArticles,
  createDbArticle,
  deleteDbArticle,
  recordImageUsage,
  checkImageDuplicateInDb,
  getUsedImageUrls
} from './src/db/repo.ts';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 بدء تشغيل اختبارات الأمر التنفيذي الثالث');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, details || '');
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Actual Word Count Calculation
  // -------------------------------------------------------------------------
  console.log('\n--- اختبار 1: حساب العدد الفعلي للكلمات وتنظيف الرموز ---');
  const sampleMarkdown = `
    # عنوان رئيسي في دهانات الحوائط والديكور الفاخر
    ![شرح توضيحي](https://example.com/image.jpg)
    [[IMAGE_0]]
    [[IMAGE_1]]
    هذا نص تجريبي يحتوي على خمس كلمات فقط.
    [رابط خارجي](https://example.com)
  `;
  const counted = countActualWords(sampleMarkdown);
  console.log(`Word count calculated: ${counted} genuine words`);
  assert(counted === 17, `حساب عدد الكلمات الفعلي يستبعد روابط الصور والعلامات بدقة (الناتج: ${counted} كلمة)`);

  // -------------------------------------------------------------------------
  // TEST 2: Reject Articles < 1,000 Words from Publishing
  // -------------------------------------------------------------------------
  console.log('\n--- اختبار 2: منع نشر المقالات التي تقل عن 1000 كلمة ---');
  const shortText = 'هذا مقال قصير جداً عن دهانات الحوائط والديكور.'.repeat(10); // ~70 words
  const shortValidation = validateArticlePayload({
    title: 'أحدث صيحات دهانات الحوائط 2026',
    content: `## عنوان فرعي\n\n${shortText}`,
    status: 'published',
  }, { minWords: 1000, strictPublish: true });

  assert(!shortValidation.valid, 'المقال القصير (< 1000 كلمة) يتم رفض نشره بنجاح');
  assert(shortValidation.status === 'draft', 'المقال القصير يتم تحويله إجبارياً إلى مسودة (Draft)');
  assert(shortValidation.errors.some(e => e.includes('أقل من الحد الأدنى')), 'وجود رسالة خطأ صريحة توضح نقص عدد الكلمات');

  // -------------------------------------------------------------------------
  // TEST 3: Validate Rich Article >= 1,000 Words
  // -------------------------------------------------------------------------
  console.log('\n--- اختبار 3: قبول المقال الهندسي المستوفي للشروط (> 1000 كلمة) ---');
  const validParagraph = `تعتبر دهانات الحوائط الديكورية المعمارية ركيزة الفخامة في الفراغات المنزلية العصرية. ينصح استشاري التشطيبات الحضرى محمود بتطبيق سيلر مائي عالي الجودة لعزل الرطوبة وسحب ثلاث سكاكين معجون ناعم متقاطع لضمان استواء الجدران قبل طلاء بويات البلاستيك المط والنصف لامع المقاوم للغسيل. `;
  const repeatedValidContent = `## المحور الأول: أسرار تأسيس دهانات الحوائط\n\n` + validParagraph.repeat(35) + `\n\n### نصائح عملية من الحضرى محمود\n\n` + validParagraph.repeat(10);
  const longActualCount = countActualWords(repeatedValidContent);
  console.log(`Valid content actual words: ${longActualCount}`);

  const longValidation = validateArticlePayload({
    title: 'الدليل الهندسي الشامل لتأسيس دهانات الحوائط والديكور 2026',
    excerpt: 'دليل شامل ومفصل يستعرض أحدث تقنيات دهانات الحوائط وبديل الرخام وبديل الخشب.',
    content: repeatedValidContent,
    category: 'دهانات وديكورات الحوائط',
    status: 'published',
  }, { minWords: 1000 });

  assert(longValidation.valid, 'المقال الثري (> 1000 كلمة) يستوفي جميع المعايير بنجاح');
  assert(longValidation.status === 'published', 'المقال الثري يحصل على حالة نشر رسمي (Published)');

  // -------------------------------------------------------------------------
  // TEST 4: Intra-Article Duplicate Image Detection
  // -------------------------------------------------------------------------
  console.log('\n--- اختبار 4: كشف ومنع تكرار الصور داخل المقال الواحد ---');
  const duplicateImageContent = `## قسم الديكور\n\n![صورة 1](https://images.unsplash.com/photo-1618221195710-dd6b41faaea6)\n\nنص معماري.\n\n![صورة مكررة](https://images.unsplash.com/photo-1618221195710-dd6b41faaea6)\n\n` + validParagraph.repeat(30);
  const dupImgValidation = validateArticlePayload({
    title: 'تجربة فحص تكرار الصور في دهانات الحوائط',
    content: duplicateImageContent,
    status: 'published',
  });
  assert(!dupImgValidation.valid, 'اكتشاف تكرار نفس الصورة داخل المقال الواحد ورفض نشره');
  assert(dupImgValidation.errors.some(e => e.includes('صور مكررة')), 'رسالة الخطأ توضح وجود تكرار داخلي للصور');

  // -------------------------------------------------------------------------
  // TEST 5: Contextual Image Allocation without Duplication
  // -------------------------------------------------------------------------
  console.log('\n--- اختبار 5: تخصيص صور فريدة وربطها سياقياً بموضوع المقال ---');
  const allocated = allocateContextualDecorImages({
    count: 5,
    topic: 'ديكورات بديل الرخام وبديل الخشب وجدار التلفزيون',
  });
  assert(allocated.length === 5, 'تخصيص العدد المطلوب من الصور بنجاح');
  const allocatedUrls = new Set(allocated.map(a => a.url));
  assert(allocatedUrls.size === 5, 'جميع الصور المخصصة فريدة 100% ولا يوجد أي تكرار داخلي');
  assert(allocated.some(a => a.topicCategory === 'wood_slats_marble'), 'الصور مرتبطة سياقياً بموضوع بديل الخشب والرخام');

  // -------------------------------------------------------------------------
  // TEST 6: Perceptual Difference Hash (dHash) & Hamming Distance
  // -------------------------------------------------------------------------
  console.log('\n--- اختبار 6: حساب Perceptual Hash واكتشاف التطابق البصري ---');
  const sharp = (await import('sharp')).default;
  const pngA = await sharp({
    create: {
      width: 120,
      height: 120,
      channels: 3,
      background: { r: 150, g: 120, b: 90 },
    },
  }).png().toBuffer();

  const hashA = await computePerceptualHash(pngA);

  // Identical image
  const hashIdentical = await computePerceptualHash(pngA);
  const distIdentical = hammingDistance(hashA, hashIdentical);
  assert(distIdentical === 0, `مسافة هامنغ للصور المتطابقة هي صفر (${distIdentical})`);
  assert(isPerceptualDuplicate(hashA, hashIdentical, 8), 'اكتشاف التطابق التام عبر dHash');

  // Compressed JPEG version of the same image (simulates compression and format conversion)
  const jpegA = await sharp(pngA).jpeg({ quality: 75 }).toBuffer();
  const hashJpeg = await computePerceptualHash(jpegA);
  const distJpeg = hammingDistance(hashA, hashJpeg);
  console.log(`Hamming distance between PNG and 75% quality JPEG: ${distJpeg}`);
  assert(distJpeg <= 6, `تطابق الصور عبر dHash حتى مع تحويل الصيغة والضغط إلى JPEG (مسافة ${distJpeg} <= 6)`);
  assert(isPerceptualDuplicate(hashA, hashJpeg, 8), 'التعرف على الصورة كصورة مكررة حسياً (Perceptual Duplicate)');

  // -------------------------------------------------------------------------
  // TEST 7: Cross-Article Image Deduplication in PostgreSQL Registry
  // -------------------------------------------------------------------------
  console.log('\n--- اختبار 7: منع إعادة استخدام الصورة في مقال آخر عبر سجل PostgreSQL ---');
  const testImgUrl = `https://images.unsplash.com/photo-test-dedup-${Date.now()}`;
  const testHash = 'a1b2c3d4e5f60718';

  // Record image in past article
  await recordImageUsage({
    articleId: 'past-article-999',
    imageUrl: testImgUrl,
    imageHash: testHash,
    caption: 'صورة توضيحية لدهان الجريج في مقال سابق',
  });

  // Check duplicate for a new article
  const dupCheckExact = await checkImageDuplicateInDb(testImgUrl, 'other-hash-12345', 'new-article-1');
  assert(dupCheckExact.isDuplicate, 'كشف تكرار الرابط الدقيق للصورة عبر قاعدة البيانات PostgreSQL');

  const dupCheckHash = await checkImageDuplicateInDb('https://different-url.com/same-image.jpg', testHash, 'new-article-1');
  assert(dupCheckHash.isDuplicate, 'كشف التطابق الحسي (Perceptual Hash) لنفس الصورة حتى مع اختلاف الرابط');

  // -------------------------------------------------------------------------
  // TEST 8: Database Persistence as Single Source of Truth & Draft Filtering
  // -------------------------------------------------------------------------
  console.log('\n--- اختبار 8: PostgreSQL هو المصدر الوحيد للمقالات وعزل المسودات عن الزوار ---');
  const draftTestId = 'test-draft-' + Date.now();
  await createDbArticle({
    id: draftTestId,
    title: 'مسودة تجريبية غير جاهزة للنشر',
    content: 'محتوى مسودة قصير جداً.',
    category: 'دهانات وديكورات الحوائط',
    status: 'draft',
  });

  const publicArticles = await getDbArticles({ statusFilter: 'published' });
  const isDraftInPublic = publicArticles.some((a: any) => a.id === draftTestId);
  assert(!isDraftInPublic, 'المسودات لا تظهر إطلاقاً للزوار في واجهة المقالات المنشورة');

  const allArticles = await getDbArticles({ statusFilter: 'all' });
  const isDraftInAll = allArticles.some((a: any) => a.id === draftTestId);
  assert(isDraftInAll, 'المسودة محفوظة وموجودة بأمان في PostgreSQL للإدارة');

  // Clean up test draft
  await deleteDbArticle(draftTestId);

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n====================================================');
  console.log(`🎉 اكتملت جميع الاختبارات بنجاح! (${passedTests}/${totalTests})`);
  console.log('====================================================');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ فشل الاختبارات:', err);
    process.exit(1);
  });
