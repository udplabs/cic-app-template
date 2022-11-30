const defaultAuthConfig = {
	cacheLocation: 'localstorage',
};

const config = {
	auth: {
		...defaultAuthConfig,
		domain: '_DOMAIN_',
		client_id: '_CLIENTID_',
		// UNCOMMENT LINE 12 to test the private API
		audience: ['_AUDIENCE_'],
	},
	app: {
		port: 3000,
	},
};

export default config;
