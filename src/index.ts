interface AddonParams {
  targetLang: string;
  mode: 'auto' | 'command';
  prefix: string;
  autoUsers: string[];
  ignoreChatCommands: boolean;
  template: string;
}

type CacheMap = Record<string, string>;

const GOOGLE_TRANSLATE_URL =
  'https://translate.googleapis.com/translate_a/single';

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
        en: 'Translation is powered by Google Translate. Translations may not be accurate.',
        ru: 'Перевод выполняется через Google Translate. Перевод может быть неточным.',
        uk: 'Переклад виконується через Google Translate. Переклад може бути неточним.',
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

function isSameLanguage(detected: string, target: string): boolean {
  const a = detected.toLowerCase();
  const b = target.toLowerCase();
  if (a === b) return true;
  if (a === 'zh' && b.startsWith('zh')) return true;
  if (b === 'zh' && a.startsWith('zh')) return true;
  return false;
}

let _seventvEmotes: Set<string> | null = null;

function hasAlphaNum(text: string): boolean {
  try {
    return /[\p{L}\p{N}]/u.test(text);
  } catch {
    return /[a-zA-Z0-9]/.test(text);
  }
}

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
      cache['_7tv_words'] = JSON.stringify([..._seventvEmotes]);
      storage.Write(cache);
    }
  } catch (err) {
    console.error('Failed to fetch 7tv emotes:', err);
  }
}

function loadSeventvFromCache(): void {
  try {
    const cache = storage.Read<CacheMap>() || {};
    const raw = cache['_7tv_words'];
    if (raw) {
      _seventvEmotes = new Set(JSON.parse(raw));
    }
  } catch {}
}

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

async function translateText(
  text: string,
  targetLang: string
): Promise<string | null> {
  const cache = storage.Read<CacheMap>() || {};
  const cacheKey = `${targetLang}:${text}`;

  if (cache[cacheKey]) return cache[cacheKey];

  try {
    const url = `${GOOGLE_TRANSLATE_URL}?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await network.request.get(url);
    const data = JSON.parse(response);
    const segments: string[] = (data[0] || []).map(
      (s: unknown) => (s as string[])[0] || ''
    );
    const translated = segments.join('');

    if (translated && translated !== text) {
      cache[cacheKey] = translated;
      storage.Write(cache);
      return translated;
    }
    return null;
  } catch (err) {
    console.error('Translation API error:', err);
    return null;
  }
}

async function init(): Promise<void> {
  const params = await api.config.getParams<AddonParams>();

  loadSeventvFromCache();
  fetchSeventvEmotes();
  setInterval(fetchSeventvEmotes, 5 * 60 * 1000);

  await dashboard.onChatMessage(async payload => {
    try {
      if (!payload.sourceAddonId) return;
      if (payload.sourceAddonId === data.id) return;

      const messageText = getContentString(payload.message.content);
      if (!messageText) return;

      const userName = payload.user?.name || 'Unknown';

      const currentParams = await api.config.getParams<AddonParams>();
      const { targetLang, mode, prefix, autoUsers, ignoreChatCommands } =
        currentParams;

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

      const langResult = await language.detect(textToTranslate);
      if (!langResult.success) return;

      if (isSameLanguage(langResult.language, targetLang)) return;

      const translated = await translateText(textToTranslate, targetLang);
      if (!translated) return;
      if (translated === textToTranslate) return;

      const output = currentParams.template
        .replace(/\{name\}/g, userName)
        .replace(/\{message\}/g, translated)
        .replace(/\{source\}/g, textToTranslate);
      await dashboard.sendChatMessage(output, [payload.sourceAddonId]);
    } catch (err) {
      console.error('Error processing chat message:', err);
    }
  });
}

init().catch(err => console.error('Addon init error:', err));
