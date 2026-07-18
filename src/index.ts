interface AddonParams {
  targetLang: string;
  mode: 'auto' | 'command';
  prefix: string;
  autoUsers: string[];
  ignoreChatCommands: boolean;
  translateSystemMessages: boolean;
  useLlmDetectNeed: boolean;
  useLlmTranslate: boolean;
  template: string;
}

type CacheMap = Record<string, string>;

/** Storage key for cached 7TV emote word list (not cleared by translation cache reset). */
const CACHE_KEY_7TV = '_7tv_words';

/** Prefix for LLM detect-need cache entries: `llm-detect:{target}:{detected}:{text}`. */
const CACHE_PREFIX_LLM_DETECT = 'llm-detect:';

/** Prefix for translation cache entries: `tr:{target}:{text}`. */
const CACHE_PREFIX_TRANSLATE = 'tr:';

const GOOGLE_TRANSLATE_URL =
  'https://translate.googleapis.com/translate_a/single';

/**
 * English-only LLM prompt template for deciding whether a chat message
 * still needs translation after the built-in language detector.
 * Placeholders: {SELECTED_LANGUAGE}, {DETECTED_LANGUAGE}, {MESSAGE_TEXT}, {MESSAGE_EMOTE_LIST}.
 * Expected model reply: exactly `yes` or `no` (nothing else).
 * @example
 * fillLlmPrompt(LLM_DETECT_NEED_PROMPT, {
 *   SELECTED_LANGUAGE: 'English',
 *   DETECTED_LANGUAGE: 'Russian',
 *   MESSAGE_TEXT: 'привет',
 *   MESSAGE_EMOTE_LIST: 'Kappa, LUL',
 * });
 */
const LLM_DETECT_NEED_PROMPT = `You decide whether a chat message still needs translation.

## Context
- Chat primary language (target): {SELECTED_LANGUAGE}
- Automatic detector language: {DETECTED_LANGUAGE}
- Emote words (ignore for language; they are chat images, not real text): {MESSAGE_EMOTE_LIST}

## Source message
{MESSAGE_TEXT}

## Rules
1. Answer whether the message should be translated into {SELECTED_LANGUAGE}.
2. Say yes if meaningful words are clearly in another language and a viewer who only reads {SELECTED_LANGUAGE} would need a translation.
3. Say no if the message is already understandable in {SELECTED_LANGUAGE}, is mostly emotes/names/noise, or does not need translation after ignoring emote words.
4. Do not translate the message. Do not explain.
5. Output MUST be exactly one word (no quotes, no markdown, no extra text):
yes
or
no`;

/**
 * English-only LLM prompt template for translating a chat message.
 * Placeholders: {SELECTED_LANGUAGE}, {DETECTED_LANGUAGE}, {MESSAGE_TEXT}, {MESSAGE_EMOTE_LIST}.
 * Expected model reply: exactly one line starting with TRANSLATE_SUCCESS| then the full translation.
 * @example
 * fillLlmPrompt(LLM_TRANSLATE_PROMPT, {
 *   SELECTED_LANGUAGE: 'English',
 *   DETECTED_LANGUAGE: 'Russian',
 *   MESSAGE_TEXT: 'привет',
 *   MESSAGE_EMOTE_LIST: 'Kappa',
 * });
 */
const LLM_TRANSLATE_PROMPT = `You are a chat-message translator.

## Context
- Target language: {SELECTED_LANGUAGE}
- Detected source language: {DETECTED_LANGUAGE}
- Emote words (keep unchanged, do not translate): {MESSAGE_EMOTE_LIST}

## Source message
{MESSAGE_TEXT}

## Rules
1. Translate the ENTIRE source message into {SELECTED_LANGUAGE} from the first word to the last. Do not stop early. Do not summarize. Do not omit any sentence or clause.
2. Keep every emote word from the list above exactly as written (same spelling and casing).
3. Keep the original meaning, tone, and question/exclamation marks.
4. Output MUST be exactly one line in this format (no quotes, no markdown, no extra text before or after):
TRANSLATE_SUCCESS|<full translation here>
5. Replace <full translation here> with the complete translated message only.`;

