import { z, defineCollection } from 'astro:content';

const news = defineCollection({
    schema: z.object({
        category: z.string(),
        title: z.string(),
        date: z.string(),
        author: z.string()
    })
});

export const collections = { news };