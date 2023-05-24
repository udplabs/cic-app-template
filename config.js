const defaultAuthConfig = {
	cacheLocation: 'localstorage',
};

const config = {
	auth: {
		...defaultAuthConfig,
		domain: '_DOMAIN_',
		clientId: '_CLIENTID_',
		// domain: 'auth-rocks-abrasive-lizard.cic-demo-platform.auth0app.com',
		// clientId: 'S5yKrYw8iK1yWcZTA4Im0RAlvHcrZ4A5',
		// UNCOMMENT the following line to test the private API
		// audience: ['authRocks'],
	},
	app: {
		port: 3000,
	},
	server: {
		host: 'https://cicapitemplate-bbo1--3000--fc9e1a28.local-credentialless.webcontainer.io',
		permissions: ['authRocks'],
	},
};

export default config;
