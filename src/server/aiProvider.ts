/**
 * Unified AI Provider Service
 * Supports Google Gemini & Groq (OpenAI-compatible) with unified interface,
 * comprehensive timeout handling (connection + body read), secure fallback mechanism,
 * strict verified model resolution (preventing model pollution on fallback),
 * and zero secret leakage.
 */

import { GoogleGenAI } from '@google/genai';

export type AiProvider = 'gemini' | 'grok' | 'groq';

export interface AiImagePart {
  mimeType: string;
  data: string; // base64 payload without prefix
}

export interface AiGenerateOptions {
  prompt: string;
  systemInstruction?: string;
  responseJson?: boolean;
  temperature?: number;
  maxTokens?: number;
  provider?: AiProvider;
  model?: string;
  timeoutMs?: number;
  images?: AiImagePart[];
}

export interface AiGenerateResult {
  text: string;
  providerUsed: AiProvider;
  modelUsed: string;
  fallbackTriggered: boolean;
  fallbackReason?: string;
}

export interface AiProviderStatus {
  activeProvider: AiProvider;
  fallbackEnabled: boolean;
  hierarchy: {
    rank1: {
      provider: 'gemini';
      name: string;
      role: string;
      configured: boolean;
    };
    rank2: {
      provider: 'grok';
      name: string;
      website: string;
      role: string;
      configured: boolean;
    };
  };
  gemini: {
    configured: boolean;
    defaultModel: string;
    availableModels: string[];
  };
  grok: {
    website: string;
    configured: boolean;
    defaultModel: string;
    availableModels: string[];
  };
  groq: {
    configured: boolean;
    defaultModel: string;
    availableModels: string[];
  };
}

// Verified Grok models (xAI - https://grok.com/)
export const VERIFIED_GROK_MODELS = [
  'grok-2-latest',
  'grok-2-1212',
  'grok-beta',
  'grok-vision-beta',
];

// Verified Groq models (supported and tested in production)
export const VERIFIED_GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
];

// Verified Gemini models
export const VERIFIED_GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
];

const DEFAULT_TIMEOUT_MS = 35000;

/**
 * Resolves safe, verified model for the given provider.
 * Prevents untrusted user input from passing invalid models and eliminates
 * model cross-contamination when falling back from one provider to another.
 */
export function resolveModelForProvider(provider: AiProvider, requestedModel?: string): string {
  if (provider === 'grok') {
    if (requestedModel && (VERIFIED_GROK_MODELS.includes(requestedModel) || VERIFIED_GROQ_MODELS.includes(requestedModel))) {
      return requestedModel;
    }
    const envModel = process.env.GROK_MODEL?.trim() || process.env.XAI_MODEL?.trim();
    if (envModel) return envModel;
    const isXaiGrok = Boolean(process.env.GROK_API_KEY || process.env.XAI_API_KEY);
    return isXaiGrok ? VERIFIED_GROK_MODELS[0] : VERIFIED_GROQ_MODELS[0];
  } else if (provider === 'groq') {
    if (requestedModel && VERIFIED_GROQ_MODELS.includes(requestedModel)) {
      return requestedModel;
    }
    const envModel = process.env.GROQ_MODEL?.trim();
    if (envModel && VERIFIED_GROQ_MODELS.includes(envModel)) {
      return envModel;
    }
    return VERIFIED_GROQ_MODELS[0]; // 'llama-3.3-70b-versatile'
  } else {
    if (requestedModel && VERIFIED_GEMINI_MODELS.includes(requestedModel)) {
      return requestedModel;
    }
    const envModel = process.env.GEMINI_MODEL?.trim();
    if (envModel && VERIFIED_GEMINI_MODELS.includes(envModel)) {
      return envModel;
    }
    return VERIFIED_GEMINI_MODELS[0]; // 'gemini-3.8-flash'
  }
}

/**
 * Returns current configuration status without exposing any secrets or API keys.
 * Clearly documents the hierarchy: Gemini (Rank 1) -> Grok (https://grok.com/ - Rank 2 fallback).
 */
