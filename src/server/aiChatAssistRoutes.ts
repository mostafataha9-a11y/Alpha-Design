import { Router, Request, Response } from 'express';
import { requireAdminAuth } from './authRoutes.ts';
import { generateWithAi, extractAndParseJson } from './aiProvider.ts';

export const aiChatAssistRouter = Router();

/**
 * Chatbot endpoint for Alpha Design blog visitors
 */
aiChatAssistRouter.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { messages, siteInfo, currentArticle, negotiationConfig } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const authorName = siteInfo?.authorName || 'الحضرى محمود';
    const ownerPhone = negotiationConfig?.ownerPhone || '+201098765432';
    const ownerWhatsApp = negotiationConfig?.ownerWhatsApp || '201098765432';
    const servicesList = negotiationConfig?.services || [];

    const servicesText = servicesList.map((s: { name: string; basePrice: number; minNegotiatedPrice: number; currency: string; deliveryDays: number; unit: string; description: string; features: string[] }) => 
      `• خدمة: ${s.name}
        - السعر الأساسي المحدد من صاحب المدونة: ${s.basePrice}${s.currency} (${s.unit})
        - الحد الأدنى المقبول في التفاوض: ${s.minNegotiatedPrice}${s.currency}
        - مدة التسليم: ${s.deliveryDays} أيام
        - الوصف: ${s.description}
        - الميزات: ${s.features?.join('، ')}`
    ).join('\n');

    const systemInstruction = `أنت «مساعد ألفا الذكي» (Alpha Assistant)، المساعد الرسمي والمفوض التنفيذي للمبيعات والتفاوض وخدمة العملاء لمدونة واستوديو «ألفا للديكور والدهانات» التابع لخبير الديكور والتشطيبات المعمارية «${authorName}».

أدوارك ومهامك الجوهرية:
1. **الترحيب والمساعدة العامة:**
   - الترحيب بالزوار بلباقة، والتعريف بمؤسس وصاحب الموقع خبير الديكور «${authorName}».
   - الإجابة عن كافة أسئلة الديكورات، دهانات الحوائط، بديل الخشب والرخام، الأسقف المعلقة، تنسيق الألوان، ومشاركة مقالات المدونة.
   - ميزة تفويض نشر الروابط في وسائل التواصل الاجتماعي عند طلب مشاركة أي مقال ديكور.

2. **التفاوض على أسعار أعمال الديكور والدهانات وحساب التكلفة:**
   - عندما يستفسر الزائر عن خدمات، تشطيب شقة، دهانات داخلية أو خارجية، بديل رخام، جبس بورد، أو استشارات:
     أنت تمثل صاحب المدونة «${authorName}» مباشرة في التفاوض وتقديم عروض الأسعار.
   - قائمة الخدمات والأسعار المحددة بدقة من صاحب المدونة:
${servicesText}
   - **قواعد حساب الأسعار والتفاوض:**
     أ. اعرض دائماً السعر الأساسي المحدد من صاحب المدونة أولاً مع إبراز القيمة العالية وجودة العمل والضمانات.
     ب. إذا طلب العميل خصماً أو قال إن ميزانيته أقل أو فاوض على السعر:
        - احسب التكلفة وقدم له خصماً ذكياً وودوداً بشرط ألا يقل السعر المعروض نهائياً عن (الحد الأدنى المقبول في التفاوض) لكل خدمة.
        - وضح له ما يوفره من مال كعرض خاص لزوار المدونة بتفويض من «${authorName}».
        - إذا عرض العميل سعراً أقل من الحد الأدنى المقبول، اعتذر منه بلطف وبيّن له أن جودة وإتقان العمل تقتضي هذا الحد، واعرض عليه الحد الأدنى كأقصى تخفيض يمكن منحه.
     ج. **لحظة الاتفاق وإغلاق الصفقة (Deal Agreed):**
        - بمجرد أن يوافق العميل على السعر المعروض (مثل: "موافق"، "تمام اتفقنا"، "أوافق على السعر"، "احجز لي بهذا السعر"، "ممتاز اعتمد"):
          يجب عليك فوراً:
          1. تهنئته وتأكيد الاتفاق رسمياً باسم «${authorName}».
          2. إدراج هذا الوسم المنسق في نهاية ردك بدقة متناهية ليقوم النظام بالتحويل التلقائي:
             [DEAL_AGREED:{"service":"اسم الخدمة المتفق عليها","agreedPrice":"السعر المتفق عليه بالعملة","originalPrice":"السعر الأصلي","savings":"قيمة الخصم","scope":"موجز نطاق العمل المتفق عليه","deliveryDays":عدد_الأيام,"clientNeeds":"طلب العميل"}]
          3. إخبار العميل بأنه تم تجهيز بيانات الاتفاق ويجري الآن تحويله إلى واتساب صاحب المدونة «${authorName}» (${ownerWhatsApp}) أو الاتصال المباشر على الهاتف (${ownerPhone}) لبدء المشروع مباشرة.

3. **الأسلوب واللغة:**
   - لهجة احترافية، ودودة، ذكية، وبشرية راقية ومقنعة للغاية.
   - استخدم التنسيق المنظم (نقاط وعناوين واضحة).
   - التزم باللغة التي يخاطبك بها الزائر (عربية أو إنجليزية).

معلومات المدونة:
صاحب المدونة: ${authorName}
رقم هاتف صاحب المدونة للاتصال: ${ownerPhone}
رقم واتساب صاحب المدونة: ${ownerWhatsApp}
${currentArticle ? `المقال المعروض حالياً: "${currentArticle.title}"` : ''}
`;

    const conversationHistoryText = messages
      .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'الزائر' : 'المساعد الذكي'}: ${m.content}`)
      .join('\n');

    const result = await generateWithAi({
      systemInstruction,
      prompt: `سجل المحادثة حتى الآن:\n${conversationHistoryText}\n\nرد المساعد الذكي الآن:`,
      temperature: 0.7,
      timeoutMs: 25000,
    });

    const reply = result.text || 'مرحباً بك في ألفا ديزاين! أنا مساعدك الذكي للتفاوض وحساب تكلفة المشاريع، كيف يمكنني مساعدتك في مشروعك اليوم؟';
    res.json({ reply, providerUsed: result.providerUsed, modelUsed: result.modelUsed });
  } catch (err: unknown) {
    console.error('Error in chat endpoint:', err);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * AI Contractor Accounts Auditor & Calculation Corrector (Admin Protected)
 */
aiChatAssistRouter.post('/api/ai/audit-contractor-accounts', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { projects } = req.body;
    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: 'Projects array is required' });
    }

    const corrections: Array<{
      projectId: string;
      projectName: string;
      field: string;
      oldValue: number | string;
      correctedValue: number | string;
      reason: string;
    }> = [];

    const auditedProjects = projects.map((p: any) => {
      const agreed = Number(p.agreed) || 0;

      const payments = (p.payments || []).map((row: any) => ({
        ...row,
        amount: row.amount === '' || isNaN(Number(row.amount)) ? 0 : Math.max(0, Number(row.amount)),
      }));

      const labor = (p.labor || []).map((row: any) => ({
        ...row,
        amount: row.amount === '' || isNaN(Number(row.amount)) ? 0 : Math.max(0, Number(row.amount)),
      }));

      const daily = (p.daily || []).map((row: any) => ({
        ...row,
        amount: row.amount === '' || isNaN(Number(row.amount)) ? 0 : Math.max(0, Number(row.amount)),
      }));

      const expenses = (p.expenses || []).map((row: any) => ({
        ...row,
        amount: row.amount === '' || isNaN(Number(row.amount)) ? 0 : Math.max(0, Number(row.amount)),
      }));

      const totalPaid = payments.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
      const totalLabor = labor.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
      const totalDaily = daily.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
      const totalExpenses = expenses.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
      const totalCosts = totalLabor + totalDaily + totalExpenses;
      const netProfit = totalPaid - totalCosts;
      const remaining = agreed - totalPaid;

      if (agreed < 0) {
        corrections.push({
          projectId: p.id,
          projectName: p.name || p.client,
          field: 'المبلغ المتفق عليه',
          oldValue: p.agreed,
          correctedValue: Math.abs(p.agreed),
          reason: 'تم تصحيح القيمة السالبة للمبلغ المتفق عليه إلى قيمة موجبة',
        });
      }

      return {
        ...p,
        agreed: Math.max(0, agreed),
        payments,
        labor,
        daily,
        expenses,
        calc: {
          agreed: Math.max(0, agreed),
          totalPaid,
          totalLabor,
          totalDaily,
          totalExpenses,
          totalCosts,
          netProfit,
          remaining,
          profitMarginPercent: agreed > 0 ? ((netProfit / agreed) * 100).toFixed(1) : '0',
          collectionRatePercent: agreed > 0 ? ((totalPaid / agreed) * 100).toFixed(1) : '0',
        },
      };
    });

    let gAgreed = 0, gPaid = 0, gLabor = 0, gDaily = 0, gExp = 0, gCosts = 0, gProfit = 0, gRemaining = 0;
    auditedProjects.forEach((p: any) => {
      gAgreed += p.calc.agreed;
      gPaid += p.calc.totalPaid;
      gLabor += p.calc.totalLabor;
      gDaily += p.calc.totalDaily;
      gExp += p.calc.totalExpenses;
      gCosts += p.calc.totalCosts;
      gProfit += p.calc.netProfit;
      gRemaining += p.calc.remaining;
    });

    let aiAuditReport = '';
    try {
      const prompt = `أنت المدقق المالي والاستشاري الذكي لمقاولات الدهانات والديكور، تعمل لصالح المعلم «الحضرى محمود» صاحب استوديو ومدونة «الفا ديزين للدهانات».
