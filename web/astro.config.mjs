import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import rehypeExternalLinks from 'rehype-external-links';

const target = (
	process.env.DEPLOY_TARGET ||
	(process.env.NETLIFY ? 'netlify' : '') ||
	(process.env.VERCEL ? 'vercel' : '') ||
	(process.env.NODE_ADAPTER ? 'node' : '') ||
	'vercel'
).toLowerCase();

async function resolveAdapter() {
	switch (target) {
		case 'netlify': {
			const { default: netlify } = await import('@astrojs/netlify');
			return netlify();
		}
		case 'vercel': {
			const { default: vercel } = await import('@astrojs/vercel');
			return vercel();
		}
		case 'node': {
			const { default: node } = await import('@astrojs/node');
			return node({ mode: 'standalone' });
		}
		case 'static':
		default:
			return undefined;
	}
}

const adapter = await resolveAdapter();

export default defineConfig({
	markdown: {
		rehypePlugins: [
			[rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
		],
	},
	site: 'https://bug-bounties.as93.net',
	...(adapter ? { adapter } : {}),
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
