/**
 * Ошибки OData клиента
 */

export class ODataClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'ODataClientError';
    Object.setPrototypeOf(this, ODataClientError.prototype);
  }
}

export class ODataTimeoutError extends ODataClientError {
  constructor(message: string = 'OData request timeout') {
    super(message, 408);
    this.name = 'ODataTimeoutError';
    Object.setPrototypeOf(this, ODataTimeoutError.prototype);
  }
}

export class ODataAuthenticationError extends ODataClientError {
  constructor(message: string = 'OData authentication failed') {
    super(message, 401);
    this.name = 'ODataAuthenticationError';
    Object.setPrototypeOf(this, ODataAuthenticationError.prototype);
  }
}

export class ODataNotFoundError extends ODataClientError {
  constructor(message: string = 'OData resource not found') {
    super(message, 404);
    this.name = 'ODataNotFoundError';
    Object.setPrototypeOf(this, ODataNotFoundError.prototype);
  }
}

export class ODataServerError extends ODataClientError {
  constructor(
    message: string = 'OData server error',
    statusCode: number = 500,
    response?: unknown
  ) {
    super(message, statusCode, response);
    this.name = 'ODataServerError';
    Object.setPrototypeOf(this, ODataServerError.prototype);
  }
}

export class ODataRetryExhaustedError extends ODataClientError {
  constructor(
    message: string = 'OData retry attempts exhausted',
    public readonly lastError?: Error
  ) {
    super(message);
    this.name = 'ODataRetryExhaustedError';
    Object.setPrototypeOf(this, ODataRetryExhaustedError.prototype);
  }
}