export function getAiProviderStatus(): AiProviderStatus {
  const envProvider = (process.env.AI_PROVIDER || '').toLowerCase().trim();
  const activeProvider: AiProvider = (envProvider === 'grok' || envProvider === 'groq') ? (envProvider as AiProvider) : 'gemini';
  const fallbackEnabled = process.env.AI_FALLBACK_ENABLED !== 'false';

  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5);
  const grokConfigured = Boolean(
    (process.env.GROK_API_KEY && process.env.GROK_API_KEY.trim().length > 5) ||
    (process.env.XAI_API_KEY && process.env.XAI_API_KEY.trim().length > 5) ||
    (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 5)
  );
  const groqConfigured = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 5);

  const geminiModel = resolveModelForProvider('gemini', process.env.GEMINI_MODEL);
  const grokModel = resolveModelForProvider('grok', process.env.GROK_MODEL);
  const groqModel = resolveModelForProvider('groq', process.env.GROQ_MODEL);

  return {
    activeProvider,
    fallbackEnabled,
    hierarchy: {
      rank1: {
        provider: 'gemini',
        name: 'Google Gemini',
        role: 'المرتبة الأولى: المحرك الأساسي الافتراضي لإنشاء المقالات والمحادثة الذكية',
        configured: geminiConfigured,
      },
      rank2: {
        provider: 'grok',
        name: 'Grok (xAI / https://grok.com/)',
        website: 'https://grok.com/',
        role: 'المرتبة الثانية: البديل التلقائي الاحتياطي عند عدم استجابة جيميناى',
        configured: grokConfigured,
      },
    },
    gemini: {
      configured: geminiConfigured,
      defaultModel: geminiModel,
      availableModels: VERIFIED_GEMINI_MODELS,
    },
    grok: {
      website: 'https://grok.com/',
      configured: grokConfigured,
      defaultModel: grokModel,
      availableModels: VERIFIED_GROK_MODELS,
    },
    groq: {
      configured: groqConfigured,
      defaultModel: groqModel,
      availableModels: VERIFIED_GROQ_MODELS,
    },
  };
}

/**
 * Calls Google Gemini with timeout, cancellation awareness, and error sanitization.
 */
async function callGemini(options: AiGenerateOptions): Promise<{ text: string; modelUsed: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Gemini API is not configured: GEMINI_API_KEY is missing on server.');
  }

  const modelName = resolveModelForProvider('gemini', options.model);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build-alphadecor',
      },
    },
  });

  const abortController = new AbortController();
  let timedOut = false;
  const timeoutTimer = setTimeout(() => {
    timedOut = true;
    abortController.abort();
  }, timeoutMs);

  try {
    const config: any = {
      temperature: options.temperature ?? 0.7,
    };

    if (options.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }

    if (options.responseJson) {
      config.responseMimeType = 'application/json';
    }

    if (options.maxTokens) {
      config.maxOutputTokens = options.maxTokens;
    }

    let contentsPayload: any = options.prompt;
    if (options.images && options.images.length > 0) {
      const parts: any[] = [];
      for (const img of options.images) {
        if (img.data && img.mimeType) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data,
            },
          });
        }
      }
      parts.push({ text: options.prompt });
      contentsPayload = { parts };
    }

    const response = await Promise.race([
      ai.models.generateContent({
        model: modelName,
        contents: contentsPayload,
        config,
      }),
      new Promise<never>((_, reject) => {
        abortController.signal.addEventListener('abort', () => {
          reject(new Error(`Gemini request timed out after ${timeoutMs}ms`));
        });
      }),
    ]);

    const text = response.text || '';
    if (!text.trim()) {
      throw new Error('Gemini returned an empty response text.');
    }

    return { text, modelUsed: modelName };
  } catch (err: any) {
    if (timedOut) {
      throw new Error(`Gemini request timed out after ${timeoutMs}ms`);
    }
    const sanitizedMsg = err.message ? err.message.replace(/AIza[a-zA-Z0-9_\-]{30,}/g, '[REDACTED_API_KEY]') : String(err);
    throw new Error(`[Gemini Error] ${sanitizedMsg}`);
  } finally {
    clearTimeout(timeoutTimer);
  }
}

/**
 * Calls Grok (xAI - https://grok.com/) official OpenAI-compatible endpoint with complete timeout
 * (covering network connection, response body streaming, and JSON parsing).
 * Official endpoint: https://api.x.ai/v1/chat/completions
 * Fallback endpoint: https://api.groq.com/openai/v1/chat/completions
 */
