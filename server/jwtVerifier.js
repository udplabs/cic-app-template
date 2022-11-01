import * as JWT from 'jsonwebtoken';
import axios from 'axios';
import ApiError from './apiError';

class ConfigurationValidationError extends Error {}

const { JWT_VERIFY_URL: verifyUrl } = process.env;

const findDomainURL = 'https://bit.ly/finding-okta-domain';
const findAppCredentialsURL = 'https://bit.ly/finding-okta-app-credentials';

const assertIssuer = (issuer, testing = {}) => {
	const isHttps = new RegExp('^https://');
	const hasDomainAdmin = /-admin.(okta|oktapreview|okta-emea).com/;
	const copyMessage =
		'You can copy your domain from the Okta Developer ' +
		'Console. Follow these instructions to find it: ' +
		findDomainURL;

	if (testing.disableHttpsCheck) {
		const httpsWarning =
			'Warning: HTTPS check is disabled. ' +
			'This allows for insecure configurations and is NOT recommended for production use.';
		/* eslint-disable-next-line no-console */
		console.warn(httpsWarning);
	}

	if (!issuer) {
		throw new ConfigurationValidationError('Your Okta URL is missing. ' + copyMessage);
	} else if (!testing.disableHttpsCheck && !issuer.match(isHttps)) {
		throw new ConfigurationValidationError(
			'Your Okta URL must start with https. ' + `Current value: ${issuer}. ${copyMessage}`
		);
	} else if (issuer.match(/{yourOktaDomain}/)) {
		throw new ConfigurationValidationError('Replace {yourOktaDomain} with your Okta domain. ' + copyMessage);
	} else if (issuer.match(hasDomainAdmin)) {
		throw new ConfigurationValidationError(
			'Your Okta domain should not contain -admin. ' + `Current value: ${issuer}. ${copyMessage}`
		);
	}
};

const assertClientId = (clientId) => {
	const copyCredentialsMessage =
		'You can copy it from the Okta Developer Console ' +
		'in the details for the Application you created. ' +
		`Follow these instructions to find it: ${findAppCredentialsURL}`;

	if (!clientId) {
		throw new ConfigurationValidationError('Your client ID is missing. ' + copyCredentialsMessage);
	} else if (clientId.match(/{clientId}/)) {
		throw new ConfigurationValidationError(
			'Replace {clientId} with the client ID of your Application. ' + copyCredentialsMessage
		);
	}
};

export default class JwtVerifier {
	algorithms = ['RS256'];
	constructor(options = {}) {
		// Assert configuration options exist and are well-formed (not necessarily correct!)
		assertIssuer(options?.issuer, options?.testing);
		if (options?.clientId) {
			assertClientId(options.clientId);
		}

		this.claimsToAssert = options?.claimsToAssert || {};
		this.issuer = options?.issuer;
	}

	async verifyToken(
		tokenString,
		{
			issuer = this?.issuer,
			algorithms = this?.algorithms,
			audience = this?.audience,
			sub = this?.sub,
			claimsToAssert = this?.claimsToAssert,
			clientId = this?.clientId,
			nonce = this?.nonce,
			...options
		}
	) {
		// jsonwebtoken verifies:
		// - signature
		// - expiration
		// - audience (if provided)
		// - issuer (if provided)
		// - clientId (if provided)
		// - nonce (if provided)
		// We require RS256 by default.
		// Remaining to verify:
		// - any custom claims passed in

		options = {
			issuer,
			algorithms,
			audience,
			claimsToAssert,
			sub,
			clientId,
			nonce,
		};

		console.log(options);

		const reqOptions = {
			url: verifyUrl,
			method: 'POST',
			headers: {
				Authorization: `Bearer ${tokenString}`,
			},
			data: options,
		};

		const jwt = JWT.decode(tokenString);

		try {
			// do the verification
			await axios(reqOptions);

			return jwt;
		} catch (error) {
			if (error?.response) {
				// The request was made and the server responded with a status code
				// that falls out of the range of 2xx
				throw new ApiError({ ...error.response?.data, statusCode: error.response?.status, message: 'Unauthorized' });
			} else if (error?.request) {
				// The request was made but no response was received
				// `error.request` is an instance of `XMLHttpRequest` in the
				// browser and an instance of `http:ClientRequest` in node.js
				console.log({ request: error.request });
				throw new Error('No response from verification request');
			} else {
				if (error instanceof ApiError) {
					throw error;
				}

				throw new Error(error);
			}
		}
	}
}
