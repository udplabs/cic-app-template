import hljs from 'highlight.js';
import { eachElement, elementMapper } from '../utils';

hljs.configure({ ignoreUnescapedHTML: true });

// Global app state handling;
const defaultLoadingTitle = 'Hang tight!';
const defaultLoadingMsg = 'The monkeys are working.';

/**
 * @type {AppState}
 */
export let appState = {
	apiData: undefined,
	isConfigured: false,
	isLoading: true,
	loadingTitle: defaultLoadingTitle,
	loadingMsg: defaultLoadingMsg,
};

export const appStateProvider = new Proxy(appState, {
	/**
	 *
	 * @param {AppState} target
	 * @param {string | symbol} key
	 * @param {*} value
	 * @returns
	 */
	set: (target, key, value) => {
		target[key] = value;

		switch (key) {
			case 'apiData':
				const responseElement = document.getElementById('api-call-result');

				if (value) {
					// responseElement.innerText = value;
					responseElement.innerHTML = JSON.stringify(value, null, 2);

					eachElement('.result-block', (element) => element.classList.add('show'));

					window.location.hash = '#anchor-results';
				} else {
					responseElement.innerHTML = '';
				}
				break;

			case 'isConfigured':
				eachElement('.config-invisible', (e) => e.classList[value ? 'add' : 'remove']('config-hidden'));
				eachElement('.config-visible', (e) => e.classList[value ? 'remove' : 'add']('config-hidden'));
				break;
			case 'isLoading':
				console.log('isLoading:', value);
				document.querySelectorAll('.x-loader').forEach((element) => {
					if (value) {
						element.classList.add('show');
						element.classList.remove('hide');
					} else {
						element.classList.add('hide');
						element.classList.remove('show');
					}
				});
				break;
			// Set innerHTML
			case 'loadingMsg':
			case 'loadingTitle':
				document.getElementById(elementMapper[key]).innerHTML = value;
				break;
			default:
				break;
		}

		hljs.highlightAll();
		// document.querySelectorAll('pre code').forEach(hljs.highlightBlock);

		return true;
	},
});

/**
 * @typedef AppState
 * @type {Object}
 * @property {Object} apiData
 * @property {boolean} isConfigured
 * @property {boolean} isLoading
 * @property {string} loadingTitle
 * @property {string} loadingMsg
 */
