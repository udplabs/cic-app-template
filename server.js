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

const checkJwt = jwt({
	secret: jwksRsa.expressJwtSecret(jwksRsaSecretOptions),
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
