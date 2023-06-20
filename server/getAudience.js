const { SERVER_AUDIENCE: AUDIENCE = server?.audience || auth?.audience } = process.env;

/**
 * Fetches the `audience` value from configuration and parses it appropriately to avoid user input errors.
 *
 * @returns {string[]}
 */
export const getAudience = () =>
	Array.isArray(AUDIENCE) ? AUDIENCE : AUDIENCE?.includes(', ') ? AUDIENCE?.split(', ') : AUDIENCE?.split(',');
