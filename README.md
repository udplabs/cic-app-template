# Auth Rocks UI

This Glitch app is based on the [Auth0 SPA JS Login Quickstart](https://github.com/auth0-samples/auth0-javascript-samples/tree/master/01-Login) and the [Auth0 Calling an API Quickstart](https://github.com/auth0-samples/auth0-javascript-samples/tree/master/02-Calling-an-API).

It is part of the Auth Rocks developer workshop presented by [Okta](https://okta.com)

## Configuring the App

```json
{
	"domain": "{DOMAIN}",
	"clientId": "{CLIENT_ID}",
	"audience": "{API_AUDIENCE}"
}
```

### Challenge 1

1. Copy the {DOMAIN} and {CLIENT_ID} from the SPA app created in your tenant and paste in the **auth_config.json** file.

### Challenge 2

1. Copy the {API_AUDIENCE} from the API create in your tenant and paste in the **auth_config.json** file.

2. Copy the URL from the Glitch API app and paste in `var baseAPIUrl = "Enter Glitch API URL here";` (around line 291) in **index.html**

3. Uncomment `audience: config.audience` (around line 55) in **/public/js/app.js**.

---

### License

This project is licensed under the MIT license. See the [LICENSE](LICENSE.txt) file for more info.

### TODO

- [ ] `npm run build` does not currently work due to an issue with ViteJS and rollup. Need to investigate further! @eatplaysleep

### Changelog

#### 1.1 - 2022-08-30

- Authorization API call scope check added

#### 1.0 - 2022-08-25

- Authentication on refresh fixed
- UI cleaned up to properly display tokens and API responses

#### 0.9 - 2022-08-24

- API calls added
- Audience added to access token
- CORS added
- Private API call fixed

#### 0.8 - 2022-08-23

- Authentication to tenant