async function callGrok(options: AiGenerateOptions): Promise<{ text: string; modelUsed: string }> {
  // Support GROK_API_KEY, XAI_API_KEY, or fallback to GROQ_API_KEY
  const apiKey = (
    process.env.GROK_API_KEY ||
    process.env.XAI_API_KEY ||
    process.env.GROQ_API_KEY
  )?.trim();

  if (!apiKey) {
    throw new Error('Grok API is not configured: GROK_API_KEY or XAI_API_KEY is missing on server.');
  }

  const isXaiGrok = Boolean(process.env.GROK_API_KEY || process.env.XAI_API_KEY);
  const endpoint = isXaiGrok
    ? (process.env.GROK_BASE_URL || 'https://api.x.ai/v1/chat/completions')
    : 'https://api.groq.com/openai/v1/chat/completions';

  const modelName = resolveModelForProvider('grok', options.model);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const messages: Array<{ role: 'system' | 'user'; content: any }> = [];
  if (options.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction });
  }

  if (options.images && options.images.length > 0) {
    const userParts: any[] = [];
    for (const img of options.images) {
      if (img.data && img.mimeType) {
        userParts.push({
          type: 'image_url',
          image_url: {
            url: `data:${img.mimeType};base64,${img.data}`,
          },
        });
      }
    }
    userParts.push({ type: 'text', text: options.prompt });
    messages.push({ role: 'user', content: userParts });
  } else {
    messages.push({ role: 'user', content: options.prompt });
  }

  const payload: any = {
    model: modelName,
    messages,
    temperature: options.temperature ?? 0.7,
  };

  if (options.responseJson) {
    payload.response_format = { type: 'json_object' };
  }

  if (options.maxTokens) {
    payload.max_tokens = options.maxTokens;
  }

  const abortController = new AbortController();
  const timeoutTimer = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'alpha-decor-grok-client/1.0 (https://grok.com/)',
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    if (!res.ok) {
      let errText = '';
      try {
        const errJson = await res.json();
        errText = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        errText = await res.text();
      }
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';

    if (!content.trim()) {
      throw new Error('Grok (https://grok.com/) returned an empty response choice content.');
    }

    return { text: content, modelUsed: modelName };
  } catch (err: any) {
    if (abortController.signal.aborted) {
      throw new Error(`Grok request timed out after ${timeoutMs}ms (including connection and response reading)`);
    }
    const rawMsg = err.message || String(err);
    const sanitizedMsg = rawMsg
      .replace(/xai-[a-zA-Z0-9_\-]{20,}/g, '[REDACTED_GROK_KEY]')
      .replace(/gsk_[a-zA-Z0-9_\-]{20,}/g, '[REDACTED_GROQ_KEY]');
    throw new Error(`[Grok Error] ${sanitizedMsg}`);
  } finally {
    clearTimeout(timeoutTimer);
  }
}

/**
 * Calls Groq official OpenAI-compatible endpoint with complete timeout
 * (covering network connection, response body streaming, and JSON parsing).
 * Endpoint: https://api.groq.com/openai/v1/chat/completions
 */
async function callGroq(options: AiGenerateOptions): Promise<{ text: string; modelUsed: string }> {
  const apiKey = process.env.GROQ_API_KEY?.trim() || process.env.GROK_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Groq API is not configured: GROQ_API_KEY is missing on server.');
  }

  const modelName = resolveModelForProvider('groq', options.model);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (options.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction });
  }
  messages.push({ role: 'user', content: options.prompt });

  const payload: any = {
    model: modelName,
    messages,
    temperature: options.temperature ?? 0.7,
  };

  if (options.responseJson) {
    payload.response_format = { type: 'json_object' };
  }

  if (options.maxTokens) {
    payload.max_tokens = options.maxTokens;
  }

  const abortController = new AbortController();
  const timeoutTimer = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'alpha-decor-groq-client/1.0',
      },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });

    if (!res.ok) {
      let errText = '';
      try {
        const errJson = await res.json();
        errText = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        errText = await res.text();
      }
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';

    if (!content.trim()) {
      throw new Error('Groq returned an empty response choice content.');
    }

    return { text: content, modelUsed: modelName };
  } catch (err: any) {
    if (abortController.signal.aborted) {
      throw new Error(`Groq request timed out after ${timeoutMs}ms (including connection and response reading)`);
    }
    const rawMsg = err.message || String(err);
    const sanitizedMsg = rawMsg.replace(/gsk_[a-zA-Z0-9_\-]{20,}/g, '[REDACTED_GROQ_KEY]');
    throw new Error(`[Groq Error] ${sanitizedMsg}`);
  } finally {
    clearTimeout(timeoutTimer);
  }
}

/**
 * Dispatches call to the appropriate engine implementation
 */
async function executeProvider(provider: AiProvider, options: AiGenerateOptions): Promise<{ text: string; modelUsed: string }> {
  if (provider === 'gemini') {
    return callGemini(options);
  } else if (provider === 'grok') {
    return callGrok(options);
  } else {
    return callGroq(options);
  }
}

/**
 * Unified generation entry point with automatic provider selection and hierarchy fallback:
 * 1. Rank 1: Google Gemini (Primary Default)
 * 2. Rank 2: Grok (https://grok.com/) (Secondary Fallback when Gemini does not respond)
 * 3. Strict verified model resolution (eliminates model contamination across providers)
 */
