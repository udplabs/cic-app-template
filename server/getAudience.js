const { SERVER_AUDIENCE: AUDIENCE = [] } = process.env;

/**
 * Fetches the `audience` value from configuration (if not provided) and parses it appropriately to avoid user input errors.
 * @param {string | string[] | []} audience
 * @returns {string[] | []}
 */
export default (audience = AUDIENCE) =>
	Array.isArray(audience) ? audience : audience?.includes(', ') ? audience?.split(', ') : audience?.split(',');
