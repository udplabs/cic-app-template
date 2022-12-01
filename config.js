const defaultAuthConfig = {
	cacheLocation: 'localstorage',
};

const config = {
	auth: {
		...defaultAuthConfig,
		domain: '_DOMAIN_',
		clientId: '_CLIENTID_',
		// UNCOMMENT LINE 12 to test the private API
		// audience: ['authRocks'],
	},
	app: {
		port: 3000,
	},
	server: {
		permissions: ['authRocks'],
	},
};

export default config;