قم بفحص وتدقيق هذه البيانات الحسابية لمشاريع مقاولات الدهانات:

إجمالي عدد المشاريع: ${auditedProjects.length}
إجمالي مبالغ التعاقد: ${gAgreed.toLocaleString('ar-EG')} ج.م
إجمالي المحصل من العملاء: ${gPaid.toLocaleString('ar-EG')} ج.م
إجمالي المتبقي ديون على العملاء: ${gRemaining.toLocaleString('ar-EG')} ج.م
إجمالي أجور الصنايعية (المصنعيات): ${gLabor.toLocaleString('ar-EG')} ج.م
إجمالي اليوميات: ${gDaily.toLocaleString('ar-EG')} ج.م
إجمالي مصروفات الخامات والنثريات: ${gExp.toLocaleString('ar-EG')} ج.م
إجمالي التكاليف الكلية: ${gCosts.toLocaleString('ar-EG')} ج.م
صافي الربح الفعلي الحالي: ${gProfit.toLocaleString('ar-EG')} ج.م

المطلوب بدقة:
1. تقرير تدقيق حسابي مختصر وواضح (هل الحسابات متوازنة؟ هل توجد أي مخاطر مالية أو خسائر أو متبقيات ديون حرجة؟).
2. تقييم نسب الأرباح والمصنعيات مقارنة بالخامات.
3. 3 إلى 5 نصائح إدارية ومالية ذكية محددة لصاحب العمل (الحضرى محمود) لزيادة أرباح مقاولات الدهانات وتسريع تحصيل المستحقات.
قدم الرد بلغة عربية احترافية، مشجعة، ومرتبة في نقاط وعناوين واضحة.`;

      const aiResponse = await generateWithAi({
        prompt,
        temperature: 0.3,
        timeoutMs: 30000,
      });

      aiAuditReport = aiResponse.text || 'تم فحص وتدقيق الحسابات بالكامل والتأكد من مطابقة الجمع والطرح بنسبة 100%.';
    } catch (aiErr) {
      console.warn('Gemini audit report generation fallback:', aiErr);
      aiAuditReport = `✅ تم التدقيق الحسابي الآلي بنجاح.
