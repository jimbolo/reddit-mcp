// Normalized error codes for MCP responses
export enum ErrorCode {
  SUBREDDIT_NOT_FOUND = "SUBREDDIT_NOT_FOUND",
  SUBREDDIT_PRIVATE = "SUBREDDIT_PRIVATE",
  SUBREDDIT_BANNED = "SUBREDDIT_BANNED",
  INVALID_PARAMS = "INVALID_PARAMS",
  RATE_LIMITED = "RATE_LIMITED",
  UPSTREAM_ERROR = "UPSTREAM_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
}

export class RedditMcpError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "RedditMcpError";
  }
}

export function mapHttpError(status: number, url: string): RedditMcpError {
  switch (status) {
    case 403:
      return new RedditMcpError(ErrorCode.SUBREDDIT_PRIVATE, `Access denied: ${url}`);
    case 404:
      return new RedditMcpError(ErrorCode.SUBREDDIT_NOT_FOUND, `Not found: ${url}`);
    case 429:
      return new RedditMcpError(ErrorCode.RATE_LIMITED, "Reddit rate limit exceeded", true);
    default:
      if (status >= 500) {
        return new RedditMcpError(ErrorCode.UPSTREAM_ERROR, `Reddit returned ${status}`, true);
      }
      return new RedditMcpError(ErrorCode.UPSTREAM_ERROR, `Unexpected status ${status} from ${url}`);
  }
}
