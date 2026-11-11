import React, { useEffect } from 'react';
import { Article, SiteSettings } from '../types/blog';

interface SeoStructuredDataProps {
  settings: SiteSettings;
  article?: Article | null;
}

export const SeoStructuredData: React.FC<SeoStructuredDataProps> = ({
  settings,
  article,
}) => {
  useEffect(() => {
    // 1. Organization & WebSite Schema (Single permanent instance)
    const orgScriptId = 'alpha-decor-org-schema';
    let orgScript = document.getElementById(orgScriptId) as HTMLScriptElement | null;
    if (!orgScript) {
      orgScript = document.createElement('script');
      orgScript.id = orgScriptId;
      orgScript.type = 'application/ld+json';
      document.head.appendChild(orgScript);
    }

    const orgData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${window.location.origin}/#organization`,
          name: settings.blogName || 'ألفا للديكور والدهانات',
          alternateName: settings.blogNameEn || 'Alpha Decor & Paints',
          url: window.location.origin,
          logo: `${window.location.origin}/assets/logo.png`,
          description: settings.tagline || 'مدونة متخصصة في أحدث صيحات دهانات الحوائط والديكورات المعمارية وتشطيبات المنازل الفاخرة.',
          founder: {
            '@type': 'Person',
            name: settings.authorName || 'الحضرى محمود',
            jobTitle: 'استشاري الديكور والتشطيبات المعمارية',
          },
          sameAs: [
            settings.socialLinks?.facebook,
            settings.socialLinks?.twitter,
            settings.socialLinks?.instagram,
            settings.socialLinks?.telegram,
          ].filter(Boolean),
        },
        {
          '@type': 'WebSite',
          '@id': `${window.location.origin}/#website`,
          url: window.location.origin,
          name: settings.blogName || 'ألفا للديكور والدهانات',
          publisher: {
            '@id': `${window.location.origin}/#organization`,
          },
          inLanguage: settings.language === 'ar' ? 'ar' : 'en',
        },
      ],
    };

    // Safe injection preventing XSS
    orgScript.textContent = JSON.stringify(orgData).replace(/</g, '\\u003c');

    // 2. Dynamic Article / BlogPosting Schema (Updated per article, cleaned on unmount)
    const articleScriptId = 'alpha-decor-article-schema';
    const existingArticleScript = document.getElementById(articleScriptId);

    if (article) {
      let articleScript = existingArticleScript as HTMLScriptElement | null;
      if (!articleScript) {
        articleScript = document.createElement('script');
        articleScript.id = articleScriptId;
        articleScript.type = 'application/ld+json';
        document.head.appendChild(articleScript);
      }

      const canonicalUrl = `${window.location.origin}/#${encodeURIComponent(article.slug)}`;
      const articleData = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        '@id': canonicalUrl,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
        headline: article.title,
        description: article.excerpt || article.title,
        image: article.featuredImage ? [article.featuredImage] : [],
        datePublished: article.publishedAt || new Date().toISOString(),
        dateModified: (article as any).updatedAt || article.publishedAt || new Date().toISOString(),
        author: {
          '@type': 'Person',
          name: article.author?.name || settings.authorName || 'الحضرى محمود',
          jobTitle: article.author?.role || 'استشاري الديكور والدهانات',
        },
        publisher: {
          '@type': 'Organization',
          name: settings.blogName || 'ألفا للديكور والدهانات',
          logo: {
            '@type': 'ImageObject',
            url: `${window.location.origin}/assets/logo.png`,
          },
        },
        articleSection: article.category,
        keywords: Array.isArray(article.tags) ? article.tags.join(', ') : '',
        wordCount: (article as any).wordsCount || article.content?.split(/\s+/).length || 500,
        inLanguage: 'ar',
      };

      articleScript.textContent = JSON.stringify(articleData).replace(/</g, '\\u003c');
    } else {
      // Remove article schema when navigating away from article
      if (existingArticleScript) {
        existingArticleScript.remove();
      }
    }

    return () => {
      // Cleanup article script on component unmount to prevent stale schemas
      const scriptToRemove = document.getElementById(articleScriptId);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [settings, article]);

  return null;
};