const LANGUAGE_OPTIONS = [
  { value: 'en', label: { en: 'English', ru: 'Английский', uk: 'Англійська' } },
  { value: 'ru', label: { en: 'Russian', ru: 'Русский', uk: 'Російська' } },
  {
    value: 'uk',
    label: { en: 'Ukrainian', ru: 'Украинский', uk: 'Українська' },
  },
  { value: 'de', label: { en: 'German', ru: 'Немецкий', uk: 'Німецька' } },
  { value: 'fr', label: { en: 'French', ru: 'Французский', uk: 'Французька' } },
  { value: 'es', label: { en: 'Spanish', ru: 'Испанский', uk: 'Іспанська' } },
  {
    value: 'pt',
    label: { en: 'Portuguese', ru: 'Португальский', uk: 'Португальська' },
  },
  {
    value: 'it',
    label: { en: 'Italian', ru: 'Итальянский', uk: 'Італійська' },
  },
  { value: 'pl', label: { en: 'Polish', ru: 'Польский', uk: 'Польська' } },
  {
    value: 'nl',
    label: { en: 'Dutch', ru: 'Нидерландский', uk: 'Нідерландська' },
  },
  { value: 'ja', label: { en: 'Japanese', ru: 'Японский', uk: 'Японська' } },
  { value: 'ko', label: { en: 'Korean', ru: 'Корейский', uk: 'Корейська' } },
  {
    value: 'zh-CN',
    label: {
      en: 'Chinese (Simplified)',
      ru: 'Китайский (упрощенный)',
      uk: 'Китайська (спрощена)',
    },
  },
  { value: 'ar', label: { en: 'Arabic', ru: 'Арабский', uk: 'Арабська' } },
  { value: 'tr', label: { en: 'Turkish', ru: 'Турецкий', uk: 'Турецька' } },
  { value: 'sv', label: { en: 'Swedish', ru: 'Шведский', uk: 'Шведська' } },
  { value: 'da', label: { en: 'Danish', ru: 'Датский', uk: 'Датська' } },
  { value: 'fi', label: { en: 'Finnish', ru: 'Финский', uk: 'Фінська' } },
  { value: 'cs', label: { en: 'Czech', ru: 'Чешский', uk: 'Чеська' } },
  { value: 'ro', label: { en: 'Romanian', ru: 'Румынский', uk: 'Румунська' } },
  { value: 'el', label: { en: 'Greek', ru: 'Греческий', uk: 'Грецька' } },
  { value: 'hi', label: { en: 'Hindi', ru: 'Хинди', uk: 'Гінді' } },
  { value: 'th', label: { en: 'Thai', ru: 'Тайский', uk: 'Тайська' } },
  {
    value: 'vi',
    label: { en: 'Vietnamese', ru: 'Вьетнамский', uk: "В'єтнамська" },
  },
  {
    value: 'id',
    label: { en: 'Indonesian', ru: 'Индонезийский', uk: 'Індонезійська' },
  },
];

const defaultLang = (['en', 'ru', 'uk'] as const).includes(
  LANG.current as 'en' | 'ru' | 'uk'
)
  ? LANG.current
  : 'en';

const defaultTemplate =
  LANG.current === 'ru'
    ? 'Перевод сообщения {name}: {message}'
    : LANG.current === 'uk'
      ? 'Переклад повідомлення {name}: {message}'
      : 'Translation of {name}: {message}';

