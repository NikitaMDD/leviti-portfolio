import { defineCollection } from "astro:content";
import { file } from "astro/loaders";
import { z } from "astro/zod";

// Ивенты — один YAML-файл, а не по файлу на ивент: записи короткие, и
// добавить новую проще дописав пару строк в конец списка
const events = defineCollection({
	loader: file("src/content/events.yaml"),
	schema: z.object({
		// дата начала вечера (ночь 26→27 — это 26-е). По ней же ивент сам
		// переезжает из "скоро" в "прошедшие" при ежедневной пересборке
		date: z.coerce.date(),
		title: z.string(),
		venue: z.string().optional(),
		city: z.string(),
		role: z.enum(["headline", "b2b", "warm-up", "closing", "showcase", "resident"]).optional(),
		// ссылки необязательны: нет ссылки — нет кнопки
		tickets: z.url().optional(),
		post: z.url().optional(),
		// запись-заглушка, пока не уточнили точное название/дату
		tbc: z.boolean().default(false),
	}),
});

export const collections = { events };
