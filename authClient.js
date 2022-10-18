import { Auth0Client } from '@auth0/auth0-spa-js';
import appStateProvider, { appState } from './appState';
import authStateProvider, { authState } from './authState';
import { assert, showContentFromUrl } from './utils';

const {
	VITE_AUTH_DOMAIN: domain,
	VITE_AUTH_CLIENT_ID: client_id,
	VITE_AUTH_AUDIENCE: audience,
	VITE_AUTH_CACHE_LOCATION: cacheLocation = 'localstorage',
	VITE_AUTH_USE_REFRESH_TOKENS: useRefreshTokens = true,
} = import.meta.env;

export default class AuthClient extends Auth0Client {
	constructor(config) {
		const _config = {
			domain,
			client_id,
			audience,
			cacheLocation,
			useRefreshTokens,
			...config,
		};

		assert(
			_config?.domain,
			'A domain must be provided in the `config.json` file!'
		);
		assert(
			_config?.client_id,
			'A clientId must be provided in the `config.json` file!'
		);

		super(_config);
	}

	async login(targetUrl) {
		try {
			console.log('Logging in', targetUrl);

			const options = {
				redirect_uri: window.location.origin,
			};

			if (targetUrl) {
				options.appState = { targetUrl };
			}

			return await this.loginWithRedirect(options);
		} catch (err) {
			console.log('Log in failed', err);

			alert(`Something went wrong with login.\n\n${err}`);
		}
	}

	signout() {
		try {
			console.log('Logging out');

			return this.logout({
				returnTo: window.location.origin,
			});
		} catch (error) {
			return console.log('Log out failed', error);
		}
	}

	async refreshTokens() {
		if (!appState.isLoading) {
			appStateProvider.isLoading = true;
		}

		return this.handleAuth(true).then(
			() => (appStateProvider.isLoading = false)
		);
	}

	async doAuth(authOptions) {
		try {
			authStateProvider.accessToken = await this.getTokenSilently(
				authOptions
			);
		} catch (error) {
			if (error.error === 'login_required') {
				console.log(error.error);
				authStateProvider.accessToken = await this.getTokenWithPopup({
					ignoreCache: true,
				});
			}
		}

		if (!authState?.accessToken) {
			console.log('Unable to obtain access token. Something went wrong.');
			return alert(
				'Something went wrong attempting to fetch an access token. Please try again.'
			);
		}

		authStateProvider.user = await this.getUser();

		return { accessToken: authState?.accessToken, user: authState?.user };
	}

	async handleAuth(force = false) {
		appStateProvider.loadingTitle = force
			? 'Refreshing tokens.'
			: 'Hang tight!';
		appStateProvider.loadingMsg = 'Work faster monkeys!';

		if (!appState.isLoading) {
			appStateProvider.isLoading = true;
		}

		const authOptions = {
			ignoreCache: force,
			useRefreshTokensFallback: !force,
		};

		// 1) check if URL contains redirect params & handle if it does
		await this.handleLoginRedirect();

		// 2) Check if user is authenticated. This effectively makes a userinfo call
		authStateProvider.isAuthenticated = await this.isAuthenticated();

		if (!authState.isAuthenticated && !force) {
			console.log('> User not authenticated');
		}

		if (force || authState.isAuthenticated) {
			await this.doAuth(authOptions);
		}

		if (force) {
			const title = document.querySelector('#content-title');

			if (title) {
				title.innerHTML = 'Tokens refreshed!';
			}

			return (window.location.hash = '#content-lead');
		}

		return console.log('> User is authenticated');
	}

	async handleLoginRedirect() {
		const query = new URLSearchParams(window.location.href);

		const shouldParseResult =
			query.has('code') || query.has('state') || query.has('error');

		if (shouldParseResult) {
			console.log('> Parsing redirect');
			try {
				const result = await this.handleRedirectCallback();

				if (result?.appState?.targetUrl) {
					showContentFromUrl(result.appState.targetUrl);
				}
				console.log('handleRedirectResult:', result);

				authStateProvider.isAuthenticated = true;

				console.log('Logged in!');
			} catch (error) {
				console.log('Error parsing redirect:', error);
				alert('Unable to login. Check console for details.');
			}

			window.history.replaceState({}, document.title, '/');
		}

		return;
	}

	/**
	 * Checks to see if the user is authenticated. If so, `fn` is executed. Otherwise, the user
	 * is prompted to log in
	 * @param {*} fn The function to execute if the user is logged in
	 */
	async requireAuth(fn, targetUrl) {
		const isAuthenticated = await this.isAuthenticated();

		if (isAuthenticated) {
			return fn();
		}

		return this.login(targetUrl);
	}
}