GenerateConfig([
  {
    key: '_disclaimer',
    type: 'info',
    editor: {
      description: {
        en: 'Translation is powered by Google Translate by default (optional LLM). Translations may not be accurate.',
        ru: 'По умолчанию перевод выполняется через Google Translate (опционально LLM). Перевод может быть неточным.',
        uk: 'За замовчуванням переклад виконується через Google Translate (опційно LLM). Переклад може бути неточним.',
      },
      infoBorder: 'yellow',
    },
  },
  {
    key: 'targetLang',
    type: 'select',
    default: defaultLang,
    options: LANGUAGE_OPTIONS,
    editor: {
      label: {
        en: 'Target language',
        ru: 'Язык перевода',
        uk: 'Мова перекладу',
      },
      description: {
        en: 'Messages will be translated into this language',
        ru: 'Сообщения будут переводиться на этот язык',
        uk: 'Повідомлення будуть перекладатися цією мовою',
      },
    },
  },
  {
    key: 'mode',
    type: 'select',
    default: 'command',
    options: [
      {
        value: 'auto',
        label: { en: 'Automatic', ru: 'Автоматический', uk: 'Автоматичний' },
      },
      {
        value: 'command',
        label: { en: 'By command', ru: 'По команде', uk: 'За командою' },
      },
    ],
    editor: {
      label: { en: 'Mode', ru: 'Режим работы', uk: 'Режим роботи' },
      description: {
        en: 'Automatic: translate every message. By command: only with prefix',
        ru: 'Автоматический: переводить каждое сообщение. По команде: только с префиксом',
        uk: 'Автоматичний: перекладати кожне повідомлення. За командою: лише з префіксом',
      },
    },
  },
  {
    key: 'prefix',
    type: 'text',
    default: '!translate ',
    editor: {
      label: {
        en: 'Command prefix',
        ru: 'Префикс команды',
        uk: 'Префікс команди',
      },
      description: {
        en: 'Messages starting with this prefix will be translated (command mode)',
        ru: 'Сообщения, начинающиеся с этого префикса, будут переведены (режим по команде)',
        uk: 'Повідомлення, що починаються з цього префікса, будуть перекладені (режим за командою)',
      },
    },
  },
  {
    key: 'autoUsers',
    type: 'array',
    items: 'text',
    default: [],
    editor: {
      label: {
        en: 'Auto-translate users',
        ru: 'Пользователи для автоперевода',
        uk: 'Користувачі для автоперекладу',
      },
      description: {
        en: 'In command mode, messages from these usernames are auto-translated without the prefix',
        ru: 'В режиме по команде, сообщения от этих пользователей переводятся без префикса',
        uk: 'У режимі за командою, повідомлення від цих користувачів перекладаються без префікса',
      },
    },
  },
  {
    key: 'ignoreChatCommands',
    type: 'boolean',
    default: true,
    editor: {
      label: {
        en: 'Ignore chat commands',
        ru: 'Игнорировать чат команды',
        uk: 'Ігнорувати чат команди',
      },
      description: {
        en: 'Skip translation of messages that start with "!" and contain only one word. This allows excluding chat commands from translation.',
        ru: 'Пропускать перевод сообщений, начинающихся с "!" и содержащих только одно слово. Это позволяет исключить перевод чат команд.',
        uk: 'Пропускати переклад повідомлень, що починаються з "!" та містять лише одне слово. Це дозволяє виключити переклад чат команд.',
      },
    },
  },
  {
    key: 'translateSystemMessages',
    type: 'boolean',
    default: false,
    editor: {
      label: {
        en: 'Translate system messages',
        ru: 'Переводить системные сообщения',
        uk: 'Перекладати системні повідомлення',
      },
      description: {
        en: 'When enabled, system messages (marked with system: true) will also be translated. Disabled by default.',
        ru: 'При включении системные сообщения (с пометкой system: true) также будут переводиться. По умолчанию выключено.',
        uk: 'При увімкненні системні повідомлення (з позначкою system: true) також будуть перекладатися. За замовчуванням вимкнено.',
      },
    },
  },
  {
    key: 'useLlmDetectNeed',
    type: 'boolean',
    default: false,
    editor: {
      label: {
        en: 'Use LLM to decide if translation is needed',
        ru: 'Использовать LLM для определения необходимости перевода',
        uk: 'Використовувати LLM для визначення необхідності перекладу',
      },
      description: {
        en: 'When enabled, after the built-in language detector decides a message should be translated, an LLM reviews the message content as a second gate and may skip translation. If LLM Access is unavailable, this option has no effect and the original decision is kept. LLM does not replace the built-in detector — it only filters candidates to avoid wasting tokens.',
        ru: 'Если включено, после того как старый алгоритм решит, что сообщение нужно перевести, LLM дополнительно проанализирует содержимое и может отменить перевод. Если LLM недоступен — параметр игнорируется, решение остаётся за старым алгоритмом. LLM — второй шлюз, а не замена, чтобы не сжигать токены зря.',
        uk: 'Якщо увімкнено, після того як старий алгоритм вирішить, що повідомлення потрібно перекласти, LLM додатково проаналізує вміст і може скасувати переклад. Якщо LLM недоступний — параметр ігнорується, рішення лишається за старим алгоритмом. LLM — другий шлюз, а не заміна, щоб не витрачати токени даремно.',
      },
    },
  },
  {
    key: 'useLlmTranslate',
    type: 'boolean',
    default: false,
    editor: {
      label: {
        en: 'Use LLM to translate messages instead of Google Translate',
        ru: 'Использовать LLM для перевода сообщения вместо Google Translate',
        uk: 'Використовувати LLM для перекладу повідомлення замість Google Translate',
      },
      description: {
        en: 'When enabled, translation uses LLM Access when available. If LLM is unavailable or returns an invalid response, Google Translate is used as fallback. Disabled by default.',
        ru: 'Если включено — перевод выполняется через LLM при доступности. Если LLM недоступен или вернул некорректный ответ — используется Google Translate. По умолчанию выключено.',
        uk: 'Якщо увімкнено — переклад виконується через LLM за доступності. Якщо LLM недоступний або повернув некоректну відповідь — використовується Google Translate. За замовчуванням вимкнено.',
      },
    },
  },
  {
    key: 'clearTranslationCache',
    type: 'button',
    event: 'onClearTranslationCache',
    editor: {
      label: {
        en: 'Clear translation cache',
        ru: 'Сбросить кеш перевода',
        uk: 'Скинути кеш перекладу',
      },
      description: {
        en: 'Deletes all cached Google Translate and LLM results (detect-need answers and translations). The next identical messages will be sent to the APIs again. Does not clear the 7TV emote word list.',
        ru: 'Удаляет весь кеш Google Translate и LLM (ответы о необходимости перевода и сами переводы). Следующие одинаковые сообщения снова уйдут в API. Список слов эмодзи 7TV не затрагивается.',
        uk: 'Видаляє весь кеш Google Translate та LLM (відповіді про потребу перекладу й самі переклади). Наступні однакові повідомлення знову підуть в API. Список слів емодзі 7TV не змінюється.',
      },
    },
  },
  {
    key: 'template',
    type: 'text',
    default: defaultTemplate,
    editor: {
      label: {
        en: 'Message template',
        ru: 'Шаблон сообщения',
        uk: 'Шаблон повідомлення',
      },
      description: {
        en: 'Available variables: {name}, {message}, {source}',
        ru: 'Доступные переменные: {name}, {message}, {source}',
        uk: 'Доступні змінні: {name}, {message}, {source}',
      },
    },
  },
]);

