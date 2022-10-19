import OktaJwtVerifier from '@okta/jwt-verifier';

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

function intersect(a, b) {
	return a.filter(Set.prototype.has, new Set(b)) || [];
}

function verifyAudience(expected, aud) {
	if (!expected) {
		throw new Error('expected audience is required');
	}

	aud = Array.isArray(aud) ? aud : aud.split(',');
	expected = Array.isArray(expected)
		? expected
		: expected.includes(', ')
		? expected.split(', ')
		: expected.split(',');

	if (intersect(expected, aud).length !== expected.length) {
		throw new Error(
			`audience claim ${aud} does not match one of the expected audiences: ${expected}}`
		);
	}
}

function verifyIssuer(expected, issuer) {
	if (issuer !== expected) {
		throw new Error(
			`issuer ${issuer} does not match expected issuer: ${expected}`
		);
	}
}

export default class JwtVerifier extends OktaJwtVerifier {
	constructor(options = {}) {
		super(options);
	}

	async verifyAccessToken(accessTokenString, expectedAudience) {
		// njwt verifies expiration and signature.
		// We require RS256 in the base verifier.
		// Remaining to verify:
		// - audience claim
		// - issuer claim
		// - any custom claims passed in

		const jwt = await this.verifyAsPromise(accessTokenString);
		verifyAudience(expectedAudience, jwt.claims.aud);
		verifyIssuer(this.issuer, jwt.claims.iss);
		verifyAssertedClaims(this, jwt.claims);

		return jwt;
	}
}
