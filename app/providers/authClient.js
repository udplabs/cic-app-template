import { Auth0Client } from '@auth0/auth0-spa-js';
import { appStateProvider, appState, authStateProvider, authState } from '.';
import { assert, getConfig, showContentFromUrl } from '../utils';
export class AuthClient extends Auth0Client {
	forceAuth = false;
	constructor(config) {
		const { hasChanged, config: _config } = getConfig();

		const { auth: authConfig } = _config;

		config = {
			...authConfig,
			..._config,
		};

		assert(config?.domain && config.domain !== '_DOMAIN_', 'A valid domain must be provided in the `config.js` file!');
		assert(
			config?.clientId && config.clientId !== '_CLIENTID_',
			'A valid clientId must be provided in the `config.js` file!'
		);

		super(config);

		if (hasChanged) {
			this.forceAuth = true;
		}

		this.config = config;
	}

	async login(targetUrl) {
		try {
			console.log('Logging in', targetUrl);

			const options = {
				authorizationParams: {
					redirect_uri: window.location.origin,
				},
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
				logoutParams: {
					returnTo: window.location.origin,
				},
			});
		} catch (error) {
			return console.log('Log out failed', error);
		}
	}

	async refreshTokens() {
		if (!appState.isLoading) {
			appStateProvider.isLoading = true;
		}

		return this.handleAuth(true).then(() => (appStateProvider.isLoading = false));
	}

	async doAuth(authOptions, force = false) {
		try {
			console.log('doing authentication...');

			if (await this.isAuthenticated()) {
				authStateProvider.accessToken = await this.getTokenSilently(authOptions);

				if (!authState?.accessToken) {
					console.log('Unable to obtain access token. Something went wrong.');
					return alert('Something went wrong attempting to fetch an access token. Please try again.');
				}

				authStateProvider.user = await this.getUser();

				return {
					accessToken: authState?.accessToken,
					user: authState?.user,
				};
			}
		} catch (error) {
			console.log(JSON.stringify(error, null, 2));
			if (['consent_required', 'login_required'].includes(error?.error)) {
				force = true;
			}
			if (force) {
				try {
					authStateProvider.accessToken = await this.getTokenWithPopup({
						...authOptions,
						cacheMode: 'off',
					});
				} catch (error) {
					if (error?.error !== 'cancelled') {
						throw new Error(error);
					} else {
						console.info('User cancelled login.');
					}
				}
			}
		}
	}

	async handleAuth(force = this.forceAuth) {
		console.log('force:', force);
		appStateProvider.loadingTitle = force ? 'Refreshing tokens.' : 'Hang tight!';
		appStateProvider.loadingMsg = 'Work faster monkeys!';

		if (!appState.isLoading) {
			appStateProvider.isLoading = true;
		}

		const authOptions = {
			cacheMode: force ? 'off' : 'on',
			authorizationParams: {
				audience: this.config?.audience || undefined,
			},
		};

		console.log({ authOptions });

		// 1) check if URL contains redirect params & handle if it does
		await this.handleLoginRedirect();

		// 2) Check if user is authenticated. This effectively makes a userinfo call
		authStateProvider.isAuthenticated = await this.isAuthenticated();

		if (force) {
			await this.doAuth(authOptions, force);

			const title = document.querySelector('#content-title');

			if (title) {
				title.innerHTML = 'Tokens refreshed!';
			}

			return (window.location.hash = '#content-lead');
		}

		if (!authState.isAuthenticated || (authState.isAuthenticated && !authState.accessToken)) {
			console.log('> User not authenticated');

			await this.doAuth(authOptions);
		}

		if (authState.isAuthenticated) {
			return console.log('> User is authenticated');
		}
	}

	async handleLoginRedirect() {
		const query = new URLSearchParams(window.location.href);

		const shouldParseResult = query.has('code') || query.has('state') || query.has('error');

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
