import * as dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import { verifyJwt } from './verifyJwt.js';
import getAudience from './getAudience.js';
import config from '../config.js';

export const loadEnv = (options) => {
	if (existsSync('.env.local')) {
		dotenv.config({ path: `.env.local`, ...options });
	}

	dotenv.config(options);
};

loadEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { auth, server } = config || {};

const {
	SERVER_AUDIENCE: audience = server?.audience ??
		auth?.audience ??
		auth?.authorizationParams?.audience ??
		'api://authrocks/',
	SERVER_AUTH_PERMISSIONS: AUTH_PERMISSIONS = server?.permissions || ['authRocks'],
} = process.env;

const permissions = Array.isArray(AUTH_PERMISSIONS) ? AUTH_PERMISSIONS : AUTH_PERMISSIONS.split(' ');

const app = express();

app.use(cors({ origin: '*' }));
app.use(morgan('dev'));
app.use(helmet());
app.use(express.static(join(__dirname, 'public')));

app.get('/api/public', (req, res) => {
	res.json({
		success: true,
		message: 'This is the Public API. Anyone can request this response. Hooray!',
	});
});

app.get('/api/private', verifyJwt({ audience: getAudience(audience) }), (req, res) =>
	res.json({
		success: true,
		message:
			'This is the private API. Only special folk, indicated by the `audience` configuration, can access it. Awesome!',
	})
);

app.get('/api/scoped', verifyJwt({ claimsToAssert: { 'permissions.includes': permissions } }), (req, res) =>
	res.json({
		success: true,
		message:
			'This is the scoped API. Only a valid access token with both the correct audience AND valid permissions has access. You did it!',
	})
);

// app.all('*', (req, res) => res.json({ success: true, message: 'This is the home route for this API server!' }))

export const handler = app;
