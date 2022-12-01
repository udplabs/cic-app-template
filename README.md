# auth.rocks 101 Starter App

This App is based on the [Auth0 SPA JS Login Quickstart](https://github.com/auth0-samples/auth0-javascript-samples/tree/master/01-Login) and the [Auth0 Calling an API Quickstart](https://github.com/auth0-samples/auth0-javascript-samples/tree/master/02-Calling-an-API). To make thing easier, the lab combines the two and utilizes a [proxy provider](https://www.javascripttutorial.net/es6/javascript-proxy/) for state management.

It is part of the Auth Rocks developer workshop presented by [Okta](https://okta.com)

<!-- [![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://101.auth.rocks) -->

## Configuring the App

### Challenge 1

1. In your tenant's application settings, be sure eto set `https://*.local-credentialless.webcontainer.io` in the following configurations:
   - `Allowed Callback URL`
   - `Allowed Web Origin`
   - `Allowed Origins (CORS)`
2. Open the `config.js` file.
3. If the `domain` and `clientId` are not already set, copy the appropriate values from the SPA app created in your tenant.

```javascript
/*
 * config.js
 */
const config = {
	auth: {
		...defaultAuthConfig,
		domain: 'atko-rocks-gentle-animal.demo-platform-staging.auth0app.com',
		clientId: 'RBz9va21UvCeuSTYT9nMoRTZah1iTnoH',
	},
	app: {
		port: 3000,
	},
};
```

### Challenge 2

1. If you opted to set your API `audience` value to something other than as instructed, copy the `audience` value from the `Identifier` field found on the API you created in your tenant and paste it into the `config.js` file.

```javascript
/*
 * config.js
 */
const config = {
	auth: {
		...defaultAuthConfig,
		domain: 'atko-rocks-gentle-animal.demo-platform-staging.auth0app.com',
		clientId: 'RBz9va21UvCeuSTYT9nMoRTZah1iTnoH',
		/* UNCOMMENT this line ( ⌘ + / or CTRL + / ) to test the private API */
		// audience: ['api://authrocks'],
	},
	app: {
		port: 3000,
	},
};
```

3. Uncomment line `11` of `config.js` to test the private api.

<br/>

---

<br/>

### LICENSE

This project is licensed under the MIT license. See the [LICENSE](LICENSE.txt) file for more info.
<br/>
<br/>

---
