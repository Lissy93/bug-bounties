import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
	site: 'https://bug-bounties.as93.net',
	adapter: vercel(),
	integrations: [
		svelte(),
		sitemap({
			filter: (page) =>
				!page.includes('/bookmarks') &&
				!page.includes('/404') &&
				!page.includes('/api/'),
		}),
	],
});
