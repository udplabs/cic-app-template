import * as JWT from 'jsonwebtoken';
import axios from 'axios';
import { ok, doesNotMatch, match as doesMatch } from 'assert';
import ApiError from './apiError.js';
import { loadEnv } from '../server';

class ConfigurationValidationError extends Error {}

const findOktaDomainURL = 'https://bit.ly/finding-okta-domain';
const findAuth0Issuer = 'https://tinyurl.com/37th9n9h';
const findAppCredentialsURL = 'https://bit.ly/finding-okta-app-credentials';

/**
 * Performs various validations on the provided `issuer` value.
 *
 * @param {string} issuer
 * @param {TestingParams} testing
 */
const assertIssuer = (issuer, testing = {}) => {
	const isHttps = new RegExp('^https://');
	const copyMessage =
		'You can copy your domain from the management console ' +
		'Console. Follow these instructions to find it.' +
		'Okta Customer Identity Cloud (formerly Auth0): ' +
		findAuth0Issuer +
		'Okta Customer Identity Platform (formerly Okta CIAM): ' +
		findOktaDomainURL;

	if (testing.disableHttpsCheck) {
		const httpsWarning =
			'Warning: HTTPS check is disabled. ' +
			'This allows for insecure configurations and is NOT recommended for production use.';
		/* eslint-disable-next-line no-console */
		console.warn(httpsWarning);
	}

	console.log('asserting issuer:', issuer);

	ok(issuer, new ConfigurationValidationError('Your issuer URL is missing. ' + copyMessage));

	if (!testing.disableHttpsCheck) {
		doesMatch(
			issuer,
			isHttps,
			new ConfigurationValidationError(
				'Your Okta URL must start with https. ' + `Current value: ${issuer}. ${copyMessage}`
			)
		);
	}

	doesNotMatch(
		issuer,
		/{yourOktaDomain}/,
		new ConfigurationValidationError('Replace {yourOktaDomain} with your Okta domain. ' + copyMessage)
	);

	doesNotMatch(
		issuer,
		/-admin.(okta|oktapreview|okta-emea).com|manage./,
		new ConfigurationValidationError(
			'Your Okta domain should not contain `-admin` or `manage`. ' + `Current value: ${issuer}. ${copyMessage}`
		)
	);
};

/**
 *
 * Performs validation of a provided `clientId` value.
 *
 * @param {string} clientId The `clientId` to be verified
 */
const assertClientId = (clientId) => {
	const copyCredentialsMessage =
		'You can copy it from the Okta Developer Console ' +
		'in the details for the Application you created. ' +
		`Follow these instructions to find it: ${findAppCredentialsURL}`;

	console.log('asserting clientId:', clientId);

	ok(clientId, new ConfigurationValidationError('Your client ID is missing. ' + copyCredentialsMessage));
	doesNotMatch(
		clientId,
		/{clientId}/,
		new ConfigurationValidationError(
			'Replace {clientId} with the client ID of your Application. ' + copyCredentialsMessage
		)
	);
};

export default class JwtVerifier {
	algorithms = ['RS256'];
	constructor(options = {}) {
		// Assert configuration options exist and are well-formed (not necessarily correct!)
		assertIssuer(options?.issuer, options?.testing);

		if (options?.clientId) {
			assertClientId(options?.clientId);
		}

		this.claimsToAssert = options?.claimsToAssert || {};
		this.issuer = options?.issuer;
		this.url = process.env?.JWT_VERIFY_URL;

		if (!this.url) {
			loadEnv({ override: true });

			this.url = process.env?.JWT_VERIFY_URL;

			ok(this.url, 'Unable to load url for verifier function!');
		}
	}

	/**
	 * @param {string} tokenString
	 * @param {import('./verifyJwt.js').JwtVerifierOptions} options
	 * @returns
	 */
	async verifyToken(tokenString, options) {
		const {
			issuer = this?.issuer,
			algorithms = this?.algorithms,
			audience = this?.audience,
			sub = this?.sub,
			claimsToAssert = this?.claimsToAssert,
			clientId = this?.clientId,
			nonce = this?.nonce,
			...params
		} = options || {};

		const data = {
			issuer,
			algorithms,
			audience,
			claimsToAssert,
			sub,
			clientId,
			nonce,
			...params,
		};

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

		const reqOptions = {
			url: this.url,
			method: 'POST',
			headers: {
				Authorization: `Bearer ${tokenString}`,
			},
			data,
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
				throw new Error('No response from verification request. Please try again.');
			} else {
				if (error instanceof ApiError) {
					throw error;
				}

				throw new Error(error);
			}
		}
	}
}

/**
 * If set, checking for HTTPS in the sdk is disabled. Otherwise, an error is thrown if the `issuer` is not a secure URL.
 *
 * @typedef DisableHttpsCheckType
 * @type {boolean}
 */

/**
 * @typedef TestingParams
 * @type {object}
 * @property {DisableHttpsCheckType} testing.disableHttpsCheck
 */
