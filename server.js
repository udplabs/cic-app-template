import * as dotenv from 'dotenv';
import express from 'express';
import {} from '@okta/jwt-verifier';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import helmet from 'helmet';
import { expressjwt as jwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import jwtAuthz from 'express-jwt-authz';
import cors from 'cors';
import { existsSync } from 'fs';
import * as jose from 'node-jose';

if (existsSync('.env.local')) {
	dotenv.config({ path: `.env.local` });
} else {
	dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const {
	VITE_AUTH_DOMAIN: domain,
	VITE_AUTH_AUDIENCE: AUDIENCE = [],
	VITE_AUTH_PERMISSIONS: PERMISSIONS = [],
} = process.env;

const permissions = Array.isArray(PERMISSIONS)
	? PERMISSIONS
	: PERMISSIONS.split(' ');

const audience = Array.isArray(AUDIENCE) ? AUDIENCE : AUDIENCE.split(' ');

const jwksUri = `https://${domain}/.well-known/jwks.json`;

console.log({ audience, domain, permissions, jwksUri });

const issuer =
	domain.lastIndexOf('/') === domain.length - 1
		? 'https://' + domain
		: 'https://' + domain + '/';

const app = express();

app.use(cors({ origin: '*' }));
app.use(morgan('dev'));
app.use(helmet());
app.use(express.static(join(__dirname, 'public')));

const jwksRsaSecretOptions = {
	cache: true,
	rateLimit: true,
	jwksRequestsPerMinute: 5,
	jwksUri,
};

const expressJwtSecret = (options) => {
	const jwksClient = jwksRsa(options);

	const getSigningKeys = async () => {
		const keys = await jwksClient.getKeys();

		const keystore = await jose.JWK.asKeyStore({ keys });

		return keystore.all({ use: 'sig' }).map((k) => ({
			kid: k.kid,
			alg: k.alg,
			publicKey: k.toPEM(false),
			rsaPublicKey: k.toPEM(false),
			getPublicKey() {
				return k.toPEM(false);
			},
		}));
	};

	const getSecret = async (req, token) => {
		try {
			const { kid } = token?.header || {};

			const keys = await getSigningKeys();

			const key = keys.find((k) => k.kid === kid);

			return key.publicKey || key.rsaPublicKey;
		} catch (error) {
			console.log(error);

			return new Promise((resolve, reject) => {
				if (error) {
					reject(error);
				}

				resolve();
			});
		}
	};

	return getSecret;
};

const checkJwt = jwt({
	// secret: jwksRsa.expressJwtSecret(jwksRsaSecretOptions),
	secret: expressJwtSecret(jwksRsaSecretOptions),
	audience,
	issuer,
	algorithms: ['RS256'],
});

const checkPermissions = jwtAuthz(permissions, {
	customScopeKey: 'permissions',
	customUserKey: 'auth',
	failWithError: true,
});

app.get('/api/public', (req, res) =>
	res.json({
		success: true,
		message:
			'This is the Public API. Anyone can request this response. Hooray!',
	})
);

app.get('/api/private', checkJwt, (req, res) =>
	res.json({
		success: true,
		message:
			'This is the private API. Only special folk, indicated by the `audience` configuration, can access it. Awesome!',
	})
);

app.get('/api/scoped', checkJwt, checkPermissions, (req, res) =>
	res.json({
		success: true,
		message:
			'This is the scoped API. Only a valid access token with both the correct audience AND valid permissions has access. You did it!',
	})
);

app.use((err, req, res, next) => {
	if (err) {
		console.log(JSON.stringify(err, null, 2));
	}

	if (err?.response) {
		const { data, status } = err.response || {};
		res.status(status).json(data);
	} else if (err?.name === 'UnauthorizedError') {
		res.status(401).json({
			success: false,
			message:
				err?.inner?.message ||
				'Invalid Access Token. You shall not pass!',
		});
	} else if (err?.statusCode >= 400) {
		res.status(err.statusCode).json({
			success: false,
			message:
				err?.message ||
				'Insufficient authorization. You shall not pass!',
		});
	} else {
		next(err, req, res);
	}
});

export const handler = app;

// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
