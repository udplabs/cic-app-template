import * as jose from 'node-jose';
import { JwksClient as Auth0JwksClient } from 'jwks-rsa';

export default class JwksClient extends Auth0JwksClient {
	constructor(options) {
		super(options);
	}

	async retrieveSigningKeys(keys) {
		if (!keys) {
			throw new Error('keys must be provided to retrieve signing keys');
		}

		const keystore = await jose.JWK.asKeyStore({ keys });

		return keystore.all({ use: 'sig' }).map((k) => ({
			...k,
			kid: k.kid,
			alg: k.alg,
			get publicKey() {
				return k.toPEM(false);
			},
			get rsaPublicKey() {
				return k.toPEM(false);
			},
			getPublicKey() {
				return k.toPEM(false);
			},
		}));
	}

	async getSigningKeys() {
		const keys = await this.getKeys();

		if (!keys || !keys.length) {
			throw new Error('The JWKS endpoint did not contain any keys');
		}

		const signingKeys = await this.retrieveSigningKeys(keys);

		if (!signingKeys.length) {
			throw new Error('The JWKS endpoint did not contain any signing keys');
		}

		return signingKeys;
	}

	async getSigningKey(kid, cb) {
		const keys = await this.getSigningKeys();
		const hasCallback = cb && typeof cb === 'function';

		const kidDefined = kid !== undefined && kid !== null;

		if (!kidDefined && keys.length > 1) {
			const error = new Error('No KID specified and JWKS endpoint returned more than 1 key');

			if (hasCallback) {
				return cb(error, null);
			}

			throw error;
		}

		const key = keys.find((k) => k.kid === kid);

		let error = new Error(`Unable to find a signing key that matches'${kid}`);

		if (hasCallback) {
			return cb(key ? null : error, key || null);
		}

		if (key) {
			return key;
		} else {
			throw error;
		}
	}
}