/**
 * Returns whether detected language matches the selected target language.
 * @param detected Language code from the detector (e.g. `en`, `zh`).
 * @param target Target language code from settings (e.g. `en`, `zh-CN`).
 * @returns `true` when both codes refer to the same language family.
 * @example isSameLanguage('en', 'en'); // true
 * @example isSameLanguage('zh', 'zh-CN'); // true
 */
function isSameLanguage(detected: string, target: string): boolean {
  const a = detected.toLowerCase();
  const b = target.toLowerCase();
  if (a === b) return true;
  if (a === 'zh' && b.startsWith('zh')) return true;
  if (b === 'zh' && a.startsWith('zh')) return true;
  return false;
}

/** Cached 7TV emote words (lowercase) for Twitch messages, or `null` if unknown. */
let _seventvEmotes: Set<string> | null = null;

/**
 * Checks whether text contains at least one letter or digit.
 * @param text Input string to test.
 * @returns `true` if any alphanumeric / Unicode letter-or-number character is present.
 * @example hasAlphaNum('😊'); // false
 * @example hasAlphaNum('hi'); // true
 */
function hasAlphaNum(text: string): boolean {
  try {
    return /[\p{L}\p{N}]/u.test(text);
  } catch {
    return /[a-zA-Z0-9]/.test(text);
  }
}

/**
 * Returns whether the message is only emotes / emoji (nothing useful to translate).
 * @param text Message text.
 * @param emotes Optional platform emotes attached to the message.
 * @param platform Optional platform id (e.g. `twitch`) for 7TV emote matching.
 * @returns `true` when every token is an emote or non-alphanumeric.
 * @example isOnlyEmojiOrEmote('Kappa 😂', [{ word: 'Kappa', url: '...' }], 'twitch');
 */
function isOnlyEmojiOrEmote(
  text: string,
  emotes?: DashboardChatEmote[],
  platform?: string
): boolean {
  const words = text.trim().split(/\s+/);
  if (words.length === 0) return true;
  const emoteWords = new Set((emotes || []).map(e => e.word.toLowerCase()));
  return words.every(w => {
    const wl = w.toLowerCase();
    if (emoteWords.has(wl)) return true;
    if (platform === 'twitch' && _seventvEmotes?.has(wl)) return true;
    return !hasAlphaNum(w);
  });
}

/**
 * Fetches 7TV emote words from the `7tv` addon and caches them in storage.
 * @returns Resolves when the cache update attempt finishes (success or failure).
 * @example await fetchSeventvEmotes();
 */
async function fetchSeventvEmotes(): Promise<void> {
  try {
    const info = await addons.getInfo(['7tv']);
    if (!info.success) {
      _seventvEmotes = null;
      return;
    }
    const seventv = info.addons[0];
    if (!seventv?.enabled) {
      _seventvEmotes = null;
      return;
    }
    const res = await addons.request('7tv', 'getEmotes');
    if (res?.success && res.result) {
      const emotes: { word: string }[] =
        (res.result as { emotes: { word: string }[] }).emotes || [];
      _seventvEmotes = new Set(emotes.map(e => e.word.toLowerCase()));
      const cache = storage.Read<CacheMap>() || {};
      cache[CACHE_KEY_7TV] = JSON.stringify([..._seventvEmotes]);
      storage.Write(cache);
    }
  } catch (err) {
    console.error('Failed to fetch 7tv emotes:', err);
  }
}

/**
 * Restores the 7TV emote word set from addon storage cache.
 * @example loadSeventvFromCache();
 */
function loadSeventvFromCache(): void {
  try {
    const cache = storage.Read<CacheMap>() || {};
    const raw = cache[CACHE_KEY_7TV];
    if (raw) {
      _seventvEmotes = new Set(JSON.parse(raw));
    }
  } catch {
    // ignore invalid cache
  }
}

/**
 * Builds the storage key for a cached translation (Google or LLM).
 * @param targetLang Target language code.
 * @param text Source message text.
 * @returns Prefixed cache key.
 * @example translationCacheKey('en', 'hola'); // 'tr:en:hola'
 */
function translationCacheKey(targetLang: string, text: string): string {
  return `${CACHE_PREFIX_TRANSLATE}${targetLang}:${text}`;
}

/**
 * Builds the storage key for a cached LLM detect-need answer.
 * @param targetLang Target language code.
 * @param detectedLang Detected source language code.
 * @param text Source message text.
 * @returns Prefixed cache key.
 * @example llmDetectCacheKey('en', 'es', 'hola');
 */
function llmDetectCacheKey(
  targetLang: string,
  detectedLang: string,
  text: string
): string {
  return `${CACHE_PREFIX_LLM_DETECT}${targetLang}:${detectedLang}:${text}`;
}

/**
 * Reads the full addon storage cache map.
 * @returns Current cache object (may be empty).
 * @example const cache = readCache();
 */
function readCache(): CacheMap {
  return storage.Read<CacheMap>() || {};
}

/**
 * Writes a value into the addon storage cache.
 * @param key Cache entry key.
 * @param value String value to store.
 * @example writeCacheEntry('tr:en:hola', 'hello');
 */
function writeCacheEntry(key: string, value: string): void {
  const cache = readCache();
  cache[key] = value;
  storage.Write(cache);
}

