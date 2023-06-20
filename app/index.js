import { appStateProvider, AuthClient, authState, appState, buttonState } from './providers';
import { isRouteLink, showContent, showContentFromUrl } from './utils';

const { BASE_URL } = import.meta.env;

// Initialize global auth0
var auth0 = undefined;
var apiUrl = '/api';

/**
 * Calls the API endpoint with an authorization token
 *
 * @param {Object} options
 * @param {AuthClient} options.auth0
 * @param {string} options.url
 * @param {string} options.btnId
 * @returns {Promise}
 */
export const callApi = async ({ auth0, url, btnId }) => {
	try {
		if (btnId) {
			buttonState({ id: btnId });
		}

		// Clear the response block
		const responseElement = document.getElementById('api-call-result');

		if (responseElement) {
			responseElement.innerText = '{}';
		}
		// ===

		history.pushState('', null, window.location.pathname);

		const accessToken = ['scoped-api-btn', 'private-api-btn'].includes(btnId)
			? await auth0.refreshTokens(true)
			: await auth0.getAccessToken();

		const fetchOptions = {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		};

		const response = await fetch(url, fetchOptions);

		const { status, statusText, ...resp } = response.clone();

		const result = {
			status,
			statusText,
			...(await response.json()),
		};

		return (appStateProvider.apiData = result);
	} catch (error) {
		console.error(error);
		alert('Unable to access API or API is not configured correctly. See console for details.');
	} finally {
		if (btnId) {
			buttonState({ id: btnId, isLoading: false });
		}
	}
};

export const onPopState = ({ state }) => {
	if (state?.url && router[state.url]) {
		showContentFromUrl(state.url);
	}
};

// URL mapping, from hash to a function that responds to that URL action
export const router = {
	'/': () => showContent('content-home'),
	'/profile': () => auth0?.requireAuth(() => showContent('content-profile'), '/profile'),
	'/login': () => login(),
};

/**
 * Runs as the default function when the page is initially loaded.
 */
export default async () => {
	window.onpopstate = onPopState;

	auth0 = new AuthClient();

	if (BASE_URL && !BASE_URL.startsWith('/')) {
		apiUrl = new URL(apiUrl, BASE_URL).toString();
	}

	// Add event listeners to buttons
	const loginButton = document.querySelector('#qsLoginBtn');
	const refreshTokensButton = document.querySelector('#qsRefreshTokens');
	const logoutButton = document.querySelector('#qsLogoutBtn');
	const publicAPIButton = document.querySelector('#public-api-btn');
	const privateAPIButton = document.querySelector('#private-api-btn');
	const scopedAPIButton = document.querySelector('#scoped-api-btn');

	loginButton.addEventListener('click', () => auth0.login());

	refreshTokensButton.addEventListener('click', () => auth0.refreshTokens());

	logoutButton.addEventListener('click', () => auth0.signout());

	publicAPIButton.addEventListener('click', () =>
		callApi({
			auth0,
			url: window.location.origin + apiUrl + '/public',
			btnId: 'public-api-btn',
		})
	);

	privateAPIButton.addEventListener('click', () =>
		callApi({
			auth0,
			url: window.location.origin + apiUrl + '/private',
			btnId: 'private-api-btn',
		})
	);

	scopedAPIButton.addEventListener('click', () =>
		callApi({
			auth0,
			url: window.location.origin + apiUrl + '/scoped',
			btnId: 'scoped-api-btn',
		})
	);

	// If unable to parse the history hash, default to the root URL
	if (!showContentFromUrl(window.location.pathname)) {
		showContentFromUrl('/');
		window.history.replaceState({ url: '/' }, {}, '/');
	}

	const bodyElement = document.getElementsByTagName('body')[0];

	// Listen out for clicks on any hyperlink that navigates to a #/ URL
	bodyElement.addEventListener('click', (e) => {
		if (isRouteLink(e.target)) {
			const url = e.target.getAttribute('href');

			if (showContentFromUrl(url)) {
				e.preventDefault();
				window.history.pushState({ url }, {}, url);
			}
		}
	});

	if (auth0) {
		await auth0.handleAuth();
	}

	return (appStateProvider.isLoading = false);
};
