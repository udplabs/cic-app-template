import dns from 'dns';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
	const { VITE_APP_PORT: port, APP_ENV } = loadEnv(mode, process.cwd(), '');

	dns.setDefaultResultOrder('verbatim');

	return {
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
