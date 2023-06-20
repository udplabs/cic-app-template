const { SERVER_AUDIENCE: AUDIENCE = [] } = process.env;

/**
 * Fetches the `audience` value from configuration (if not provided) and parses it appropriately to avoid user input errors.
 * @param {string | string[]} audience
 * @returns {string[]}
 */
export const getAudience = (audience = AUDIENCE) => {
	if (!Array.isArray(audience)) {
		audience = [audience];
	}

	audience = audience?.includes(', ') ? audience?.split(', ') : audience?.split(',');

	return audience;
};
