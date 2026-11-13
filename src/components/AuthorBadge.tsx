import React from 'react';
import { User, CheckCircle } from 'lucide-react';

interface AuthorBadgeProps {
  name: string;
  avatar?: string;
  role?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showRole?: boolean;
  showAuthorLabel?: boolean;
  prefix?: string;
  className?: string;
}

export const AuthorBadge: React.FC<AuthorBadgeProps> = ({
  name = 'الحضرى محمود',
  avatar,
  role,
  size = 'md',
  showRole = false,
  showAuthorLabel = false,
  prefix,
  className = '',
}) => {
  const safeName = typeof name === 'string' ? name : String(name ?? '');
  const safeRole = typeof role === 'string' ? role : role ? String(role) : undefined;

  // Sanitize name: completely strip any bot or auto-publish engine titles from reader-facing views
  const displayName = (!safeName || /محرك|نشر|بوت|bot|publisher|مصطفى/i.test(safeName))
    ? 'الحضرى محمود'
    : safeName;

  const displayRole = (safeRole && /محرك|نشر|بوت|bot|publisher/i.test(safeRole))
    ? 'صاحب الموقع ومؤسس المدونة'
    : safeRole;

  // Extract initials from name e.g. "الحضرى محمود" -> "ح م"
  const getInitials = (n: string) => {
    if (!n) return 'ح م';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]} ${parts[1][0]}`;
    }
    return n.slice(0, 2);
  };

  const sizeClasses = {
    sm: {
      box: 'w-6 h-6 text-[10px]',
      text: 'text-xs',
      check: 'w-2.5 h-2.5',
    },
    md: {
      box: 'w-9 h-9 text-xs',
      text: 'text-xs',
      check: 'w-3 h-3',
    },
    lg: {
      box: 'w-14 h-14 text-sm',
      text: 'text-sm',
      check: 'w-4 h-4',
    },
    xl: {
      box: 'w-20 h-20 text-lg',
      text: 'text-base',
      check: 'w-5 h-5',
    },
  }[size];

  const hasPhoto = Boolean(avatar && avatar.trim().length > 0);

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative shrink-0">
        {hasPhoto ? (
          <img
            src={avatar}
            alt={displayName}
            className={`${sizeClasses.box} rounded-2xl object-cover ring-2 ring-blue-500/20`}
          />
        ) : (
          /* Elegant Monogram Avatar without Photo */
          <div
            className={`${sizeClasses.box} rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-700 to-violet-800 text-white font-black flex items-center justify-center shadow-md ring-2 ring-blue-500/20 tracking-wider select-none`}
            title={displayName}
          >
            <span>{getInitials(displayName)}</span>
          </div>
        )}

        <span
          className={`absolute -bottom-1 -end-1 rounded-full bg-emerald-500 text-white border-2 border-white dark:border-slate-900 flex items-center justify-center`}
          title="صاحب الموقع المعتمد"
        >
          <CheckCircle className={sizeClasses.check} />
        </span>
      </div>

      {(displayName || displayRole) && (
        <div className="text-start leading-tight">
          {showAuthorLabel && (
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block">
              {prefix || 'كاتب المقال هو:'}
            </span>
          )}
          <span className={`font-bold text-slate-900 dark:text-white block ${sizeClasses.text}`}>
            {displayName}
          </span>
          {showRole && displayRole && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
              {displayRole}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
