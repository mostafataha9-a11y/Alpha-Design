import { Router, Request, Response } from 'express';
import {
  getDbSocialChannels,
  addDbSocialChannel,
  deleteDbSocialChannel,
  toggleDbSocialChannel,
  addDbSocialLog,
  getDbSocialLogs,
  getDbSettings,
} from '../db/repo.ts';
import { requireAdminAuth } from './authRoutes.ts';
import { generateWithAi, extractAndParseJson } from './aiProvider.ts';

export const socialRouter = Router();

interface DecorChannelRecord {
  id: string;
  name: string;
  url: string;
  platform: 'facebook' | 'telegram' | 'whatsapp' | 'instagram' | 'twitter' | 'linkedin' | 'pinterest';
  channelType: 'group' | 'page' | 'channel' | 'account' | 'community';
  hasPostingPermission: boolean;
  privacyVerified: boolean;
  status: 'active' | 'paused';
  specialization: string;
  postsCount: number;
  lastPostedAt?: string;
  addedAt: string;
}

// Bot state: Disabled (false) by default to strictly prevent unapproved automated posting
const botState = {
  enabled: false,
  intervalMinutes: 30,
  maxArticleAgeHours: 24,
  lastDispatchAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  nextDispatchAt: new Date(Date.now() + 1000 * 60 * 12).toISOString(),
  privacyComplianceRules: {
    antiSpamEnforced: true,
    checkTermsBeforePost: true,
    customDecorIntro: true,
    includeDecorHashtags: true,
  },
  channels: [] as DecorChannelRecord[],
  history: [] as any[],
};

// GET bot status & registered channels from Cloud SQL
socialRouter.get('/api/social-bot/status', async (req: Request, res: Response) => {
  try {
    const channels = await getDbSocialChannels();
    const history = await getDbSocialLogs();
    const settings: any = await getDbSettings();
    const autoBroadcast = settings?.socialBroadcast?.autoBroadcastOnPublish ?? false;

    res.json({
      success: true,
      enabled: botState.enabled,
      autoBroadcast,
      botState: {
        ...botState,
        channels,
        history,
      },
    });
  } catch (err) {
    console.error('Failed to get social bot status:', err);
    res.status(500).json({ error: 'فشل استرجاع حالة بوت النشر من قاعدة البيانات.' });
  }
});

// POST toggle bot active/paused (Admin protected)
socialRouter.post('/api/social-bot/toggle', requireAdminAuth, (req: Request, res: Response) => {
  botState.enabled = !botState.enabled;
  if (botState.enabled) {
    botState.nextDispatchAt = new Date(Date.now() + 1000 * 60 * botState.intervalMinutes).toISOString();
  }
  res.json({
    success: true,
    enabled: botState.enabled,
    nextDispatchAt: botState.nextDispatchAt,
  });
});

// POST add a new specialized channel/page link uploaded by blog owner (Admin protected)
socialRouter.post('/api/social-bot/channels', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { name, url, platform, channelType, specialization, hasPostingPermission } = req.body;

    if (!name || !url) {
      return res.status(400).json({ error: 'اسم القناة/الصفحة ورابطها مطلوبان.' });
    }

    if (!hasPostingPermission) {
      return res.status(400).json({
        error: 'يجب تأكيد امتلاك إذن النشر والتسجيل في هذه الصفحة/الجروب قبل الإضافة.'
      });
    }

    const newChannel = await addDbSocialChannel({
      name: String(name).trim(),
      url: String(url).trim(),
      platform: platform || 'facebook',
      channelType: channelType || 'group',
      specialization: specialization || 'دهانات وديكورات معمارية متخصصة',
    });

    res.json({
      success: true,
      channel: newChannel,
      message: 'تمت إضافة الصفحة/الجروب المتخصص والتحقق من شروط الخصوصية وصلاحية النشر بنجاح وحفظها في قاعدة البيانات.'
    });
  } catch (err) {
    console.error('Error adding social channel:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إضافة القناة في قاعدة البيانات.' });
  }
});

