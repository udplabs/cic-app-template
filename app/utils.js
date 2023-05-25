import { router } from './index.js';
import config from '../config';

export const assert = (condition, message = 'Assertion failed!') => {
	if (!condition) {
		throw new Error(message);
	}
};

/**
 * Iterates over the elements matching 'selector' and passes them
 * to 'fn'
 * @param {*} selector The CSS selector to find
 * @param {*} fn The function to execute for every element
 */
export const eachElement = (selector, fn) => {
	for (let e of document.querySelectorAll(selector)) {
		fn(e);
	}
};

export const elementMapper = {
	user: 'ipt-user-profile',
	accessToken: 'ipt-access-token',
	loadingMsg: 'loading-msg',
	loadingTitle: 'loading-title',
};

/**
 * Returns true if `element` is a hyperlink that can be considered a link to another SPA route
 * @param {*} element The element to check
 */
export const isRouteLink = (element) => element.tagName === 'A' && element.classList.contains('route-link');

export const getConfig = () => {
	const _currentConfigBase64 = localStorage.getItem('config');
	let _currentConfig;
	let configBase64;

	if (_currentConfigBase64 && !['undefined', 'null'].includes(_currentConfigBase64)) {
		_currentConfig = window.atob(_currentConfigBase64);

		if (_currentConfig) {
			_currentConfig = JSON.parse(_currentConfig);
		}
	}

	if (config && config?.auth?.clientId !== '_CLIENTID_' && config?.auth?.domain !== '_DOMAIN_') {
		if (config?.auth?.audience?.includes('_AUDIENCE_')) {
			delete config.auth.audience;
		}

		configBase64 = window.btoa(JSON.stringify(config));
	}

	let result = { hasChanged: false, config };

	result.hasChanged = _currentConfigBase64 !== configBase64;

	if (!_currentConfigBase64 || result.hasChanged) {
		localStorage.setItem('config', configBase64);
	}

	console.group('=== config ===');
	console.log(JSON.stringify(result, null, 2));
	console.groupEnd();

	return result;
};

export const parseJwt = (token) => {
	var base64Url = token.split('.')[1];
	var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
	if (base64 == '') {
		return false;
	}
	var jsonPayload = decodeURIComponent(
		window
			.atob(base64)
			.split('')
			.map(function (c) {
				return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
			})
			.join('')
	);

	return JSON.parse(jsonPayload);
};

/**
 * Displays a content panel specified by the given element id.
 * All the panels that participate in this flow should have the 'page' class applied,
 * so that it can be correctly hidden before the requested content is shown.
 * @param {*} id The id of the content to show
 */
export const showContent = (id) => {
	eachElement('.page', (p) => p.classList.add('hidden'));
	document.getElementById(id).classList.remove('hidden');
};

/**
 * Tries to display a content panel that is referenced
 * by the specified route URL. These are matched using the
 * router, defined above.
 * @param {*} url The route URL
 */
export const showContentFromUrl = (url) => {
	if (router[url]) {
		router[url]();
		return true;
	}

	return false;
};
