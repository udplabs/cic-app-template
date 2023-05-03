import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
	Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
	const { VITE_APP_PORT: port, APP_ENV } = process?.env;

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
