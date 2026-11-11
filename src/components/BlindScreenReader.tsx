import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Sparkles,
  Palette,
  BookOpen,
  ArrowRight,
  CheckCircle,
  X,
  Eye,
  Send,
  Loader2,
  SkipForward,
  SkipBack,
  FastForward
} from 'lucide-react';
import { Article, SiteSettings, ActiveTab } from '../types/blog';

// Web Speech API interface definitions for TypeScript
interface IWindow extends Window {
  webkitSpeechRecognition?: any;
  SpeechRecognition?: any;
}

interface BlindScreenReaderProps {
  settings: SiteSettings;
  articles: Article[];
  currentArticle: Article | null;
  activeTab: ActiveTab;
  onSelectArticle: (article: Article) => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

interface DialogueMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  recommendedArticles?: Article[];
  palette?: { colorName: string; feel: string }[];
  isColorDesc?: boolean;
}

// Instant zero-latency pre-crafted sensory descriptions for core articles
const PRE_CRAFTED_VISUAL_DESCRIPTIONS: Record<string, { desc: string; palette: { colorName: string; feel: string }[]; tip: string }> = {
  'post-1': {
    desc: `في هذا التصميم بإشراف المهندس الحضرى محمود، يبرز لون الجريج الدافئ - وهو المزيج الملكي المتناسق بين البيج الدافئ والرمادي الهادئ - على الحوائط الرئيسية بمظهر مطفي مخملي يمتص التوهج. يجاوره عمود رأسي من شرائح بديل الخشب الطبيعي بلون البلوط الفاتح، وتتدفق خلفه إضاءة ليد مخفية دافئة بدرجة 3000 كلفن، مما يمنح صالة الاستقبال رحابة بصرية وفخامة فندقية استثنائية.`,
    palette: [
      { colorName: 'جريج ملكي (Greige)', feel: 'دفء واتساع فندقي' },
      { colorName: 'أوف وايت ناعم', feel: 'نقاء وتوزيع للإضاءة' },
      { colorName: 'خشب بلوط طبيعي', feel: 'لمسة طبيعية راقية' },
    ],
    tip: 'ينصح المهندس الحضرى محمود باستخدام الدهان المطفي للأسقف وربع اللامع للحوائط لسهولة التنظيف دون لمعان مزعج.',
  },
  'post-2': {
    desc: `في هذا المشهد المعماري الرائع لجدار التلفزيون، يتألق لوح بديل الرخام الإيطالي كلكتا أبيض ناصع تتخلله عروق رمادية ورمادية مذهبة تحاكي الرخام الطبيعي دون ثقل وزنه. على يمين ويسار اللوح تمتد شرائح بديل الخشب المضلعة بلون الجوز البني الداكن، مع هالة إضاءة ليد مخفية دافئة تجعل الجدار بأكمله يبدو وكأنه يطفو في الفراغ بفخامة معمارية مدهشة.`,
    palette: [
      { colorName: 'رخام كلكتا ناصع', feel: 'فخامة ملكية وبريق هادئ' },
      { colorName: 'بديل خشب جوزي', feel: 'عمق وتباين معماري متزن' },
      { colorName: 'إضاءة وورم 3000K', feel: 'هالة دفء ساحرة' },
    ],
    tip: 'استخدم دائماً سليكون عظم أصلي لتثبيت ألواح بديل الرخام لضمان ثبات يدوم عشرات السنين.',
  },
  'post-3': {
    desc: `في هذا العمل الديكوري المميز، يكتسي الحائط الرئيسي بلمسة دهان ستوكو أنتيكو الإيطالي المصقول بالمالج الستانلس ستيل، ليعطيك ملمساً ناعماً وبريقاً زجاجياً يشبه حجر المرمر الطبيعي. وفي الزوايا يتناغم دهان القطيفة والشمواه الذي تتغير ظلاله اللونية مع حركة الإضاءة وزاوية الرؤية، مما يمنح الفراغ دفئاً وثراءً بصرياً مبهراً.`,
    palette: [
      { colorName: 'ستوكو أنتيكو عاجي', feel: 'بريق رخامي ناعم الملمس' },
      { colorName: 'دهان قطيفة شامبين', feel: 'ملمس قماشي مخملي دافئ' },
    ],
    tip: 'الدهانات الديكورية تخصص لجدار واحد رئيسي فقط (Accent Wall) لتكون نقطة الجذب الأساسية في الغرفة.',
  },
  'post-4': {
    desc: `توضح تفاصيل هذا المقال مراحل التأسيس الهندسي السليم للحائط؛ حيث تم تنظيف وعزل الجزء السفلي بسيلر مائي بوليمري شفاف شديد المقاومة للمياه، يعقبه تأسيس معجون أسمنتي رمادي متبوع بمعجون أبيض تم صنفرته بالضوء الكاشف ليصبح أملس تماماً كالحرير، تمهيداً لطبقة الدهان البلاستيكي المقاوم للبكتيريا والفطريات.`,
    palette: [
      { colorName: 'سيلر عازل مائي', feel: 'حماية متينة ضد الرطوبة' },
      { colorName: 'معجون أبيض مصقول', feel: 'استواء تام كالحرير' },
    ],
    tip: 'علاج الرطوبة يبدأ دائماً من إصلاح مصدر المياه قبل وضع أي دهان جديد لضمان عدم عودتها نهائياً.',
  },
};

