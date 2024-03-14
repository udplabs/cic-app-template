const defaultAuthConfig = {
	cacheLocation: 'localstorage',
	authorizationParams: {
		scope: 'openid profile email',
	},
};

const config = {
	auth: {
		...defaultAuthConfig,
		domain: '_DOMAIN_',
		clientId: '_CLIENTID_',
		// UNCOMMENT the following line to test the private API
		// audience: ['api://authrocks/'],
	},
	app: {
		enableSilentAuth: false,
		port: 3000,
	},
	server: {
		permissions: ['authRocks'],
	},
};

export default config;