/**
 * Looks up a cached translation, including the legacy unprefixed key format.
 * @param targetLang Target language code.
 * @param text Source message text.
 * @returns Cached translation, or `undefined` when missing.
 * @example getCachedTranslation('en', 'hola');
 */
function getCachedTranslation(
  targetLang: string,
  text: string
): string | undefined {
  const cache = readCache();
  const keyed = cache[translationCacheKey(targetLang, text)];
  if (keyed) return keyed;
  // Legacy keys written before the `tr:` prefix existed.
  return cache[`${targetLang}:${text}`];
}

/**
 * Stores a translation result under the prefixed cache key.
 * @param targetLang Target language code.
 * @param text Source message text.
 * @param translated Translation result.
 * @example setCachedTranslation('en', 'hola', 'hello');
 */
function setCachedTranslation(
  targetLang: string,
  text: string,
  translated: string
): void {
  writeCacheEntry(translationCacheKey(targetLang, text), translated);
}

/**
 * Clears Google Translate and LLM caches, preserving the 7TV emote word list.
 * @returns Number of removed cache entries.
 * @example const removed = clearTranslationCache();
 */
function clearTranslationCache(): number {
  const cache = readCache();
  const next: CacheMap = {};
  if (cache[CACHE_KEY_7TV]) next[CACHE_KEY_7TV] = cache[CACHE_KEY_7TV];
  const removed = Object.keys(cache).filter(k => k !== CACHE_KEY_7TV).length;
  storage.Write(next);
  return removed;
}

/**
 * Normalizes dashboard message content into a plain string.
 * @param content String, i18n tuple, or localized object from a chat payload.
 * @returns Flattened message text for the current language context.
 * @example getContentString('hello'); // 'hello'
 */
function getContentString(
  content:
    | string
    | [string, ...(string | number)[]]
    | Partial<Record<'en' | 'ru' | 'uk', string>>
): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return String(content[0] || '');
  return content[LANG.current as 'en' | 'ru' | 'uk'] || content.en || '';
}

/**
 * Resolves a language code to an English display name for LLM prompts.
 * @param code Language code such as `en`, `ru`, or `zh-CN`.
 * @returns English label from `LANGUAGE_OPTIONS`, or the raw code when unknown.
 * @example getLanguageEnglishName('ru'); // 'Russian'
 * @example getLanguageEnglishName('xx'); // 'xx'
 */
function getLanguageEnglishName(code: string): string {
  const found = LANGUAGE_OPTIONS.find(
    o => o.value.toLowerCase() === code.toLowerCase()
  );
  if (found) return found.label.en;
  const base = code.split('-')[0].toLowerCase();
  const byBase = LANGUAGE_OPTIONS.find(
    o =>
      o.value.toLowerCase() === base || o.value.toLowerCase().startsWith(base)
  );
  return byBase?.label.en || code;
}

/**
 * Builds a comma-separated emote word list for LLM prompts.
 * @param emotes Optional platform emotes from the chat message.
 * @param platform Optional platform id for including cached 7TV words used in text.
 * @param text Message text used to filter which 7TV emotes actually appear.
 * @returns Comma-separated emote words, or `(none)` when empty.
 * @example collectEmoteList([{ word: 'Kappa', url: 'x' }], 'twitch', 'Kappa hi');
 */
function collectEmoteList(
  emotes: DashboardChatEmote[] | undefined,
  platform: string | undefined,
  text: string
): string {
  const words = new Set<string>();
  for (const e of emotes || []) {
    if (e.word) words.add(e.word);
  }
  if (platform === 'twitch' && _seventvEmotes) {
    for (const token of text.trim().split(/\s+/)) {
      if (_seventvEmotes.has(token.toLowerCase())) words.add(token);
    }
  }
  const list = [...words];
  return list.length > 0 ? list.join(', ') : '(none)';
}

/**
 * Fills `{PLACEHOLDER}` tokens in an English LLM prompt template.
 * @param template Prompt string with `{KEY}` placeholders.
 * @param values Map of placeholder names to substitution strings.
 * @returns Prompt with all known placeholders replaced.
 * @example fillLlmPrompt('Lang: {SELECTED_LANGUAGE}', { SELECTED_LANGUAGE: 'English' });
 */
