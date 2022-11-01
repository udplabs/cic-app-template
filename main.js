import initApp from './app';

const { VITE_APP_PORT: PORT = 3000, PROD } = import.meta.env;

if (!PROD) {
	const viteScript = document.createElement('script');
	viteScript.setAttribute('type', 'module');
	viteScript.setAttribute('src', `${window.location.href}@vite/client`);

	document.body.appendChild(viteScript);

	const mainScript = document.createElement('script');
	mainScript.setAttribute('type', 'module');
	mainScript.setAttribute('src', `${window.location.href}main.js`);

	document.body.appendChild(mainScript);
}

window.onload = () => initApp();
