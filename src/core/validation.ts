import { RedditMcpError, ErrorCode } from "./errors.js";

const SUBREDDIT_RE = /^[A-Za-z0-9]\w{1,20}$/;
const MAX_LIMIT = 100;
const MAX_QUERY_LENGTH = 256;

export function validateSubreddit(value: string): string {
  const trimmed = value.trim();
  if (!SUBREDDIT_RE.test(trimmed)) {
    throw new RedditMcpError(
      ErrorCode.INVALID_PARAMS,
      `Invalid subreddit name: "${trimmed}". Must be 2-21 alphanumeric/underscore characters.`,
    );
  }
  return trimmed;
}

export function validateLimit(value: number | undefined, defaultLimit = 25): number {
  if (value === undefined) return defaultLimit;
  const n = Math.floor(value);
  if (n < 1 || n > MAX_LIMIT) {
    throw new RedditMcpError(
      ErrorCode.INVALID_PARAMS,
      `Limit must be between 1 and ${MAX_LIMIT}, got ${value}`,
    );
  }
  return n;
}

export function validateQuery(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new RedditMcpError(ErrorCode.INVALID_PARAMS, "Search query must not be empty");
  }
  if (trimmed.length > MAX_QUERY_LENGTH) {
    throw new RedditMcpError(
      ErrorCode.INVALID_PARAMS,
      `Search query too long (max ${MAX_QUERY_LENGTH} chars)`,
    );
  }
  return trimmed;
}

export const VALID_SORT = ["hot", "top", "new", "rising"] as const;
export type SortOption = (typeof VALID_SORT)[number];

export function validateSort(value: string | undefined, defaultSort: SortOption = "hot"): SortOption {
  if (!value) return defaultSort;
  const lower = value.toLowerCase() as SortOption;
  if (!VALID_SORT.includes(lower)) {
    throw new RedditMcpError(
      ErrorCode.INVALID_PARAMS,
      `Invalid sort: "${value}". Must be one of: ${VALID_SORT.join(", ")}`,
    );
  }
  return lower;
}

export const VALID_TIME_FILTER = ["hour", "day", "week", "month", "year", "all"] as const;
export type TimeFilter = (typeof VALID_TIME_FILTER)[number];

export function validateTimeFilter(value: string | undefined, defaultFilter: TimeFilter = "all"): TimeFilter {
  if (!value) return defaultFilter;
  const lower = value.toLowerCase() as TimeFilter;
  if (!VALID_TIME_FILTER.includes(lower)) {
    throw new RedditMcpError(
      ErrorCode.INVALID_PARAMS,
      `Invalid time filter: "${value}". Must be one of: ${VALID_TIME_FILTER.join(", ")}`,
    );
  }
  return lower;
}
