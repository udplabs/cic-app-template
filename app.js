import appStateProvider from './appState';
import { authState } from './authState';
import AuthClient from './authClient';
import buttonState from './buttonState';
import { isRouteLink, showContent, showContentFromUrl } from './utils';

const { VITE_SERVER_PORT: PORT = 3001 } = import.meta;

// Initialize global auth0
var auth0 = undefined;

var apiUrl = `http://${window.location.hostname}:${PORT}`;

// Adjust for Stackblitz
if (window.location.origin.includes('webcontainer.io')) {
	const regex = /(?<=--)\d{0,4}/;

	const href = window.location.origin;

	apiUrl = href.replace(regex, PORT);
}

/**
 * Calls the API endpoint with an authorization token
 */
export const callApi = async ({ auth0, url, btnId }) => {
	try {
		if (btnId) {
			buttonState({ id: btnId });
		}

		history.pushState('', null, window.location.pathname);

		const accessToken =
			authState?.accessToken ||
			(await auth0.getTokenSilently({ ignoreCache: true }));

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

		console.log(result);

		return (appStateProvider.apiData = result);
	} catch (error) {
		console.error(error);
		alert(
			'Unable to access API or API is not configured correctly. See console for details.'
		);
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
	'/profile': () =>
		auth0?.requireAuth(() => showContent('content-profile'), '/profile'),
	'/login': () => login(),
};

export default async () => {
	window.onpopstate = onPopState;

	auth0 = new AuthClient();

	if (!(await auth0?.isAuthenticated())) {
		await auth0.handleAuth(true);
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
			url: apiUrl + '/api/public',
			btnId: 'public-api-btn',
		})
	);

	privateAPIButton.addEventListener('click', () =>
		callApi({
			auth0,
			url: apiUrl + '/api/private',
			btnId: 'private-api-btn',
		})
	);

	scopedAPIButton.addEventListener('click', () =>
		callApi({
			auth0,
			url: apiUrl + '/api/scoped',
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

	await auth0.handleAuth();

	return (appStateProvider.isLoading = false);
};
