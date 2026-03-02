import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
	site: 'https://bug-bounties.as93.net',
	integrations: [svelte(), sitemap()],
});