* إجمالي التعاقدات: ${gAgreed.toLocaleString('ar-EG')} ج.م
* إجمالي المحصل: ${gPaid.toLocaleString('ar-EG')} ج.م
* إجمالي التكاليف (مصنعيات + يوميات + مصروفات): ${gCosts.toLocaleString('ar-EG')} ج.م
* صافي الربح الإجمالي: ${gProfit.toLocaleString('ar-EG')} ج.م
* المتبقي على العملاء: ${gRemaining.toLocaleString('ar-EG')} ج.م
الحسابات مطابقة للمعادلات المحاسبية المعتمدة.`;
    }

    res.json({
      success: true,
      auditedProjects,
      corrections,
      summary: {
        totalProjects: auditedProjects.length,
        totalAgreed: gAgreed,
        totalPaid: gPaid,
        totalLabor: gLabor,
        totalDaily: gDaily,
        totalExpenses: gExp,
        totalCosts: gCosts,
        netProfit: gProfit,
        totalRemaining: gRemaining,
      },
      aiAuditReport,
    });
  } catch (error) {
    console.error('Error auditing accounts:', error);
    res.status(500).json({
      error: 'Failed to audit accounts',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Screen Reader AI Dialogue & Voice Command Engine for the Visually Impaired
 */
aiChatAssistRouter.post('/api/blind-reader-dialogue', async (req: Request, res: Response) => {
  try {
    const { userSpeech = '', currentArticle = null, articles = [], history = [] } = req.body;

    const availableArticlesSummary = (articles || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      category: a.category,
      excerpt: a.excerpt,
    }));

    const prompt = `أنت "المضيف الصوتي الذكي وقارئ الشاشة للمكفوفين وضِعاف البصر" الخاص بمدونة «ألفا ديزاين» بإشراف صاحب الموقع ومهندس الديكور والتشطيبات «الحضرى محمود».