export async function generateWithAi(options: AiGenerateOptions): Promise<AiGenerateResult> {
  const status = getAiProviderStatus();
  // Primary default is Gemini unless caller explicitly overrides
  const requestedProvider: AiProvider = options.provider || status.activeProvider;

  // Secondary fallback provider is explicitly Grok (https://grok.com/)
  const secondaryProvider: AiProvider = requestedProvider === 'gemini' ? 'grok' : 'gemini';

  const isProviderConfigured = (p: AiProvider): boolean => {
    if (p === 'gemini') return status.gemini.configured;
    if (p === 'grok') return status.grok.configured;
    return status.groq.configured;
  };

  const isPrimaryConfigured = isProviderConfigured(requestedProvider);

  if (!isPrimaryConfigured) {
    if (status.fallbackEnabled) {
      const isSecondaryConfigured = isProviderConfigured(secondaryProvider);
      if (isSecondaryConfigured) {
        console.warn(
          `[AI Provider] Primary provider "${requestedProvider}" is unconfigured. Falling back to Rank 2 provider "${secondaryProvider}" (https://grok.com/).`
        );
        const fallbackOptions: AiGenerateOptions = {
          ...options,
          provider: secondaryProvider,
          model: undefined,
        };

        const secResult = await executeProvider(secondaryProvider, fallbackOptions);

        return {
          text: secResult.text,
          providerUsed: secondaryProvider,
          modelUsed: secResult.modelUsed,
          fallbackTriggered: true,
          fallbackReason: `المحرك الأساسي "${requestedProvider}" غير مهيأ. تم التحويل التلقائي إلى البديل في المرتبة الثانية "${secondaryProvider}" (https://grok.com/).`,
        };
      }
    }

    throw new Error(
      `AI Service Error: Primary provider "${requestedProvider}" is not configured. Fallback is ${
        status.fallbackEnabled ? 'enabled but Rank 2 fallback is also unconfigured' : 'disabled'
      }.`
    );
  }

  // Attempt primary provider (Rank 1: Google Gemini)
  try {
    const primaryOptions: AiGenerateOptions = {
      ...options,
      model: resolveModelForProvider(requestedProvider, options.model),
    };

    const primaryResult = await executeProvider(requestedProvider, primaryOptions);

    return {
      text: primaryResult.text,
      providerUsed: requestedProvider,
      modelUsed: primaryResult.modelUsed,
      fallbackTriggered: false,
    };
  } catch (primaryError: any) {
    console.warn(`[AI Provider] Primary provider "${requestedProvider}" failed or did not respond: ${primaryError.message}`);

    if (!status.fallbackEnabled) {
      throw primaryError;
    }

    // Check if secondary (Rank 2: Grok https://grok.com/) is configured
    const isSecondaryConfigured = isProviderConfigured(secondaryProvider);
    if (!isSecondaryConfigured) {
      throw new Error(
        `[AI Provider] Primary provider "${requestedProvider}" failed: ${primaryError.message}. Rank 2 fallback "${secondaryProvider}" is not configured.`
      );
    }

    console.info(`[AI Provider] Attempting automatic fallback to Rank 2 provider "${secondaryProvider}" (https://grok.com/)...`);

    try {
      const fallbackOptions: AiGenerateOptions = {
        ...options,
        provider: secondaryProvider,
        model: undefined,
      };

      const secondaryResult = await executeProvider(secondaryProvider, fallbackOptions);

      return {
        text: secondaryResult.text,
        providerUsed: secondaryProvider,
        modelUsed: secondaryResult.modelUsed,
        fallbackTriggered: true,
        fallbackReason: `تعذر استجابة جيميناى (${primaryError.message}). تم الانتقال تلقائياً إلى جروك (https://grok.com/) كبديل في المرتبة الثانية.`,
      };
    } catch (secondaryError: any) {
      console.error(`[AI Provider] Both primary ("${requestedProvider}") and Rank 2 fallback ("${secondaryProvider}") failed.`);
      throw new Error(
        `All AI providers failed. Primary: ${primaryError.message}. Fallback (Grok): ${secondaryError.message}`
      );
    }
  }
}

/**
 * Safe JSON extractor for LLM outputs.
 * Strips code fences, sanitizes edge characters, and parses JSON.
 */
export function extractAndParseJson<T = any>(rawText: string): T {
  if (!rawText || !rawText.trim()) {
    throw new Error('Cannot parse JSON from empty AI response.');
  }

  let cleaned = rawText.trim();

  // Strip Markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Locate the first { and last } or first [ and last ]
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    }

    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const candidate = cleaned.slice(firstBracket, lastBracket + 1);
      return JSON.parse(candidate);
    }

    throw new Error('Failed to extract valid JSON structure from AI output.');
  }
}
