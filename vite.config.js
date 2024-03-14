import { defineConfig, loadEnv } from 'vite';
import mixPlugin from 'vite-plugin-mix';

const mix = mixPlugin.default;

export default defineConfig(({ command, mode }) => {
	Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
	const { VITE_APP_PORT: port, APP_ENV } = process?.env;

	return {
		plugins: [mix({ handler: './server.js' })],
		define: {
			__APP_ENV__: APP_ENV,
		},
		server: {
			port,
		},
		build: {
			// generate manifest.json in outDir
			manifest: true,
			modulePreload: {
				polyfill: false,
			},
			rollupOptions: {
				// overwrite default .html entry
				input: './main.js',
			},
		},
	};
});
