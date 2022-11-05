const defaultAuthConfig = {
	cacheLocation: 'localstorage',
};

const config = {
	auth: {
		...defaultAuthConfig,
		domain: 'atko-rocks-gentle-animal.demo-platform-staging.auth0app.com',
		client_id: 'RBz9va21UvCeuSTYT9nMoRTZah1iTnoH',
		// UNCOMMENT LINE 12 to test the private API
		// audience: ['api://authrocks'],
	},
	app: {
		port: 3000,
	},
};

export default config;
