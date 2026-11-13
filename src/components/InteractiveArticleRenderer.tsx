import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Info, X } from 'lucide-react';
import { findGlossaryMatch, GlossaryEntry } from '../utils/decorGlossary';

interface InteractiveWordTooltipProps {
  termText: string;
  isMark?: boolean;
  isBold?: boolean;
  customReason?: string;
  isAr?: boolean;
}

export const InteractiveWordTooltip: React.FC<InteractiveWordTooltipProps> = ({
  termText,
  isMark = false,
  isBold = false,
  customReason,
  isAr = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const entry: GlossaryEntry | undefined = findGlossaryMatch(termText);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const reason = customReason || (entry ? (isAr ? entry.reasonAr : entry.reasonEn) : (
    isAr
      ? 'تم تحديد هذا المصطلح لأهميته الهندسية والجمالية المباشرة في تحقيق التوازن وتفادي الأخطاء الشائعة أثناء التشطيب.'
      : 'Highlighted for its critical architectural and decorative impact on finishing quality.'
  ));

  const title = entry ? (isAr ? entry.titleAr : entry.titleEn) : termText;

  const categoryLabel = entry
    ? {
        materials: isAr ? 'خامات ديكور' : 'Decor Material',
        paints: isAr ? 'دهانات وتشطيب' : 'Wall Finish',
        lighting: isAr ? 'هندسة إضاءة' : 'Lighting',
        psychology: isAr ? 'سيكولوجية الفراغ' : 'Color Psychology',
        construction: isAr ? 'تأسيس وعزل' : 'Substrate Base',
      }[entry.category]
    : (isAr ? 'مصطلح معماري مهم' : 'Key Decor Term');

  return (
    <span
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span
        onClick={() => setIsOpen(!isOpen)}
        className={`cursor-pointer transition-all duration-150 inline-flex items-center gap-0.5 ${
          isMark
            ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 px-1.5 py-0.5 rounded-md font-bold border-b-2 border-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900 shadow-xs'
            : isBold
            ? 'font-bold text-slate-900 dark:text-white px-1 rounded border-b border-dashed border-blue-400/80 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30'
            : 'font-semibold text-emerald-800 dark:text-emerald-300 border-b border-dotted border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 px-0.5 rounded'
        }`}
        title={isAr ? 'اضغط أو مرر الماوس لمعرفة أسباب التحديد' : 'Hover to see architectural reasons'}
      >
        <span>{termText}</span>
        <Sparkles className="w-3 h-3 text-amber-500 shrink-0 inline-block opacity-75" />
      </span>

      {/* Floating Hover Tooltip Popover */}
      {isOpen && (
        <span
          className="absolute z-50 bottom-full mb-2 start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 w-64 sm:w-80 max-w-[calc(100vw-2rem)] p-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700/80 text-start text-xs animate-in fade-in zoom-in-95 duration-150 block"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          {/* Popover Header */}
          <span className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/80">
            <span className="flex items-center gap-1.5 font-bold text-amber-400 text-xs truncate">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{title}</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-700 shrink-0">
              {categoryLabel}
            </span>
          </span>

          {/* Reason Section */}
          <span className="block space-y-1">
            <span className="flex items-center gap-1 text-[11px] font-bold text-blue-300">
              <Info className="w-3 h-3 shrink-0" />
              <span>{isAr ? 'أسباب هذا التحديد المعماري:' : 'Selection Rationale:'}</span>
            </span>
            <span className="block text-[11px] leading-relaxed text-slate-200">
              {reason}
            </span>
          </span>

          {/* Popover Pointer Arrow */}
          <span className="absolute top-full start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
        </span>
      )}
    </span>
  );
};

/**
 * Parses inline string into rich text nodes (supporting **bold**, <mark>highlight</mark>, ==mark==, and glossary terms)
 */
export function parseInlineDecorText(text: string, isAr: boolean = true): React.ReactNode[] {
  if (!text) return [];

  // Regex tokenizing for:
  // 1. <mark>...</mark>
  // 2. ==...==
  // 3. **...**
  // 4. Specific known glossary terms (e.g. بديل الرخام، بديل الخشب، الجريج، الأوف وايت، 3000K، 4000K، سيلر مائي، معجون ناعم، ستوكو، القطيفة، بلاستيك مطفي، نصف لمعة، بانوهات الفوم، سيكولوجية الألوان، ليد بروفايل)
  const glossaryKeys = [
    'بديل الرخام',
    'بديل الخشب',
    'الجريج',
    'الأوف وايت',
    '3000K',
    '4000K',
    'سيلر مائي',
    'معجون ناعم',
    'ستوكو',
    'القطيفة',
    'بلاستيك مطفي',
    'نصف لمعة',
    'بانوهات الفوم',
    'سيكولوجية الألوان',
    'ليد بروفايل',
    'سيراميك باركيه',
    'عزل الرطوبة',
    'ورق حائط 3D',
    'الجبسوم بورد',
    'كود اللون',
  ];

  // Build unified regex
  const escapedGlossary = glossaryKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const tokenRegex = new RegExp(
    `(<mark>(.*?)<\\/mark>|==(.*?)==|\\*\\*(.*?)\\*\\*|\\b(${escapedGlossary})\\b)`,
    'gi'
  );

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      nodes.push(text.slice(lastIndex, matchIndex));
    }

    const fullMatch = match[0];

    if (fullMatch.startsWith('<mark>') && fullMatch.endsWith('</mark>')) {
      const content = match[2];
      nodes.push(
        <InteractiveWordTooltip
          key={`mark-${matchIndex}`}
          termText={content}
          isMark={true}
          isAr={isAr}
        />
      );
    } else if (fullMatch.startsWith('==') && fullMatch.endsWith('==')) {
      const content = match[3];
      nodes.push(
        <InteractiveWordTooltip
          key={`eqmark-${matchIndex}`}
          termText={content}
          isMark={true}
          isAr={isAr}
        />
      );
    } else if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
      const content = match[4];
      const hasGlossary = findGlossaryMatch(content);
      if (hasGlossary) {
        nodes.push(
          <InteractiveWordTooltip
            key={`bold-glossary-${matchIndex}`}
            termText={content}
            isBold={true}
            isAr={isAr}
          />
        );
      } else {
        nodes.push(
          <strong key={`bold-${matchIndex}`} className="font-bold text-slate-900 dark:text-white">
            {content}
          </strong>
        );
      }
    } else {
      // Direct glossary keyword match
      nodes.push(
        <InteractiveWordTooltip
          key={`glossary-${matchIndex}`}
          termText={fullMatch}
          isAr={isAr}
        />
      );
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}