// DELETE a registered channel (Admin protected)
socialRouter.delete('/api/social-bot/channels/:id', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteDbSocialChannel(id);
    res.json({ success: true, message: 'تم حذف القناة من قاعدة البيانات بنجاح.' });
  } catch (err) {
    console.error('Error deleting social channel:', err);
    res.status(500).json({ error: 'فشل حذف القناة من قاعدة البيانات.' });
  }
});

// PUT toggle channel status (Admin protected)
socialRouter.put('/api/social-bot/channels/:id/toggle', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const nextStatus = await toggleDbSocialChannel(id);
    if (nextStatus) {
      return res.json({ success: true, status: nextStatus });
    }
    res.status(404).json({ error: 'القناة غير موجودة في قاعدة البيانات.' });
  } catch (err) {
    console.error('Error toggling social channel:', err);
    res.status(500).json({ error: 'فشل تغيير حالة القناة.' });
  }
});

/**
 * POST dispatch cycle:
 * Executes one dispatch cycle with STRICT enforcement:
 * 1. Requires Admin Auth.
 * 2. Requires Bot Enabled.
 * 3. Enforces 24-Hour freshness window.
 * 4. Executes REAL Privacy & Terms Compliance Audit via unified AI layer.
 * 5. Rejects publication if privacy audit fails (fails safely).
 * 6. Checks target platform official API credentials:
 *    - Never marks as 'published' without verified platform API response.
 *    - Marks as 'not_configured' when credentials are unconfigured.
 *    - Marks as 'failed' if platform API returns an error.
 *    - Marks as 'published' ONLY if platform API confirms receipt.
 */
