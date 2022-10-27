export default class ApiError extends Error {
	constructor({ statusCode = 500, message = 'Internal Error', errorMessage, errorStack }) {
		super(message);

		this.statusCode = statusCode;
		this.message = message;
		this.details = errorMessage;
		this.errorStack = errorStack;
	}
}
