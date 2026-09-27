// Контакты для букинга — одно место, откуда их берут секция букинга и
// (в будущем) футер

export const CONTACTS = {
	telegram: "rvnwsly",
	instagram: "leviti.wav",
	// TODO: ссылка на Telegram-канал, например "https://t.me/xxx". null — пункт не выводится
	telegramChannel: null as string | null,
};

// Web3Forms access key: https://web3forms.com → ввести почту Оли → ключ придёт
// письмом, туда же будут приходить заявки. Ключ публичный по задумке сервиса
// (форма отправляется прямо из браузера), держать в секретах не нужно.
// Пустая строка — форма не отправляет, а предлагает написать в Telegram
export const WEB3FORMS_KEY = "";
