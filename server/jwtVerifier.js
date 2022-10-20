import * as JWT from 'jsonwebtoken';
import JwksClient from './jwksClient';

class ConfigurationValidationError extends Error {}

const findDomainURL = 'https://bit.ly/finding-okta-domain';
const findAppCredentialsURL = 'https://bit.ly/finding-okta-app-credentials';
const njwtTokenBodyMethods = [
	'setClaim',
	'setJti',
	'setSubject',
	'setIssuer',
	'setIssuedAt',
	'setExpiration',
	'setNotBefore',
	'isExpired',
	'isNotBefore',
];

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
		throw new ConfigurationValidationError(
			'Your Okta URL is missing. ' + copyMessage
		);
	} else if (!testing.disableHttpsCheck && !issuer.match(isHttps)) {
		throw new ConfigurationValidationError(
			'Your Okta URL must start with https. ' +
				`Current value: ${issuer}. ${copyMessage}`
		);
	} else if (issuer.match(/{yourOktaDomain}/)) {
		throw new ConfigurationValidationError(
			'Replace {yourOktaDomain} with your Okta domain. ' + copyMessage
		);
	} else if (issuer.match(hasDomainAdmin)) {
		throw new ConfigurationValidationError(
			'Your Okta domain should not contain -admin. ' +
				`Current value: ${issuer}. ${copyMessage}`
		);
	}
};

const assertClientId = (clientId) => {
	const copyCredentialsMessage =
		'You can copy it from the Okta Developer Console ' +
		'in the details for the Application you created. ' +
		`Follow these instructions to find it: ${findAppCredentialsURL}`;

	if (!clientId) {
		throw new ConfigurationValidationError(
			'Your client ID is missing. ' + copyCredentialsMessage
		);
	} else if (clientId.match(/{clientId}/)) {
		throw new ConfigurationValidationError(
			'Replace {clientId} with the client ID of your Application. ' +
				copyCredentialsMessage
		);
	}
};

class AssertedClaimsVerifier {
	constructor() {
		this.errors = [];
	}

	extractOperator(claim) {
		const idx = claim.indexOf('.');
		if (idx >= 0) {
			return claim.substring(idx + 1);
		}
		return undefined;
	}

	extractClaim(claim) {
		const idx = claim.indexOf('.');
		if (idx >= 0) {
			return claim.substring(0, idx);
		}
		return claim;
	}

	isValidOperator(operator) {
		// may support more operators in the future
		return !operator || operator === 'includes';
	}

	checkAssertions(op, claim, expectedValue, actualValue) {
		if (!op && actualValue !== expectedValue) {
			this.errors.push(
				`claim '${claim}' value '${actualValue}' does not match expected value '${expectedValue}'`
			);
		} else if (op === 'includes' && Array.isArray(expectedValue)) {
			expectedValue.forEach((value) => {
				if (!actualValue || !actualValue.includes(value)) {
					this.errors.push(
						`claim '${claim}' value '${actualValue}' does not include expected value '${value}'`
					);
				}
			});
		} else if (
			op === 'includes' &&
			(!actualValue || !actualValue.includes(expectedValue))
		) {
			this.errors.push(
				`claim '${claim}' value '${actualValue}' does not include expected value '${expectedValue}'`
			);
		}
	}
}

function verifyAssertedClaims(verifier, claims) {
	const assertedClaimsVerifier = new AssertedClaimsVerifier();
	for (const [claimName, expectedValue] of Object.entries(
		verifier.claimsToAssert
	)) {
		const operator = assertedClaimsVerifier.extractOperator(claimName);
		if (!assertedClaimsVerifier.isValidOperator(operator)) {
			throw new Error(
				`operator: '${operator}' invalid. Supported operators: 'includes'.`
			);
		}
		const claim = assertedClaimsVerifier.extractClaim(claimName);
		const actualValue = claims[claim];
		assertedClaimsVerifier.checkAssertions(
			operator,
			claim,
			expectedValue,
			actualValue
		);
	}
	if (assertedClaimsVerifier.errors.length) {
		throw new Error(assertedClaimsVerifier.errors.join(', '));
	}
}
function getJwksUri(options) {
	return options.jwksUri ? options.jwksUri : options.issuer + '/v1/keys';
}

export default class JwtVerifier {
	algorithms = ['RS256'];
	constructor(options = {}) {
		// Assert configuration options exist and are well-formed (not necessarily correct!)
		assertIssuer(options?.issuer, options?.testing);
		if (options?.clientId) {
			assertClientId(options.clientId);
		}

		this.claimsToAssert = options?.assertClaims || {};
		this.issuer = options?.issuer;

		this.jwksUri = getJwksUri(options);

		this.jwksClient = new JwksClient({
			jwksUri: this.jwksUri,
			cache: true,
			cacheMaxAge: options.cacheMaxAge || 60 * 60 * 1000,
			cacheMaxEntries: 3,
			jwksRequestsPerMinute: options.jwksRequestsPerMinute || 10,
			rateLimit: true,
			requestAgentOptions: options.requestAgentOptions,
		});
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

		// decode the JWT to get the kid
		const { header, payload } = JWT.decode(tokenString, {
			complete: true,
		});

		options = {
			issuer,
			algorithms,
			audience,
			sub,
			clientId,
			nonce,
		};

		// get the signing key
		const { publicKey, rsaPublicKey } = await this.jwksClient.getSigningKey(
			header?.kid
		);

		// do the verification
		const jwt = JWT.verify(tokenString, publicKey || rsaPublicKey, options);

		verifyAssertedClaims(this, jwt);

		return jwt;
	}
}
