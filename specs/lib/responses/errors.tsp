namespace Responses.Error;

@error
model Error {
  @example(400)
  status: int32;

  /** Human-readable error message */
  @example("Error")
  message: string;

  /** List of errors */
  errors: Array<unknown>;
}

alias Unauthorized = Error & Http.UnauthorizedResponse;
alias NotFound = Error & Http.NotFoundResponse;