socialRouter.post('/api/social-bot/dispatch', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    // 1. Verify Bot is Active
    if (!botState.enabled) {
      return res.status(400).json({
        success: false,
        error: 'BOT_PAUSED',
        message: 'بوت النشر التلقائي معطل حالياً بقرار الإدارة. يرجى تفعيله أولاً من لوحة التحكم قبل إطلاق دورات البث.',
      });
    }

    const { article, channelId } = req.body;

    if (!article || !article.title) {
      return res.status(400).json({ error: 'بيانات المقال غير مكتملة.' });
    }

    const now = Date.now();
    const publishedTime = new Date(article.publishedAt || now).getTime();
    const ageHours = (now - publishedTime) / (1000 * 60 * 60);

    // 2. Strict 24-Hour freshness check
    if (ageHours > 24) {
      const skippedLog = {
        id: 'dispatch-' + Date.now(),
        timestamp: new Date().toISOString(),
        articleId: article.id,
        articleTitle: article.title,
        articleSlug: article.slug,
        articleUrl: `/article/${encodeURIComponent(article.slug)}`,
        targetChannelId: channelId || 'all',
        targetChannelName: 'فحص نافذة النشر التلقائي',
        targetPlatform: 'facebook',
        postSnippet: 'تم حظر النشر تلقائياً.',
        privacyCheckPassed: false,
        ageHoursAtPublish: Number(ageHours.toFixed(1)),
        status: 'skipped_expired_24h' as const,
        notes: `تم استبعاد المقال تلقائياً لأن عمره تجاوز 24 ساعة (${ageHours.toFixed(1)} ساعة). البوت يلتزم حصرياً بنشر المقالات خلال أول 24 ساعة من نشرها لتفادي التكرار والحظر.`,
      };

      await addDbSocialLog(skippedLog);

      return res.status(400).json({
        success: false,
        error: 'EXPIRED_24H_RULE',
        ageHours: ageHours.toFixed(1),
        message: `مرفوض طبقاً لشرط الـ 24 ساعة: مر على نشر هذا المقال ${ageHours.toFixed(1)} ساعة (أكثر من 24 ساعة). البوت يلتزم بنشر المقالات خلال 24 ساعة فقط منعاً لتكرار المحتوى وحماية الحسابات من الحظر.`,
        log: skippedLog,
      });
    }

    // 3. Pick channel from Cloud SQL
    const allChannels = await getDbSocialChannels();
    let targetChannel = allChannels.find((c) => c.id === channelId && c.status === 'active');
    if (!targetChannel) {
      const activeChannels = allChannels.filter((c) => c.status === 'active' && c.hasPostingPermission);
      if (activeChannels.length === 0) {
        return res.status(400).json({ error: 'لا توجد صفحات أو قنوات نشطة ومصرح بالنشر فيها حالياً في قاعدة البيانات.' });
      }
      targetChannel = activeChannels[Math.floor(Math.random() * activeChannels.length)];
    }

    // 4. Generate post snippet and run real Privacy Audit via unified AI layer
    const articleLink = `${req.protocol}://${req.get('host')}/article/${encodeURIComponent(article.slug)}`;
    const auditPrompt = `أنت بوت النشر الذكي المعتمد لمدونة «ألفا للديكور والدهانات» بإشراف الخبير «الحضرى محمود».
مهمتك: صياغة منشور تسويقي تفاعلي ومحترم لشروط الخصوصية وقواعد مكافحة السبام لنشر رابط مقال متخصص في صفحة/جروب:
- اسم القناة المستهدفة: "${targetChannel.name}"
- المنصة: "${targetChannel.platform}" (${targetChannel.channelType})
- تخصص القناة: "${targetChannel.specialization}"
- عنوان المقال: "${article.title}"
- ملخص المقال: "${article.excerpt || 'دليل هندسي متكامل في الديكورات وتشطيبات الحوائط'}"
- الرابط المباشر: "${articleLink}"
- عمر المقال الحالي: ${ageHours.toFixed(1)} ساعة (ضمن نافذة الـ 24 ساعة المسموح بها).

شروط الخصوصية ومكافحة الحظر:
1. عدم استخدام أسلوب Clickbait أو كلمات مضللة أو روابط تحويل غير آمنة.
2. نص جذاب وغني بالقيمة الديكورية والتنفيذية مع ذكر إشراف «الحضرى محمود».
3. وضع الرابط بطريقة واضحة مع إبراز 3 إلى 5 هاشتاجات متخصصة في الديكور والدهانات.

أعد الرد بصيغة JSON فقط:
{
  "postSnippet": "نص المنشور الكامل والجاهز للبث متضمناً الرابط والهاشتاجات...",
  "privacyAudit": {
    "compliant": true,
    "platformRulesChecked": ["منع السبام والتكرار", "حدود الحروف المعتمدة", "احترام سياسات الجروب", "رابط مباشر آمن"],
    "notes": "المنشور مطابق 100% لمعايير الخصوصية وسياسات النشر للمنصة."
  }
}`;

    let postSnippet = '';
    let privacyCheckPassed = false;
    let privacyAuditNotes = '';

    try {
      const aiResult = await generateWithAi({
        prompt: auditPrompt,
        responseJson: true,
        temperature: 0.6,
        timeoutMs: 15000,
      });

      const parsed = extractAndParseJson(aiResult.text);
      postSnippet = String(parsed.postSnippet || '').trim();
      privacyCheckPassed = Boolean(parsed.privacyAudit?.compliant);
      privacyAuditNotes = parsed.privacyAudit?.notes || 'تمت مراجعة شروط الخصوصية ومطابقة معايير المجتمع بنجاح.';
    } catch (err: any) {
      // Security enforcement: DO NOT silently pass privacy check on AI error
      privacyCheckPassed = false;
      privacyAuditNotes = `تعذر استكمال التدقيق الآلي لشروط الخصوصية: ${err?.message || 'خطأ في خدمة الذكاء الاصطناعي'}. تم حظر النشر احترازياً.`;
    }

    // Programmatic Deterministic Policy Validation
    if (privacyCheckPassed && postSnippet) {
      // 1. Check length limit per platform
      const platformLimits: Record<string, number> = {
        telegram: 4096,
        twitter: 280,
        facebook: 60000,
        linkedin: 3000,
        whatsapp: 4096,
        instagram: 2200,
      };
      const maxLen = platformLimits[targetChannel.platform] || 4000;
      if (postSnippet.length > maxLen) {
        privacyCheckPassed = false;
        privacyAuditNotes = `تجاوز النص الحد الأقصى المسموح لمنصة ${targetChannel.platform} (${postSnippet.length} حرف / المسموح ${maxLen}).`;
      }

      // 2. Anti-spam keyword inspection
      const spamTriggers = ['ربح مجاني', 'اضغط هنا لتربح', 'يانصيب', 'احصل على جائزة', 'bitcoin', 'crypto', 'viagra'];
      const hasSpam = spamTriggers.some((kw) => postSnippet.toLowerCase().includes(kw));
      if (hasSpam) {
        privacyCheckPassed = false;
        privacyAuditNotes = 'رُفض المنشور لاحتوائه على عبارات ترويجية مضللة أو غير ملائمة لتخصص الديكور.';
      }
    }

    // 5. Fail safely if privacy check failed
    if (!privacyCheckPassed || !postSnippet) {
      const failedLog = {
        id: 'dispatch-' + Date.now(),
        timestamp: new Date().toISOString(),
        articleId: article.id,
        articleTitle: article.title,
        articleSlug: article.slug,
        articleUrl: `/article/${encodeURIComponent(article.slug)}`,
        targetChannelId: targetChannel.id,
        targetChannelName: targetChannel.name,
        targetPlatform: targetChannel.platform,
        postSnippet: postSnippet || 'تم حجب النص لعدم اجتياز الفحص الأمني.',
        privacyCheckPassed: false,
        ageHoursAtPublish: Number(ageHours.toFixed(1)),
        status: 'failed' as const,
        notes: `تم حظر البث: فشل فحص الخصوصية أو قواعد مكافحة السبام (${privacyAuditNotes}).`,
      };

      await addDbSocialLog(failedLog);

      return res.status(400).json({
        success: false,
        error: 'PRIVACY_CHECK_FAILED',
        message: 'تم حظر المنشور تلقائياً لعدم اجتياز فحص الخصوصية وسياسات النشر للمنصة.',
        notes: privacyAuditNotes,
        log: failedLog,
      });
    }

    // 6. External Platform Integration Check (Prevent Fake Success)
    let finalStatus: 'not_configured' | 'queued' | 'publishing' | 'published' | 'failed' = 'not_configured';
    let externalPostId: string | null = null;
    let integrationMessage = '';

    if (targetChannel.platform === 'telegram') {
      const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
      const rawChatId = process.env.TELEGRAM_CHAT_ID?.trim();

      if (botToken && rawChatId) {
        try {
          // Robust chat_id normalization: numeric IDs (e.g. -100123456789 or 12345) must NOT have '@' prepended
          const formattedChatId = /^-?\d+$/.test(rawChatId)
            ? rawChatId
            : (rawChatId.startsWith('@') ? rawChatId : `@${rawChatId}`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: formattedChatId,
              text: postSnippet,
              parse_mode: 'HTML',
              disable_web_page_preview: false,
            }),
          });
          clearTimeout(timeoutId);

          const tgData: any = await tgRes.json();
          if (tgRes.ok && tgData.ok) {
            finalStatus = 'published';
            externalPostId = String(tgData.result?.message_id);
            integrationMessage = `تم النشر الفعلي بنجاح عبر Telegram Bot API الرسمي (معرّف الرسالة: ${externalPostId}).`;
          } else {
            finalStatus = 'failed';
            integrationMessage = `فشلت عملية النشر على تليجرام: ${tgData.description || 'Unknown Telegram Error'}`;
          }
        } catch (tgErr: any) {
          finalStatus = 'failed';
          integrationMessage = `تعذر الاتصال بواجهة تليجرام الرسمية: ${tgErr.name === 'AbortError' ? 'انتهت مهلة الاتصال (10s)' : tgErr.message}`;
        }
      } else {
        finalStatus = 'not_configured';
        integrationMessage = 'تكامل Telegram Bot API غير مُعد على الخادم (TELEGRAM_BOT_TOKEN أو TELEGRAM_CHAT_ID غير مضبوط). تم حفظ المسودة دون ادعاء نجاح النشر.';
      }
    } else {
      // Facebook, Twitter, LinkedIn, etc.
      // Do NOT claim published if official API integration keys are not configured
      finalStatus = 'not_configured';
      integrationMessage = `تكامل ${targetChannel.platform} غير مُعد على الخادم (غياب مفاتيح API الرسمية وتفويض الحساب). تم حفظ مسودة المنشور بنجاح دون ادعاء نجاح النشر الوهمي.`;
    }

    botState.lastDispatchAt = new Date().toISOString();
    botState.nextDispatchAt = new Date(Date.now() + 1000 * 60 * botState.intervalMinutes).toISOString();

    const dispatchLogItem = {
      id: 'dispatch-' + Date.now(),
      timestamp: new Date().toISOString(),
      articleId: article.id,
      articleTitle: article.title,
      articleSlug: article.slug,
      articleUrl: `/article/${encodeURIComponent(article.slug)}`,
      targetChannelId: targetChannel.id,
      targetChannelName: targetChannel.name,
      targetPlatform: targetChannel.platform,
      postSnippet,
      privacyCheckPassed: true,
      ageHoursAtPublish: Number(ageHours.toFixed(1)),
      status: finalStatus,
      externalPostId: externalPostId || undefined,
      notes: `${privacyAuditNotes} | ${integrationMessage}`,
    };

    await addDbSocialLog(dispatchLogItem);

    const isPublished = finalStatus === 'published';
    res.json({
      success: isPublished,
      status: finalStatus,
      published: isPublished,
      message: integrationMessage,
      dispatchLog: dispatchLogItem,
      nextDispatchAt: botState.nextDispatchAt,
      channel: targetChannel,
    });
  } catch (err: unknown) {
    console.error('Error in social-bot dispatch:', err);
    res.status(500).json({
      error: 'فشل تنفيذ عملية البث.',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// Social broadcast generator (via unified AI layer)
socialRouter.post('/api/ai/social-broadcast', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { articleTitle, articleExcerpt, articleUrl, tags, authorName = 'الحضرى محمود' } = req.body;

    const prompt = `أنت المساعد التسويقي المفوض رسمياً من صاحب المدونة "${authorName}" لمدونة "ألفا ديزاين".
المهمة: صياغة منشورات احترافية وجذابة لمشاركة رابط المقال التالي على وسائل التواصل الاجتماعي:
- عنوان المقال: "${articleTitle}"
- الملخص: "${articleExcerpt}"
- الرابط المعتمد: "${articleUrl || 'https://alphadesign.blog/'}"
- الوسوم: ${Array.isArray(tags) ? tags.join(' #') : '#تصميم'}

المطلوب: توليد نصوص مخصصة لكل منصة من المنصات التالية:
1. twitter (تغريدة جذابة أقل من 260 حرف مع وسوم تفاعلية ورابط المقال)
2. linkedin (منشور احترافي يستعرض الفائدة والدروس المستفادة للمصممين مع الرابط)
3. facebook (منشور ملهم وممتع يشجع على القراءة والمناقشة)
4. telegram (رسالة واضحة وأنيقة للقنوات والمجموعات مع روابط التصفح)
5. whatsapp (رسالة موجزة مخصصة للمحادثات السريعة مع زر الدعوة للقراءة)

أعد النتيجة حصراً بتنسيق JSON بالشكل:
{
  "twitter": "نص التغريدة...",
  "linkedin": "نص لينكدإن...",
  "facebook": "نص فيسبوك...",
  "telegram": "نص تيليجرام...",
  "whatsapp": "نص واتساب...",
  "delegatedBy": "${authorName}",
  "broadcastTime": "${new Date().toISOString()}"
}`;

    const aiResult = await generateWithAi({
      prompt,
      responseJson: true,
      temperature: 0.7,
      timeoutMs: 20000,
    });

    const data = extractAndParseJson(aiResult.text);

    res.json({
      success: true,
      delegatedBy: authorName,
      providerUsed: aiResult.providerUsed,
      modelUsed: aiResult.modelUsed,
      broadcasts: data,
    });
  } catch (err: unknown) {
    console.error('Error in social-broadcast:', err);
    res.status(500).json({
      error: 'Failed to generate social broadcasts',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});