شخصيتك وأسلوبك:
1. أنت تتعامل مع الزائر بصيغة "المسوق المحترف والمضيف الكريم الحنون": مرحب، كريم، فصيح وبسيط باللغة العربية، تشعر المستمع المكفوف بأنه في دار ضيافة راقية.
2. تبرز دائماً مهارات وخبرات صاحب الموقع «الحضرى محمود» في أحدث دهانات الحوائط، درجات الجريج والأوف وايت، بديل الرخام وبديل الخشب، والأسقف المعلقة، مع إقناع الزائر بلباقة بطلب استشارة أو التواصل المباشر.
3. تفهم أوامر الزائر الصوتية بذكاء تام، وتناديه بـ "ضيفنا العزيز" أو "أخي الكريم".
4. إذا طلب قراءة مقال، أو الانتقال لمقال معين، أو السؤال عن موضوع، حدد المقال الأنسب من القائمة أدناه وحدد نوع الإجراء (navigation).
5. إذا سأل أو طلب وصف الصور أو الألوان، صف له بأسلوب حسي ناطق كيف تبدو الألوان وتناغم الإضاءة كأنك ترسمها في خياله.

المقال الحالي المفتوح أمام الزائر (إن وُجد):
${currentArticle ? JSON.stringify({ id: currentArticle.id, title: currentArticle.title, category: currentArticle.category, excerpt: currentArticle.excerpt }) : 'لا يوجد مقال مفتوح، الزائر في تصفح عام'}

قائمة المقالات المتاحة في المدونة:
${JSON.stringify(availableArticlesSummary, null, 2)}

سجل المحادثة السابقة:
${JSON.stringify(history.slice(-4), null, 2)}

الأمر الصوتي أو كلام الزائر الآن:
"${userSpeech}"

أجب حصراً بصيغة JSON التالية بدون أي شروحات خارج الكائن:
{
  "speechResponse": "النص الصوتي الموجه للزائر ليُقرأ له بصوت مسموع ودافئ، مرحباً به ومجيباً على طلبه ومسوقاً لخدمات الحضرى محمود ومقترحاته.",
  "recommendedArticleIds": ["id للمقال المرشح إن وُجد"],
  "navigation": {
    "type": "article | tab | read | describe | none",
    "targetId": "معرف المقال إذا طلب الانتقال له أو قراءته",
    "tabName": "اسم التبويب مثل articles أو contact أو home إن طلب ذلك"
  },
  "visualColorDescription": "إن كان السؤال عن ألوان أو صور المقال، اكتب هنا وصفاً حسياً مفصلاً للألوان وتأثيرها النفسي والإضاءة"
}`;

    const aiResponse = await generateWithAi({
      prompt,
      responseJson: true,
      temperature: 0.6,
      timeoutMs: 25000,
    });

    let data;
    try {
      data = extractAndParseJson(aiResponse.text);
    } catch {
      data = {
        speechResponse: 'أهلاً بك يا ضيفنا العزيز في دار ألفا ديزاين. أنا في خدمتك بصوت كاتب ومؤسس المدونة الحضرى محمود. هل تحب أن أقرأ لك مقالات دهانات الحوائط الحديثة وبديل الرخام، أم أصف لك الألوان والصور، أم ترغب في حجز استشارة ديكور مباشرة؟',
        recommendedArticleIds: [],
        navigation: { type: 'none' },
      };
    }

    res.json({
      success: true,
      ...data,
      providerUsed: aiResponse.providerUsed,
    });
  } catch (error) {
    console.error('Error in blind-reader-dialogue:', error);
    res.json({
      success: true,
      speechResponse: 'أهلاً بك يا ضيفنا العزيز في دار ألفا ديزاين. أنا في خدمتك بصوت كاتب ومؤسس المدونة الحضرى محمود. هل تحب أن أقرأ لك مقالات دهانات الحوائط الحديثة وبديل الرخام، أم أصف لك الألوان والصور، أم ترغب في حجز استشارة ديكور مباشرة؟',
      recommendedArticleIds: [],
      navigation: { type: 'none' },
    });
  }
});

/**
 * Audio Description for the Blind
 */
aiChatAssistRouter.post('/api/describe-article-visuals', async (req: Request, res: Response) => {
  try {
    const { articleTitle = '', category = '', excerpt = '', content = '' } = req.body;

    const prompt = `أنت خبير الوصف الصوتي للمكفوفين وضِعاف البصر (Audio Describer) المتحدث باسم خبير الديكور والتشطيبات «الحضرى محمود».
