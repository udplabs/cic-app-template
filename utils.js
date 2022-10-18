import { router } from './app.js';

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

export const fetchConfig = async () => {
	const port = parseInt(window.location.port) + 1;

	const resp = await fetch(
		`http://${window.location.hostname}:${port}/config`
	);

	if (!resp.ok) {
		throw new Error('Unable to fetch config!');
	}

	return await resp.json();
};

/**
 * Returns true if `element` is a hyperlink that can be considered a link to another SPA route
 * @param {*} element The element to check
 */
export const isRouteLink = (element) =>
	element.tagName === 'A' && element.classList.contains('route-link');

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
