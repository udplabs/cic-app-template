import initApp from './app.js';

const { VITE_APP_PORT: PORT = 3000, PROD } = import.meta;

if (!PROD) {
	const viteScript = document.createElement('script');
	viteScript.setAttribute('type', 'module');
	viteScript.setAttribute('src', `http://localhost:${PORT}/@vite/client`);

	document.body.appendChild(viteScript);

	const mainScript = document.createElement('script');
	mainScript.setAttribute('type', 'module');
	mainScript.setAttribute('src', `http://localhost:${PORT}/main.js`);

	document.body.appendChild(mainScript);
}

window.onload = () => initApp();