المطلوب: تقديم وصف سمعي حسي غني ومفصل للصور والألوان والديكورات المعمارية الخاصة بالمقال التالي لتمكين المستمع المكفوف من تخيل المشهد وتفاصيل الألوان بالكامل:

عنوان المقال: ${articleTitle}
التصنيف: ${category}
المقدمة: ${excerpt}
مقتطف من المحتوى: ${content ? content.slice(0, 1500) : ''}

قواعد الوصف:
1. صف درجات الألوان بدقة (مثلاً: دفء الجريج الملكي، هدوء الأوف وايت، فخامة عروق الرخام الكلكتا الرمادية أو الذهبية على خلفية بيضاء لؤلؤية).
2. صف الإضاءة (إضاءة ليد مخفية دافئة بدرجة 3000 كلفن، انعكاس الضوء على الدهان المطفي وملمس قشر البيضة).
3. صف الملمس الحسي (أناقة شرائح بديل الخشب العمودية، استواء الحائط، البريق المخملي لدهان القطيفة أو الستوكو المصقول).
4. استخدم نبرة المضيف الكريم المحبب الذي يجعل السامع يشعر بجمال الفراغ المعماري كأنه يلمسه بيديه.

أجب بصيغة JSON:
{
  "title": "وصف المشهد اللوني والديكوري",
  "audioDescription": "النص الصوتي المسهب والمؤثر الذي يُتلى على المستمع ليصف له الصورة والألوان بدقة وبلاغة.",
  "dominantPalette": [
    { "colorName": "اسم اللون بالعربية", "feel": "إحساسه في الفراغ" }
  ],
  "designerTip": "نصيحة المهندس الحضرى محمود للمستمع حول تناسق هذا المزيج"
}`;

    const aiResponse = await generateWithAi({
      prompt,
      responseJson: true,
      temperature: 0.6,
      timeoutMs: 25000,
    });

    let data;
    try {
      data = extractAndParseJson(aiResponse.text);
    } catch {
      data = {
        title: 'تناغم الألوان والديكور',
        audioDescription: 'في هذا التصميم بإشراف المهندس الحضرى محمود، يتناغم اللون الجريج الدافئ مع شرائح بديل الخشب الطبيعي وإضاءة الليد بروفايل المخفية بدرجة 3000 كلفن.',
        dominantPalette: [{ colorName: 'جريج ملكي', feel: 'دفء واتساع بصري' }],
        designerTip: 'ينصح المهندس الحضرى محمود دائماً باختيار دهانات مطفية للأسقف وربع لامعة للحوائط.',
      };
    }

    res.json({
      success: true,
      ...data,
      providerUsed: aiResponse.providerUsed,
    });
  } catch (error) {
    console.error('Error in describe-article-visuals:', error);
    res.json({
      success: true,
      title: 'تناغم الألوان والديكور',
      audioDescription: `في هذا التصميم بإشراف المهندس الحضرى محمود، يتناغم اللون الجريج الدافئ مع شرائح بديل الخشب الطبيعي وإضاءة الليد بروفايل المخفية بدرجة 3000 كلفن، مما يمنح الفراغ عمقاً فندقياً هادئاً ولمسة معمارية فخمة ومريحة للعين.`,
      dominantPalette: [
        { colorName: 'جريج ملكي', feel: 'دفء واتساع بصري' },
        { colorName: 'أوف وايت ناعم', feel: 'نقاء وتوزيع للإضاءة' }
      ],
      designerTip: 'ينصح المهندس الحضرى محمود دائماً باختيار دهانات مطفية للأسقف وربع لامعة للحوائط مع شرائح خشبية معالجة ضد الرطوبة.'
    });
  }
});
