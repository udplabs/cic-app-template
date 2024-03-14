import { Auth0Client } from '@auth0/auth0-spa-js';
import { appStateProvider, appState, authStateProvider, authState } from '.';
import { assert, getConfig, showContentFromUrl } from '../utils';
export class AuthClient extends Auth0Client {
	forceAuth = false;
	enableSilentAuth = false;
	newConfig = undefined;

	constructor(config) {
		const { hasChanged, config: _config, previousConfig } = getConfig();

		const {
			audience: _previousAudience,
			authorizationParams: _previousAuthParams,
			..._prevAuthConfig
		} = previousConfig?.auth || {};
		const { audience = _previousAudience, authorizationParams, ...authConfig } = _config?.auth || {};

		config = {
			..._prevAuthConfig,
			...authConfig,
			authorizationParams: {
				..._previousAuthParams,
				...authorizationParams,
				audience,
			},
		};

		try {
			assert(
				config?.domain && config.domain !== '_DOMAIN_',
				'A valid domain must be provided in the `config.js` file!'
			);
			assert(
				config?.clientId && config.clientId !== '_CLIENTID_',
				'A valid clientId must be provided in the `config.js` file!'
			);

			appStateProvider['isConfigured'] = true;
		} catch (error) {
			console.log(error);
			appStateProvider['isConfigured'] = false;
		}

		super(config);

		this.config = config;
		this.newConfig = { ...authConfig, ...config };

		this.enableSilentAuth = config?.app?.enableSilentAuth || this.enableSilentAuth;

		console.info('silentAuth Enabled:', this.enableSilentAuth);
		if (hasChanged) {
			console.log('config has changed! You may need to refresh your tokens.');
			// this.forceAuth = true;
		}
	}

	/**
	 *
	 * @param {string} targetUrl
	 * @returns {void}
	 */
	async login(targetUrl) {
		try {
			console.log('Logging in', targetUrl);

			console.log(JSON.stringify(this.config, null, 2));

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

	/**
	 * Forces the app to fetch new tokens rather than use the existing tokens from the cache.
	 *
	 * @param {boolean} [silent=false]
	 */
	async refreshTokens(silent = false) {
		if (!appState.isLoading && !silent) {
			appStateProvider.isLoading = true;
		}

		console.info('refreshing tokens...');
		const { accessToken } = await this.handleAuth(true, silent);

		if (appState.isLoading && !silent) {
			appStateProvider.isLoading = false;
		}

		return accessToken;
	}

	async getAccessToken(authOptions = {}, force = false) {
		console.info('getting accessToken...');

		if (!force) {
			authOptions = { cacheMode: 'cache-only', ...authOptions };
		}

		authStateProvider.accessToken = await this.getTokenSilently(authOptions);
	}

	async getProfile() {
		authStateProvider.user = await this.getUser();
	}

	async doAuth(authOptions, force = false) {
		try {
			console.log('doing authentication...');

			if (await this.isAuthenticated()) {
				await this.getAccessToken(authOptions, force);

				if (!authState?.accessToken) {
					console.log('Unable to obtain access token. Something went wrong.');
					return alert('Something went wrong attempting to fetch an access token. Please try again.');
				}

				await this.getProfile();

				return {
					accessToken: authState?.accessToken,
					user: authState?.user,
				};
			}
		} catch (error) {
			console.log(JSON.stringify(error, null, 2));
			if (['consent_required', 'login_required'].includes(error?.error)) {
				// force = true;
			}
			if (force) {
				try {
					return {
						accessToken: await this.getTokenWithPopup({
							...authOptions,
							cacheMode: 'off',
						}),
						user: await this.getProfile(),
					};
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

	async handleAuth(force = this.forceAuth, silent = false) {
		console.log('force:', force);
		appStateProvider.loadingTitle = this.enableSilentAuth && force && !silent ? 'Refreshing tokens.' : 'Hang tight!';
		appStateProvider.loadingMsg = 'Work faster monkeys!';

		if (!appState.isLoading && !silent) {
			appStateProvider.isLoading = true;
		}

		console.log(JSON.stringify(this.newConfig, null, 2));
		const authOptions = {
			cacheMode: force ? 'off' : 'on',
			authorizationParams: {
				audience:
					(force ? this.newConfig?.authorizationParams?.audience : this.config?.authorizationParams?.audience) ??
					undefined,
			},
		};

		// 1) check if URL contains redirect params & handle if it does
		await this.handleLoginRedirect();

		// 2) Check if user is authenticated. This effectively makes a userinfo call
		console.log('checking if authenticated...');
		authStateProvider.isAuthenticated = await this.isAuthenticated();
		let result = {};

		if (force) {
			result = await this.doAuth(authOptions, force);

			const title = document.querySelector('#content-title');

			if (title) {
				title.innerHTML = 'Tokens refreshed!';
			}

			if (!silent) {
				window.location.hash = '#content-lead';
				return result;
			}
		}

		if (!authState.isAuthenticated) {
			console.log('> User not authenticated');

			if (this.enableSilentAuth) {
				result = await this.doAuth(authOptions);
			}
		}

		console.log('auth result:', result);
		if (result?.accessToken) {
			authStateProvider.accessToken = result.accessToken;
		}

		if (result?.user) {
			authStateProvider.user = result.user;
		}

		if (authState.isAuthenticated && !force) {
			if (!authState?.accessToken && !result?.accessToken) {
				console.log('> Setting accessToken...');
				authState.accessToken = await this.getAccessToken();
			}

			if (!authState?.user && !result?.user) {
				console.log('> Setting profile data...');
				authState.user = await this.getProfile();
			}

			console.log('> User is authenticated');
		}
		return result;
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
