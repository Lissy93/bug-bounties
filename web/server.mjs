import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import sirv from 'sirv';
import { handler as ssr } from './dist/server/entry.mjs';

const host = process.env.HOST ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 8080);

const securityHeaders = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const clientDir = fileURLToPath(new URL('./dist/client/', import.meta.url));
const serveStatic = sirv(clientDir, {
	etag: true,
	gzip: true,
	brotli: true,
	maxAge: 60 * 60 * 24 * 7,
	immutable: false,
});

const server = createServer((req, res) => {
	for (const [k, v] of Object.entries(securityHeaders)) res.setHeader(k, v);
	serveStatic(req, res, () => ssr(req, res));
});

const shutdown = (signal) => {
	console.log(`Received ${signal}, shutting down`);
	server.close(() => process.exit(0));
	setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.listen(port, host, () => {
	console.log(`Listening on http://${host}:${port}`);
});