function fillLlmPrompt(
  template: string,
  values: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

/**
 * Logs a detect/translate pipeline step to the addon worker console.
 * @param step Short stage name (e.g. `detect`, `llm-gate`, `translate`).
 * @param details Extra fields describing the current state.
 * @example logPipeline('detect', { user: 'Viewer', language: 'ru' });
 */
function logPipeline(step: string, details: Record<string, unknown>): void {
  console.log(`[translate-messages] ${step}`, details);
}

/**
 * Estimates a safe `maxTokens` budget for an LLM translation of `text`.
 * Scales with input length so long chat messages are less likely to be cut off.
 * @param text Source message text.
 * @returns Token budget clamped between 256 and 2048.
 * @example estimateTranslateMaxTokens('hello'); // 256+
 */
function estimateTranslateMaxTokens(text: string): number {
  // Rough char→token heuristic (~2–3 chars/token for mixed Cyrillic/Latin).
  const estimated = Math.ceil(text.length / 2) + 64;
  return Math.min(2048, Math.max(512, estimated));
}

/**
 * Heuristic: detects truncated / incomplete LLM translations that should not be cached.
 * @param source Original message text.
 * @param translated Candidate translation from the LLM.
 * @returns `true` when the translation looks cut off mid-message.
 * @example isLikelyIncompleteTranslation('Long sentence ends here?', 'Short');
 */
function isLikelyIncompleteTranslation(
  source: string,
  translated: string
): boolean {
  const src = source.trim();
  const dst = translated.trim();
  if (!src || !dst) return true;

  const srcWords = src.split(/\s+/).filter(Boolean).length;
  const dstWords = dst.split(/\s+/).filter(Boolean).length;

  // Related languages (e.g. uk→ru) stay similar in length; a large drop is suspicious.
  if (src.length >= 50 && dst.length < Math.floor(src.length * 0.5)) {
    return true;
  }
  if (srcWords >= 8 && dstWords < Math.floor(srcWords * 0.5)) {
    return true;
  }

  const srcEndsSentence = /[.!?…]$/u.test(src);
  const dstEndsSentence = /[.!?…]$/u.test(dst);
  if (
    srcEndsSentence &&
    !dstEndsSentence &&
    src.length > Math.floor(dst.length * 1.15)
  ) {
    return true;
  }

  // Source has sentence punctuation but translation has none and is clearly shorter.
  const srcClauseMarks = (src.match(/[.!?…]/gu) || []).length;
  const dstClauseMarks = (dst.match(/[.!?…]/gu) || []).length;
  if (srcClauseMarks >= 1 && dstClauseMarks === 0 && src.length > 80) {
    return true;
  }

  return false;
}

/**
 * Checks whether host LLM Access is usable for this addon right now.
 * @returns `true` when the addon has `LLM` permission and LLM Access is enabled.
 * @example const ok = await isLlmAvailable();
 */
async function isLlmAvailable(): Promise<boolean> {
  if (!permissions.has('LLM')) return false;
  try {
    const settings = await llm.getSettings();
    if (!settings.success) return false;
    return 'enabled' in settings && !!settings.enabled;
  } catch {
    return false;
  }
}

/**
 * Asks the LLM whether a message that already passed the built-in detector
 * still needs translation. On failure or non-yes/no replies, returns `null`
 * so the caller keeps the original (built-in) decision.
 * @param text Message text to evaluate.
 * @param targetLang Target language code from settings.
 * @param detectedLang Detected source language code.
 * @param emoteList Comma-separated emote words for the prompt.
 * @returns `true` / `false` from a valid LLM answer, or `null` if LLM should be ignored.
 * @example
 * const need = await llmDetectTranslationNeed('hola', 'en', 'es', 'Kappa');
 * if (need === false) return;
 */
async function llmDetectTranslationNeed(
  text: string,
  targetLang: string,
  detectedLang: string,
  emoteList: string
): Promise<boolean | null> {
  const cacheKey = llmDetectCacheKey(targetLang, detectedLang, text);
  const cached = readCache()[cacheKey];
  if (cached === 'yes' || cached === 'no') {
    logPipeline('llm-gate:cache', {
      answer: cached,
      targetLang,
      detectedLang,
      text,
    });
    return cached === 'yes';
  }

  try {
    const prompt = fillLlmPrompt(LLM_DETECT_NEED_PROMPT, {
      SELECTED_LANGUAGE: getLanguageEnglishName(targetLang),
      DETECTED_LANGUAGE: getLanguageEnglishName(detectedLang),
      MESSAGE_TEXT: text,
      MESSAGE_EMOTE_LIST: emoteList,
    });
    logPipeline('llm-gate:request', {
      targetLang,
      detectedLang,
      text,
      emoteList,
    });
    const res = await llm.chat(prompt, {
      temperature: 0,
      maxTokens: 8,
    });
    if (!res.success || !('content' in res) || !res.content) {
      logPipeline('llm-gate:invalid', {
        success: res.success,
        message: res.message,
        content: 'content' in res ? res.content : undefined,
      });
      return null;
    }
    const answer = res.content.trim().toLowerCase();
    if (/^yes\b/.test(answer)) {
      writeCacheEntry(cacheKey, 'yes');
      logPipeline('llm-gate:result', {
        answer: 'yes',
        raw: res.content,
        cached: true,
      });
      return true;
    }
    if (/^no\b/.test(answer)) {
      writeCacheEntry(cacheKey, 'no');
      logPipeline('llm-gate:result', {
        answer: 'no',
        raw: res.content,
        cached: true,
      });
      return false;
    }
    logPipeline('llm-gate:unparsed', { raw: res.content });
    return null;
  } catch (err) {
    console.error('[translate-messages] llm-gate:error', err);
    return null;
  }
}

/**
 * Translates text via LLM Access using the structured `TRANSLATE_SUCCESS|...` format.
 * @param text Source message text.
 * @param targetLang Target language code.
 * @param detectedLang Detected source language code.
 * @param emoteList Comma-separated emote words that must stay unchanged.
 * @returns Translated string on a valid response, otherwise `null` (caller should fall back).
 * @example
 * const out = await llmTranslateText('bonjour', 'en', 'fr', '(none)');
 */
async function llmTranslateText(
  text: string,
  targetLang: string,
  detectedLang: string,
  emoteList: string
): Promise<string | null> {
  try {
    const prompt = fillLlmPrompt(LLM_TRANSLATE_PROMPT, {
      SELECTED_LANGUAGE: getLanguageEnglishName(targetLang),
      DETECTED_LANGUAGE: getLanguageEnglishName(detectedLang),
      MESSAGE_TEXT: text,
      MESSAGE_EMOTE_LIST: emoteList,
    });
    const maxTokens = estimateTranslateMaxTokens(text);
    logPipeline('translate:llm-request', {
      targetLang,
      detectedLang,
      text,
      emoteList,
      maxTokens,
    });
    const res = await llm.chat(prompt, {
      temperature: 0.2,
      maxTokens,
    });
    if (!res.success || !('content' in res) || !res.content) {
      logPipeline('translate:llm-invalid', {
        success: res.success,
        message: res.message,
        content: 'content' in res ? res.content : undefined,
      });
      return null;
    }
    const content = res.content.trim();
    const prefix = 'TRANSLATE_SUCCESS|';
    const idx = content.indexOf(prefix);
    if (idx === -1) {
      logPipeline('translate:llm-bad-format', { raw: content });
      return null;
    }
    // Take everything after the first prefix marker (translation may span lines).
    let translated = content.slice(idx + prefix.length).trim();
    // Some models wrap the payload in backticks or quotes — strip one layer.
    translated = translated
      .replace(/^`{1,3}|`{1,3}$/g, '')
      .replace(/^"+|"+$/g, '')
      .trim();
    if (!translated) {
      logPipeline('translate:llm-empty', { raw: content });
      return null;
    }
    if (isLikelyIncompleteTranslation(text, translated)) {
      logPipeline('translate:llm-incomplete', {
        source: text,
        translated,
        sourceLen: text.trim().length,
        translatedLen: translated.length,
      });
      return null;
    }
    setCachedTranslation(targetLang, text, translated);
    logPipeline('translate:llm-ok', { translated, cached: true });
    return translated;
  } catch (err) {
    console.error('[translate-messages] translate:llm-error', err);
    return null;
  }
}

/**
 * Translates text via Google Translate, with a local storage cache.
 * @param text Source text to translate.
 * @param targetLang Target language code (Google `tl` parameter).
 * @returns Translated string, or `null` when translation fails / is unchanged.
 * @example await translateTextGoogle('hola', 'en');
 */
async function translateTextGoogle(
  text: string,
  targetLang: string
): Promise<string | null> {
  try {
    logPipeline('translate:google-request', { targetLang, text });
    const url = `${GOOGLE_TRANSLATE_URL}?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await network.request.get(url);
    const data = JSON.parse(response);
    const segments: string[] = (data[0] || []).map(
      (s: unknown) => (s as string[])[0] || ''
    );
    const translated = segments.join('');

    if (translated && translated !== text) {
      setCachedTranslation(targetLang, text, translated);
      logPipeline('translate:google-ok', { translated, cached: true });
      return translated;
    }
    logPipeline('translate:google-unchanged', { translated });
    return null;
  } catch (err) {
    console.error('[translate-messages] translate:google-error', err);
    return null;
  }
}

/**
 * Translates text using LLM when requested and available, otherwise Google Translate.
 * @param text Source text.
 * @param targetLang Target language code.
 * @param detectedLang Detected source language code (used only for the LLM path).
 * @param emoteList Emote word list for the LLM prompt.
 * @param preferLlm Whether the user enabled LLM translation.
 * @returns Translated string, or `null` on failure.
 * @example
 * await translateText('hola', 'en', 'es', '(none)', true);
 */
async function translateText(
  text: string,
  targetLang: string,
  detectedLang: string,
  emoteList: string,
  preferLlm: boolean
): Promise<string | null> {
  const cached = getCachedTranslation(targetLang, text);
  if (cached) {
    logPipeline('translate:cache', {
      targetLang,
      text,
      translated: cached,
      preferLlm,
    });
    return cached;
  }

  const llmAvailable = preferLlm ? await isLlmAvailable() : false;
  logPipeline('translate:start', {
    preferLlm,
    llmAvailable,
    targetLang,
    detectedLang,
    text,
  });

  if (preferLlm && llmAvailable) {
    const llmResult = await llmTranslateText(
      text,
      targetLang,
      detectedLang,
      emoteList
    );
    if (llmResult && llmResult !== text) {
      return llmResult;
    }
    logPipeline('translate:llm-fallback-google', {
      reason: llmResult ? 'unchanged' : 'failed',
    });
  } else if (preferLlm && !llmAvailable) {
    logPipeline('translate:llm-unavailable', {
      reason: 'falling back to Google Translate',
    });
  }

  return translateTextGoogle(text, targetLang);
}

/**
 * Registers chat listeners and starts periodic 7TV emote refresh.
 * @returns Resolves after the chat handler is registered.
 * @example await init();
 */
async function init(): Promise<void> {
  loadSeventvFromCache();
  fetchSeventvEmotes();
  setInterval(fetchSeventvEmotes, 5 * 60 * 1000);

  events.On('onClearTranslationCache', () => {
    const removed = clearTranslationCache();
    logPipeline('cache:cleared', { removed });
    settings.notify.Send({
      title: {
        en: 'Translation cache cleared',
        ru: 'Кеш перевода сброшен',
        uk: 'Кеш перекладу скинуто',
      },
      message: {
        en: `Removed ${removed} cached entries. Identical messages will be re-checked and re-translated.`,
        ru: `Удалено записей: ${removed}. Одинаковые сообщения снова будут проверяться и переводиться.`,
        uk: `Видалено записів: ${removed}. Однакові повідомлення знову перевірятимуться й перекладатимуться.`,
      },
    });
  });

  await dashboard.onChatMessage(async payload => {
    try {
      if (!payload.sourceAddonId) return;
      if (payload.sourceAddonId === data.id) return;

      const messageText = getContentString(payload.message.content);
      if (!messageText) return;

      const userName = payload.user?.name || 'Unknown';

      const currentParams = await api.config.getParams<AddonParams>();
      const {
        targetLang,
        mode,
        prefix,
        autoUsers,
        ignoreChatCommands,
        translateSystemMessages,
        useLlmDetectNeed,
        useLlmTranslate,
      } = currentParams;

      if (!translateSystemMessages && payload.message.system) return;

      if (ignoreChatCommands && messageText.startsWith('!')) {
        const afterBang = messageText.slice(1).trim();
        if (afterBang && !/\s/.test(afterBang)) return;
      }

      let textToTranslate: string | null = null;

      if (mode === 'auto') {
        textToTranslate = messageText;
      } else {
        if (messageText.startsWith(prefix)) {
          textToTranslate = messageText.slice(prefix.length).trim();
        } else if (
          autoUsers.some(u => u.toLowerCase() === userName.toLowerCase())
        ) {
          textToTranslate = messageText;
        }
      }

      if (!textToTranslate) return;

      if (
        isOnlyEmojiOrEmote(
          textToTranslate,
          payload.message.emotes,
          payload.message.platform
        )
      )
        return;

      logPipeline('detect:start', {
        user: userName,
        targetLang,
        text: textToTranslate,
        mode,
      });

      const langResult = await language.detect(textToTranslate);
      if (!langResult.success) {
        logPipeline('detect:uncertain', {
          user: userName,
          message: langResult.message,
          possibles: langResult.possibles,
          text: textToTranslate,
        });
        return;
      }

      logPipeline('detect:result', {
        user: userName,
        language: langResult.language,
        name: langResult.name,
        alpha3: langResult.alpha3,
        targetLang,
        text: textToTranslate,
      });

      if (isSameLanguage(langResult.language, targetLang)) {
        logPipeline('detect:skip-same-language', {
          user: userName,
          language: langResult.language,
          targetLang,
        });
        return;
      }

      const emoteList = collectEmoteList(
        payload.message.emotes,
        payload.message.platform,
        textToTranslate
      );

      // Built-in detector is the first gate; LLM is an optional second gate.
      if (useLlmDetectNeed) {
        const llmAvailable = await isLlmAvailable();
        if (!llmAvailable) {
          logPipeline('llm-gate:skip-unavailable', {
            user: userName,
            reason: 'LLM Access unavailable; keeping built-in decision',
          });
        } else {
          const llmNeed = await llmDetectTranslationNeed(
            textToTranslate,
            targetLang,
            langResult.language,
            emoteList
          );
          if (llmNeed === false) {
            logPipeline('llm-gate:skip-no', {
              user: userName,
              text: textToTranslate,
            });
            return;
          }
          if (llmNeed === null) {
            logPipeline('llm-gate:keep-builtin', {
              user: userName,
              reason: 'invalid/unparsed LLM reply; keeping built-in decision',
            });
          }
        }
      }

      const translated = await translateText(
        textToTranslate,
        targetLang,
        langResult.language,
        emoteList,
        !!useLlmTranslate
      );
      if (!translated) {
        logPipeline('translate:failed', {
          user: userName,
          text: textToTranslate,
          targetLang,
        });
        return;
      }
      if (translated === textToTranslate) {
        logPipeline('translate:unchanged', {
          user: userName,
          text: textToTranslate,
        });
        return;
      }

      const output = currentParams.template
        .replace(/\{name\}/g, userName)
        .replace(/\{message\}/g, translated)
        .replace(/\{source\}/g, textToTranslate);
      logPipeline('translate:sent', {
        user: userName,
        source: textToTranslate,
        translated,
        output,
        target: payload.sourceAddonId,
      });
      await dashboard.sendChatMessage(output, [payload.sourceAddonId]);
    } catch (err) {
      console.error('[translate-messages] Error processing chat message:', err);
    }
  });
}

init().catch(err => console.error('Addon init error:', err));