export const BlindScreenReader: React.FC<BlindScreenReaderProps> = ({
  settings,
  articles,
  currentArticle,
  activeTab,
  onSelectArticle,
  onNavigateTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [readingSpeed, setReadingSpeed] = useState<number>(1.0);
  const [currentReadingText, setCurrentReadingText] = useState<string>('');
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(-1);
  const [totalChunksCount, setTotalChunksCount] = useState<number>(0);
  const [dialogueHistory, setDialogueHistory] = useState<DialogueMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voiceRecSupported, setVoiceRecSupported] = useState(true);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Streaming Queue References
  const queueRef = useRef<string[]>([]);
  const queueIndexRef = useRef<number>(0);
  const isQueueActiveRef = useRef<boolean>(false);
  const speedRef = useRef<number>(1.0);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const ownerName = settings.authorName || 'الحضرى محمود';

  // Keep speedRef in sync
  useEffect(() => {
    speedRef.current = readingSpeed;
  }, [readingSpeed]);

  // Play fast Web Audio API sound cues (chimes) with zero network latency
  const playTone = useCallback((type: 'start' | 'stop' | 'chime' | 'navigate') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'start') {
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'stop') {
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'navigate') {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else {
        osc.frequency.setValueAtTime(587.33, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      }
    } catch {
      // AudioContext fallback
    }
  }, []);

  // Initialize Speech Synthesis & Voice Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        synthRef.current = window.speechSynthesis;
        const loadVoices = () => {
          try {
            const voices = window.speechSynthesis.getVoices();
            const arVoice = voices.find((v) => v.lang.startsWith('ar') || v.lang.includes('Arabic'));
            if (arVoice) {
              selectedVoiceRef.current = arVoice;
            }
          } catch {
            // voices error fallback
          }
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
      } else {
        setSpeechSupported(false);
      }

      const win = window as IWindow;
      const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = 'ar-SA';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsListening(true);
          playTone('start');
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results?.[0]?.[0]?.transcript;
          if (transcript) {
            handleProcessUserInput(transcript);
          }
        };

        recognitionRef.current = recognition;
      } else {
        setVoiceRecSupported(false);
      }
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [playTone]);

  // Global Keyboard Shortcuts (Alt + S / Alt + R) & Custom Event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && (e.key === 'r' || e.key === 'R' || e.key === 's' || e.key === 'S')) || (e.ctrlKey && e.altKey && e.key === 'a')) {
        e.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          if (next) {
            playTone('start');
          } else {
            stopSpeaking();
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleOpenEvent = () => {
      setIsOpen(true);
      playTone('start');
    };
    window.addEventListener('open-blind-screen-reader', handleOpenEvent);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-blind-screen-reader', handleOpenEvent);
    };
  }, [playTone]);

  // Welcome announcement on initial open
  useEffect(() => {
    if (isOpen && dialogueHistory.length === 0) {
      const welcomeText = `مرحباً بك يا ضيفنا العزيز في دار ألفا ديزاين. أنا قارئ الشاشة الذكي ومضيفك الصوتي المتحدث باسم المهندس «${ownerName}». أنا جاهز فوراً لقراءة المقالات، أو وصف روعة الألوان والديكورات بحس فني راقٍ، أو ترشيح أفضل الحلول لمنزلك. تحدث بأمرك الصوتي وسأجيبك في الحال!`;
      const welcome: DialogueMessage = {
        id: 'msg-welcome',
        sender: 'assistant',
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setDialogueHistory([welcome]);
      // Stream welcome text instantly in short chunks
      startStreamingSingleText(welcomeText);
    }
  }, [isOpen, ownerName]);

  // Auto scroll to latest dialogue message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [dialogueHistory]);

  // Stop Speech Synthesis immediately
  const stopSpeaking = () => {
    isQueueActiveRef.current = false;
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setActiveSentenceIndex(-1);
    queueRef.current = [];
    queueIndexRef.current = 0;
  };

  // Pause Speech
  const pauseSpeaking = () => {
    if (synthRef.current && isSpeaking) {
      synthRef.current.pause();
      setIsPaused(true);
    }
  };

  // Resume Speech
  const resumeSpeaking = () => {
    if (synthRef.current && isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
    }
  };

  // Execute playing the chunk currently pointed to by queueIndexRef
  const playCurrentQueueChunk = () => {
    if (!synthRef.current || !isQueueActiveRef.current) return;

    const index = queueIndexRef.current;
    const chunks = queueRef.current;

    if (index >= chunks.length) {
      // Completed full queue
      isQueueActiveRef.current = false;
      setIsSpeaking(false);
      setIsPaused(false);
      setActiveSentenceIndex(-1);
      return;
    }

    const chunkText = chunks[index];
    setCurrentReadingText(chunkText);
    setActiveSentenceIndex(index);

    const utterance = new SpeechSynthesisUtterance(chunkText);
    utterance.lang = 'ar-SA';
    utterance.rate = speedRef.current;
    utterance.pitch = 1.0;

    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      if (isQueueActiveRef.current) {
        queueIndexRef.current += 1;
        // Natural 40ms breathing pause between sentences
        setTimeout(() => {
          if (isQueueActiveRef.current) {
            playCurrentQueueChunk();
          }
        }, 40);
      }
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      if (isQueueActiveRef.current) {
        queueIndexRef.current += 1;
        playCurrentQueueChunk();
      }
    };

    synthRef.current.speak(utterance);
  };

  // Ultra-Fast Streaming Queue Launcher: Starts speaking in <50ms!
  const startStreamingChunks = (chunks: string[]) => {
    if (!synthRef.current || chunks.length === 0) return;

    // Cancel any ongoing speech immediately
    synthRef.current.cancel();

    queueRef.current = chunks;
    queueIndexRef.current = 0;
    isQueueActiveRef.current = true;
    setTotalChunksCount(chunks.length);
    setActiveSentenceIndex(0);
    setIsSpeaking(true);
    setIsPaused(false);

    // Speak the first chunk IMMEDIATELY (takes ~20ms!)
    playCurrentQueueChunk();
  };

  // Stream a single message or response by splitting into fast sentence chunks
  const startStreamingSingleText = (text: string) => {
    if (!text) return;
    const clean = text
      .replace(/#+\s/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/>\s/g, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .trim();

    const parts = clean
      .split(/(?<=[.،؛؟!\n])/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const chunks = parts.length > 0 ? parts : [clean];
    startStreamingChunks(chunks);
  };

  // Skip to next sentence in queue
  const handleSkipNext = () => {
    if (!isQueueActiveRef.current || queueIndexRef.current >= queueRef.current.length - 1) return;
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    queueIndexRef.current += 1;
    playTone('chime');
    playCurrentQueueChunk();
  };

  // Skip to previous sentence in queue
  const handleSkipPrev = () => {
    if (!isQueueActiveRef.current || queueIndexRef.current <= 0) return;
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    queueIndexRef.current -= 1;
    playTone('chime');
    playCurrentQueueChunk();
  };

  // Break a full article into fast, natural, zero-latency audio chunks (15-25 words each)
  const createArticleAudioChunks = (article: Article, mode: 'full' | 'summary' = 'full'): string[] => {
    const chunks: string[] = [];

    // Chunk 1: Instant opening greeting (starts playing in 20ms!)
    chunks.push(`أهلاً بك يا ضيفنا العزيز في دار ألفا ديزاين. نبدأ قراءة مقال: «${article.title}»، بقلم كاتب المقال وصاحب الموقع المهندس ${ownerName}.`);

    // Chunk 2: Excerpt overview
    if (article.excerpt) {
      chunks.push(`الملخص: ${article.excerpt}`);
    }

    if (mode === 'summary') {
      chunks.push(`هذا المقال يقع ضمن تصنيف ${article.category}، مع وقت قراءة تقديري ${article.readingTime} دقائق. استمع إلى كامل المقال متى شئت.`);
      return chunks;
    }

    // Full Mode: Clean and segment content into natural human phrases
    const cleanContent = (article.content || '')
      .replace(/!\[.*?\]\(.*?\)/g, '') // strip images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links to text
      .replace(/#+\s*(.*)/g, 'عنوان رئيسي: $1.') // headings
      .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
      .replace(/\*([^*]+)\*/g, '$1') // italics
      .replace(/>\s*(.*)/g, 'نصيحة هامة: $1.') // quotes
      .replace(/[-*]\s*/g, 'نقطة: ') // bullets
      .trim();

    const rawSentences = cleanContent
      .split(/(?<=[.،؛؟!\n])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 3);

    // Group sentences so each chunk is roughly 15-25 words for maximum TTS responsiveness
    let currentBlock = '';
    for (const sent of rawSentences) {
      const combined = currentBlock ? `${currentBlock} ${sent}` : sent;
      if (combined.split(/\s+/).length > 25) {
        if (currentBlock.trim()) {
          chunks.push(currentBlock.trim());
        }
        currentBlock = sent;
      } else {
        currentBlock = combined;
      }
    }
    if (currentBlock.trim()) {
      chunks.push(currentBlock.trim());
    }

    // Final closing chunk
    chunks.push(`تمت قراءة المقال بالكامل. يسعدنا دائماً في دار ألفا ديزاين تلقي استفساراتك وحجز استشارة تشطيب ومعاينة مع المهندس ${ownerName}.`);

    return chunks;
  };

  // Instant Read Article Handler: ZERO DELAY, starts speaking in <50ms!
  const handleReadCurrentArticle = (mode: 'full' | 'summary' = 'full', specificArticle?: Article) => {
    const target = specificArticle || currentArticle || articles[0];
    if (!target) return;

    playTone('chime');

    // If it's a specific article and not open, select it
    if (specificArticle && (!currentArticle || currentArticle.id !== specificArticle.id)) {
      onSelectArticle(specificArticle);
    }

    const chunks = createArticleAudioChunks(target, mode);

    const logMsg: DialogueMessage = {
      id: 'msg-' + Date.now(),
      sender: 'assistant',
      text: `🎙️ **بدء القراءة الفورية لمقال:** «${target.title}»\nبقلم كاتب المقال وصاحب الموقع المهندس ${ownerName}. جارٍ القراءة بالصوت المباشر الآن...`,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setDialogueHistory((prev) => [...prev, logMsg]);

    // Launch streaming chunks immediately!
    startStreamingChunks(chunks);
  };

  // Instant Sensory Color & Image Description (0ms local fallback, instant audio)
  const handleDescribeVisualsAndColors = async (articleParam?: Article) => {
    const target = articleParam || currentArticle || articles[0];
    if (!target) return;

    playTone('chime');

    // 1. Check if we have instant pre-crafted description for zero delay
    const preCrafted = PRE_CRAFTED_VISUAL_DESCRIPTIONS[target.id];
    if (preCrafted) {
      const logMsg: DialogueMessage = {
        id: 'msg-desc-' + Date.now(),
        sender: 'assistant',
        text: `🎨 **الوصف السمعي للألوان والديكور لمقال: «${target.title}»**\n\n${preCrafted.desc}\n\n💡 **نصيحة المهندس ${ownerName}:** ${preCrafted.tip}`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        palette: preCrafted.palette,
        isColorDesc: true,
      };
      setDialogueHistory((prev) => [...prev, logMsg]);

      // Speak immediately in chunks!
      const chunks = [
        `أهلاً بك يا ضيفنا العزيز. أصف لك الآن روعة الألوان وتوزيع الإضاءة في مقال: «${target.title}».`,
        preCrafted.desc,
        `نصيحة المهندس ${ownerName}: ${preCrafted.tip}`,
      ];
      startStreamingChunks(chunks);
      return;
    }

    // 2. For newly published or other articles: Start speaking introductory chunk immediately in 20ms while fetching
    const introChunk = `أهلاً بك يا ضيفنا العزيز في دار ألفا ديزاين. يسرني أن أصف لك الآن أدق تفاصيل الألوان وتناغم الإضاءة المعمارية في مقال: «${target.title}».`;
    startStreamingSingleText(introChunk);

    try {
      const res = await fetch('/api/describe-article-visuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleTitle: target.title,
          category: target.category,
          excerpt: target.excerpt,
          content: target.content,
        }),
      });

      const data = await res.json();
      const narrationText = data.audioDescription || `في هذا التصميم بإشراف المهندس ${ownerName}، تم تنسيق درجات الألوان الهادئة مع لمسات بديل الرخام وبديل الخشب وإضاءة الليد المخفية لإعطاء اتساع وراحة نفسية بالغة.`;

      const logMsg: DialogueMessage = {
        id: 'msg-desc-' + Date.now(),
        sender: 'assistant',
        text: `🎨 **الوصف السمعي للألوان والديكور:**\n\n${narrationText}\n\n💡 **نصيحة المهندس ${ownerName}:** ${data.designerTip || 'التناسق اللوني المدروس هو سر فخامة الفراغ المعماري.'}`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        palette: data.dominantPalette,
        isColorDesc: true,
      };

      setDialogueHistory((prev) => [...prev, logMsg]);
      startStreamingSingleText(narrationText);
    } catch {
      const fallback = `في هذا التصميم بإشراف المهندس ${ownerName}، يتناغم اللون الجريج الدافئ مع حوائط الأوف وايت الهادئة وألواح بديل الرخام الكلكتا الإيطالي، مما يمنح الفراغ عمقاً فندقياً راقياً.`;
      startStreamingSingleText(fallback);
    }
  };

  // Recommend articles instantly with zero latency
  const handleRecommendArticles = (topicKeyword?: string) => {
    playTone('chime');

    let filtered = articles;
    if (topicKeyword) {
      filtered = (Array.isArray(articles) ? articles : []).filter(
        (a) =>
          a &&
          ((a.title || '').includes(topicKeyword) ||
            (a.category || '').includes(topicKeyword) ||
            (Array.isArray(a.tags) && a.tags.some((t) => typeof t === 'string' && t.includes(topicKeyword))))
      );
    }
    const recommended = filtered.length > 0 ? filtered.slice(0, 3) : articles.slice(0, 3);
    const titlesList = recommended.map((r, idx) => `${idx + 1}. مقال «${r.title}»`).join('، و ');

    const speech = `يا ضيفنا العزيز، يسعدني أن أرشح لك أفضل مقالات المهندس ${ownerName} المتخصصة: ${titlesList}. يمكنك الضغط على أي مقال أو أن تطلب مني قراءته لك فوراً!`;

    const msg: DialogueMessage = {
      id: 'msg-rec-' + Date.now(),
      sender: 'assistant',
      text: speech,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      recommendedArticles: recommended,
    };

    setDialogueHistory((prev) => [...prev, msg]);
    startStreamingSingleText(speech);
  };

  // Find article by smart keywords in user speech (0ms local resolution)
  const findArticleByKeywords = (text: string): Article | null => {
    const lower = text.toLowerCase();
    // 1. Faux marble & wood slats
    if (lower.includes('رخام') || lower.includes('بديل رخام') || lower.includes('خشب') || lower.includes('بديل خشب') || lower.includes('تلفزيون') || lower.includes('شاشة')) {
      const match = articles.find((a) => a.id === 'post-2' || a.title.includes('رخام') || a.title.includes('خشب'));
      if (match) return match;
    }
    // 2. Wall paint color trends, Greige, Off-White
    if (lower.includes('دهان') || lower.includes('دهانات') || lower.includes('جريج') || lower.includes('أوف وايت') || lower.includes('اوف وايت') || lower.includes('ألوان') || lower.includes('الوان') || lower.includes('صيحات')) {
      const match = articles.find((a) => a.id === 'post-1' || a.title.includes('دهانات') || a.title.includes('جريج'));
      if (match) return match;
    }
    // 3. Stucco, velvet, decorative wall finishes
    if (lower.includes('ستوكو') || lower.includes('قطيفة') || lower.includes('شمواه') || lower.includes('ديكور') || lower.includes('ديكورية') || lower.includes('مجالس')) {
      const match = articles.find((a) => a.id === 'post-3' || a.title.includes('ستوكو') || a.title.includes('قطيفة'));
      if (match) return match;
    }
    // 4. Moisture treatment, wall priming, plaster
    if (lower.includes('رطوبة') || lower.includes('تقشير') || lower.includes('علاج') || lower.includes('معجون') || lower.includes('سيلر') || lower.includes('صنفرة')) {
      const match = articles.find((a) => a.id === 'post-4' || a.title.includes('رطوبة') || a.title.includes('تأسيس'));
      if (match) return match;
    }
    return null;
  };

  // Instant Local Command Matching & Zero-Latency Execution
  const handleProcessUserInput = async (input: string) => {
    if (!input || !input.trim()) return;

    const userText = input.trim();
    setInputText('');

    // Add user message to log
    const userMsg: DialogueMessage = {
      id: 'msg-user-' + Date.now(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };

    setDialogueHistory((prev) => [...prev, userMsg]);

    const lower = userText.toLowerCase();

    // 1. Instant Stop Command (0ms)
    if (/(وقف|اسكت|توقف|اصمت|بس|stop|pause|كفاية)/i.test(lower)) {
      stopSpeaking();
      playTone('stop');
      const ackMsg: DialogueMessage = {
        id: 'msg-ack-' + Date.now(),
        sender: 'assistant',
        text: 'تم إيقاف القراءة الصوتية يا ضيفنا العزيز. أنا جاهز لأي أمر أو استفسار آخر.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setDialogueHistory((prev) => [...prev, ackMsg]);
      startStreamingSingleText(ackMsg.text);
      return;
    }

    // 2. Instant Resume Command (0ms)
    if (/(كمل|استمر|تابع|واصل|resume|play)/i.test(lower)) {
      if (isPaused) {
        resumeSpeaking();
      } else if (isQueueActiveRef.current) {
        playCurrentQueueChunk();
      } else {
        handleReadCurrentArticle('full');
      }
      return;
    }

    // 3. Instant Read Command (0ms - zero waiting time!)
    if (/(اقرأ|اقرا|قراء|اسمع|استمع|شغل|قري|عايز اسمع|ابدا القراءة)/i.test(lower)) {
      // Check if user named a topic or specific article
      const matchedArticle = findArticleByKeywords(lower);
      handleReadCurrentArticle('full', matchedArticle || undefined);
      return;
    }

    // 4. Instant Color & Image Description (0ms)
    if (/(صف|وصف|الوان|ألوان|صورة|صور|شكل|لون|درجات)/i.test(lower)) {
      const matchedArticle = findArticleByKeywords(lower);
      handleDescribeVisualsAndColors(matchedArticle || undefined);
      return;
    }

    // 5. Instant Recommendations (0ms)
    if (/(رشح|اقترح|تنصح|أفضل|اقتراح|ترشيح)/i.test(lower)) {
      handleRecommendArticles();
      return;
    }

    // 6. Instant Navigation to Home (0ms)
    if (/(رئيسية|الرئيسية|الصفحة الاولى|البداية|هوم)/i.test(lower)) {
      playTone('navigate');
      onNavigateTab('home');
      const navMsg: DialogueMessage = {
        id: 'msg-nav-' + Date.now(),
        sender: 'assistant',
        text: `تم نقلك فوراً إلى الصفحة الرئيسية لمدونة ألفا ديزاين. تتصدر الصفحة أحدث أعمال واستشارات صاحب ومؤسس الموقع المهندس ${ownerName}.`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setDialogueHistory((prev) => [...prev, navMsg]);
      startStreamingSingleText(navMsg.text);
      return;
    }

    // 7. Instant Navigation to Articles (0ms)
    if (/(مقالات|كل المقالات|تصفح المقالات|المدونة)/i.test(lower)) {
      playTone('navigate');
      onNavigateTab('articles');
      const navMsg: DialogueMessage = {
        id: 'msg-nav-art-' + Date.now(),
        sender: 'assistant',
        text: `انتقلنا الآن إلى مكتبة مقالات الديكور والتشطيبات. تضم المكتبة ${articles.length} مقالات متخصصة في الدهانات الحديثة وبديل الرخام والخشب.`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setDialogueHistory((prev) => [...prev, navMsg]);
      startStreamingSingleText(navMsg.text);
      return;
    }

    // 8. Instant Navigation to Contact & Consultation with Owner (0ms)
    if (/(تواصل|اتصل|هاتف|تليفون|واتساب|معاينة|استشارة|حجز|صاحب الموقع)/i.test(lower)) {
      playTone('navigate');
      onNavigateTab('contact');
      const contactMsg: DialogueMessage = {
        id: 'msg-nav-contact-' + Date.now(),
        sender: 'assistant',
        text: `تم نقلك مباشرة إلى صفحة التواصل مع كاتب المقالات وصاحب الموقع المهندس «${ownerName}». يمكنك مراسلته عبر واتساب أو الاتصال به لحجز استشارة ومعاينة منزلك.`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setDialogueHistory((prev) => [...prev, contactMsg]);
      startStreamingSingleText(contactMsg.text);
      return;
    }

    // 9. If complex custom query: Immediately speak immediate acknowledgment (in 20ms!) while AI answers
    const immediateAck = `أهلاً بك يا ضيفنا العزيز. يسعدني الإجابة عليك بصوت المهندس ${ownerName}...`;
    startStreamingSingleText(immediateAck);
    setIsLoadingAi(true);

    try {
      const response = await fetch('/api/blind-reader-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userSpeech: userText,
          currentArticle,
          articles,
          history: dialogueHistory.map((m) => ({ role: m.sender, text: m.text })),
        }),
      });

      const data = await response.json();
      const replyText =
        data.speechResponse ||
        `أهلاً بك يا ضيفنا العزيز في دار ألفا ديزاين. يشرفنا دائماً تقديم المشورة المعمارية الأرقى لك مع المهندس ${ownerName}.`;

      let recommendedList: Article[] = [];
      if (data.recommendedArticleIds && Array.isArray(data.recommendedArticleIds)) {
        recommendedList = articles.filter((a) => data.recommendedArticleIds.includes(a.id));
      }

      if (data.navigation?.type === 'article' && data.navigation.targetId) {
        const found = articles.find((a) => a.id === data.navigation.targetId);
        if (found) {
          playTone('navigate');
          onSelectArticle(found);
        }
      } else if (data.navigation?.type === 'tab' && data.navigation.tabName) {
        playTone('navigate');
        onNavigateTab(data.navigation.tabName as ActiveTab);
      } else if (data.navigation?.type === 'read') {
        setTimeout(() => handleReadCurrentArticle('full'), 300);
      } else if (data.navigation?.type === 'describe') {
        setTimeout(() => handleDescribeVisualsAndColors(), 300);
      }

      const aiMsg: DialogueMessage = {
        id: 'msg-ai-' + Date.now(),
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        recommendedArticles: recommendedList.length > 0 ? recommendedList : undefined,
      };

      setDialogueHistory((prev) => [...prev, aiMsg]);
      startStreamingSingleText(replyText);
    } catch {
      const fallbackReply = `يا ضيفنا العزيز، بصفتي مضيفك في دار ألفا ديزاين المتحدث باسم المهندس «${ownerName}»، أسعد بخدمتك في اختيار أجمل دهانات الحوائط وبديل الرخام. يمكنك سؤالي أو طلبي بقراءة أي مقال فوراً!`;
      const fallbackMsg: DialogueMessage = {
        id: 'msg-fb-' + Date.now(),
        sender: 'assistant',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      };
      setDialogueHistory((prev) => [...prev, fallbackMsg]);
      startStreamingSingleText(fallbackReply);
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Toggle microphone
  const handleToggleListening = () => {
    if (!voiceRecSupported) {
      alert('التعرف الصوتي غير مدعوم في هذا المتصفح، يمكنك استخدام الأزرار السريعة أو الكتابة.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      playTone('stop');
    } else {
      stopSpeaking();
      try {
        if (recognitionRef.current) {
          recognitionRef.current.start();
        }
      } catch (e) {
        console.warn('Speech recognition start failed:', e);
      }
    }
  };

  // Open recommended article with instant voice reading
  const handleOpenRecommendedArticle = (article: Article) => {
    playTone('navigate');
    onSelectArticle(article);
    handleReadCurrentArticle('full', article);
  };

  return (
    <>
      {/* 
        Floating Launcher Button for the Blind Screen Reader:
        Strictly placed on the OPPOSITE side of the ChatBot (on the right of the screen):
        fixed bottom-6 right-6 z-40
      */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
          {/* Audio Pulsing Waves indicator when active/speaking */}
          {isSpeaking && (
            <div className="bg-amber-500 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg animate-pulse flex items-center gap-1.5 border border-amber-300">
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping"></span>
              <span>جارٍ القراءة الصوتية الفورية...</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(true);
              playTone('start');
            }}
            className="group relative p-4 rounded-3xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 text-slate-950 font-black shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 ring-4 ring-amber-400/40 border-2 border-amber-300/80 cursor-pointer"
            aria-label="افتح قارئ الشاشة للمكفوفين والمضيف الصوتي"
            title="قارئ الشاشة والمضيف الصوتي للمكفوفين (Alt + S)"
          >
            {/* Pulsing Accessibility Icon */}
            <div className="w-8 h-8 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-md group-hover:rotate-6 transition-transform">
              <Volume2 className="w-5 h-5 animate-pulse" />
            </div>

            <div className="text-start leading-tight pe-1">
              <span className="block text-xs font-black tracking-wide text-slate-950">
                قارئ الشاشة للمكفوفين
              </span>
              <span className="block text-[10px] font-bold text-slate-900/80">
                قراءة فورية وسريعة • {ownerName}
              </span>
            </div>

            {/* Glowing tactile badge */}
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 absolute -top-1 -start-1 ring-2 ring-white animate-ping"></span>
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 absolute -top-1 -start-1 ring-2 ring-white"></span>
          </button>
        </div>
      )}

      {/* Screen Reader Full Experience Drawer / Panel */}
      {isOpen && (
        <aside
          role="region"
          aria-label="قارئ الشاشة الذكي للمكفوفين والمضيف الصوتي لمدونة ألفا ديزاين"
          aria-live="polite"
          className="fixed bottom-0 sm:bottom-6 right-0 sm:right-6 z-50 w-full sm:w-[480px] h-[92vh] sm:h-[680px] max-h-[92vh] bg-slate-950 text-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-2 border-amber-500/50 flex flex-col overflow-hidden ring-8 ring-amber-500/20 backdrop-blur-xl animate-in slide-in-from-bottom duration-300"
        >
          {/* Header Bar with High Contrast & Voice Indicator */}
          <header className="p-4 sm:p-5 bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 flex items-center justify-between border-b-2 border-amber-400">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg border border-amber-300/40">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-sm sm:text-base tracking-wide text-slate-950">
                    قارئ الشاشة الفوري
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-slate-950 text-emerald-400 text-[10px] font-black uppercase">
                    ⚡ تحميل فوري 0ms
                  </span>
                </div>
                <p className="text-[11px] font-bold text-slate-900/90">
                  بصوت المضيف والمسوق لدار «{ownerName}»
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setIsOpen(false);
                  playTone('stop');
                }}
                className="p-2 rounded-2xl bg-slate-950 text-amber-400 hover:bg-slate-900 transition-colors cursor-pointer"
                aria-label="إغلاق قارئ الشاشة"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Audio Player Controller Bar */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Status & Audio Waveform animation */}
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isSpeaking
                    ? 'bg-emerald-400 animate-ping'
                    : isListening
                    ? 'bg-red-500 animate-bounce'
                    : 'bg-amber-400'
                }`}
              ></span>
              <span className="font-bold text-[11px] text-amber-300">
                {isSpeaking
                  ? isPaused
                    ? 'القراءة متوقفة مؤقتاً'
                    : `جارٍ القراءة (${activeSentenceIndex + 1} من ${totalChunksCount || 1})`
                  : isListening
                  ? 'جاري الاستماع لصوتك الآن...'
                  : 'المضيف الصوتي جاهز للأمر'}
              </span>
            </div>

            {/* Controls: Skip Prev / Play / Pause / Skip Next / Stop */}
            <div className="flex items-center gap-1.5">
              {isSpeaking && (
                <>
                  <button
                    type="button"
                    onClick={handleSkipPrev}
                    disabled={activeSentenceIndex <= 0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 cursor-pointer"
                    title="الجملة السابقة"
                  >
                    <SkipBack className="w-3.5 h-3.5" />
                  </button>

                  {isPaused ? (
                    <button
                      type="button"
                      onClick={resumeSpeaking}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer"
                      title="استئناف القراءة"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>متابعة</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseSpeaking}
                      className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
                      title="إيقاف مؤقت"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>وقف</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSkipNext}
                    disabled={activeSentenceIndex >= totalChunksCount - 1}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30 cursor-pointer"
                    title="الجملة التالية"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold flex items-center gap-1 cursor-pointer"
                    title="إنهاء القراءة"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>إنهاء</span>
                  </button>
                </>
              )}

              {/* Speed Controller */}
              <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                {[0.8, 1.0, 1.25].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => {
                      setReadingSpeed(speed);
                      playTone('chime');
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      readingSpeed === speed
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Access Sensory Actions (Voice Command Shortcuts) */}
          <div className="p-3 bg-slate-900/60 border-b border-slate-800/80 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleReadCurrentArticle('full')}
              className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>⚡ اقرأ المقال فوراً</span>
            </button>

            <button
              type="button"
              onClick={() => handleDescribeVisualsAndColors()}
              className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <Palette className="w-4 h-4 text-purple-400" />
              <span>🎨 صف الصور والألوان</span>
            </button>

            <button
              type="button"
              onClick={() => handleRecommendArticles()}
              className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>✨ ترشيح مقال مناسب</span>
            </button>
          </div>

          {/* Active Sentence Visual Highlighting Box */}
          {isSpeaking && currentReadingText && (
            <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <span className="p-1 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] shrink-0 mt-0.5">
                يُقرأ الآن
              </span>
              <p className="font-semibold leading-relaxed line-clamp-2">
                "{currentReadingText}"
              </p>
            </div>
          )}

          {/* Dialogue & Reading Log Stream */}
          <div
            ref={chatScrollRef}
            tabIndex={0}
            aria-label="سجل المحادثة والقراءة الصوتية"
            className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm font-sans"
          >
            {/* Current Active Article Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/60 border border-slate-800 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-amber-400 block">
                  المقال النشط أمامك الآن:
                </span>
                <h4 className="font-bold text-white text-xs truncate">
                  {currentArticle ? currentArticle.title : 'أنت في تصفح المقالات العامة'}
                </h4>
              </div>

              {currentArticle && (
                <button
                  type="button"
                  onClick={() => handleReadCurrentArticle('summary')}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] shrink-0 transition-colors"
                >
                  قراءة الملخص
                </button>
              )}
            </div>

            {/* Dialogue Messages */}
            {dialogueHistory.map((msg) => {
              const isAssistant = msg.sender === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-1.5 ${
                    isAssistant ? 'items-start' : 'items-end'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span>
                      {isAssistant
                        ? `المضيف والمسوق الصوتي (${ownerName})`
                        : 'أمرك الصوتي'}
                    </span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl leading-relaxed max-w-[92%] sm:max-w-[85%] ${
                      isAssistant
                        ? 'bg-slate-900 text-slate-100 border border-slate-800 shadow-md'
                        : 'bg-amber-500 text-slate-950 font-semibold shadow-md'
                    }`}
                  >
                    <p className="whitespace-pre-line text-xs sm:text-sm">
                      {msg.text}
                    </p>

                    {/* Dominant Palette tags if this was a color description */}
                    {msg.palette && msg.palette.length > 0 && (
                      <div className="pt-3 mt-3 border-t border-slate-800 space-y-1.5">
                        <span className="text-[11px] font-bold text-amber-400 block">
                          باليتة الألوان الموصوفة في الفراغ:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.palette.map((p, pIdx) => (
                            <span
                              key={pIdx}
                              className="px-2 py-0.5 rounded-md bg-slate-800 text-amber-300 text-[10px] border border-slate-700"
                            >
                              🎨 {p.colorName} ({p.feel})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Articles Cards */}
                    {msg.recommendedArticles && msg.recommendedArticles.length > 0 && (
                      <div className="pt-3 mt-3 border-t border-slate-800 space-y-2">
                        <span className="text-[11px] font-bold text-amber-400 block">
                          المقالات المرشحة خصيصاً لطلبك:
                        </span>
                        <div className="space-y-2">
                          {msg.recommendedArticles.map((rec) => (
                            <div
                              key={rec.id}
                              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 hover:border-amber-400/50 transition-colors"
                            >
                              <div className="min-w-0">
                                <h5 className="font-bold text-white text-xs line-clamp-1">
                                  {rec.title}
                                </h5>
                                <span className="text-[10px] text-slate-400">
                                  {rec.category} • {rec.readingTime} دقائق
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenRecommendedArticle(rec)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[10px] shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <span>⚡ اقرأ فوراً</span>
                                <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Speaker replay button */}
                    {isAssistant && (
                      <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => startStreamingSingleText(msg.text)}
                          className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>إعادة القراءة الفورية</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoadingAi && (
              <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-xl text-amber-300 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>المضيف الصوتي يحلل طلبك ويجهز لك الرد والتوصيات...</span>
              </div>
            )}
          </div>

          {/* Voice & Text Input Form Bar */}
          <footer className="p-3 sm:p-4 bg-slate-900 border-t-2 border-amber-500/40 space-y-2">
            {/* Big Mic Button with Pulsing Wave */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleListening}
                className={`p-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer flex-1 shadow-lg ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-4 ring-rose-500/40'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 ring-2 ring-amber-400/50'
                }`}
                aria-label={isListening ? 'إيقاف التسجيل الصوتي' : 'اضغط وتحدث بأمرك الصوتي للمضيف'}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-5 h-5 text-white animate-bounce" />
                    <span>جارٍ الاستماع... اضغط لإنهاء الأمر</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 text-slate-950" />
                    <span>تحدث بأمرك الصوتي (أو اضغط للميكروفون)</span>
                  </>
                )}
              </button>
            </div>

            {/* Text input fallback for keyboard users or non-mic environments */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessUserInput(inputText);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب سؤالك أو أمرك الصوتي هنا (مثال: اقرأ المقال، صف الألوان، رشح لي مقال)..."
                className="flex-1 bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoadingAi}
                className="p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold disabled:opacity-50 transition-colors cursor-pointer"
                title="إرسال"
              >
                <Send className="w-4 h-4 rtl:rotate-180" />
              </button>
            </form>

            {/* Accessibility Keyboard & Voice Help Tips */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span>⚡ قراءة فورية في 0ms • قل: «اقرأ المقال»، «صف الألوان»، «رشح مقال»</span>
              <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">Alt + S</span>
            </div>
          </footer>
        </aside>
      )}
    </>
  );
};
