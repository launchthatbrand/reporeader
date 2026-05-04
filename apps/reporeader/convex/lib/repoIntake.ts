export type RepoIntakeErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_HOST"
  | "UNSUPPORTED_FORMAT"
  | "UNSUPPORTED_PRIVATE_REPO"
  | "GITHUB_NOT_FOUND"
  | "GITHUB_RATE_LIMITED"
  | "GITHUB_REQUEST_FAILED";

export class RepoIntakeError extends Error {
  code: RepoIntakeErrorCode;
  recoverable: boolean;
  statusCode?: number;

  constructor(args: {
    code: RepoIntakeErrorCode;
    message: string;
    recoverable?: boolean;
    statusCode?: number;
  }) {
    super(args.message);
    this.name = "RepoIntakeError";
    this.code = args.code;
    this.recoverable = args.recoverable ?? false;
    this.statusCode = args.statusCode;
  }
}

export interface NormalizedGitHubRepoInput {
  sourceUrl: string;
  normalizedUrl: string;
  owner: string;
  repo: string;
  fullName: string;
}

const normalizePathSegment = (value: string) => value.trim().toLowerCase();

const parseSshStyleRepo = (value: string): NormalizedGitHubRepoInput | null => {
  const sshRepoRegex =
    /^git@github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/i;
  const match = sshRepoRegex.exec(value.trim());
  if (!match) return null;
  const ownerSegment = match[1];
  const repoSegment = match[2];
  if (!ownerSegment || !repoSegment) return null;
  const owner = normalizePathSegment(ownerSegment);
  const repo = normalizePathSegment(repoSegment);
  if (!owner || !repo) return null;
  return {
    sourceUrl: value.trim(),
    normalizedUrl: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
    fullName: `${owner}/${repo}`,
  };
};

export const normalizeGitHubRepoUrl = (
  rawValue: string,
): NormalizedGitHubRepoInput => {
  const sourceUrl = rawValue.trim();
  if (!sourceUrl) {
    throw new RepoIntakeError({
      code: "INVALID_URL",
      message: "Repository URL is required.",
    });
  }

  const sshStyle = parseSshStyleRepo(sourceUrl);
  if (sshStyle) return sshStyle;

  const withProtocol = /^https?:\/\//i.test(sourceUrl)
    ? sourceUrl
    : `https://${sourceUrl}`;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(withProtocol);
  } catch {
    throw new RepoIntakeError({
      code: "INVALID_URL",
      message: "Unable to parse repository URL.",
    });
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname !== "github.com" && hostname !== "www.github.com") {
    throw new RepoIntakeError({
      code: "UNSUPPORTED_HOST",
      message: "Only github.com repository URLs are supported.",
    });
  }

  const segments = parsedUrl.pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length < 2) {
    throw new RepoIntakeError({
      code: "UNSUPPORTED_FORMAT",
      message: "Expected URL format: https://github.com/{owner}/{repo}",
    });
  }

  const owner = normalizePathSegment(segments[0] ?? "");
  const rawRepo = segments[1] ?? "";
  const repo = normalizePathSegment(rawRepo.replace(/\.git$/i, ""));

  if (!owner || !repo) {
    throw new RepoIntakeError({
      code: "UNSUPPORTED_FORMAT",
      message: "URL must include both repository owner and name.",
    });
  }

  return {
    sourceUrl,
    normalizedUrl: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
    fullName: `${owner}/${repo}`,
  };
};

export const buildRepoIngestionIdempotencyKey = (normalizedUrl: string) =>
  `repo-intake:${normalizedUrl.toLowerCase()}`;

export const classifyGithubRequestError = (args: {
  statusCode: number;
  body: string;
  hasRateLimitRemainingHeader: boolean;
}): RepoIntakeError => {
  if (args.statusCode === 404) {
    return new RepoIntakeError({
      code: "GITHUB_NOT_FOUND",
      message: "GitHub repository not found.",
      statusCode: args.statusCode,
    });
  }
  if (
    (args.statusCode === 403 || args.statusCode === 429) &&
    !args.hasRateLimitRemainingHeader
  ) {
    return new RepoIntakeError({
      code: "GITHUB_RATE_LIMITED",
      message: "GitHub rate limit reached.",
      recoverable: true,
      statusCode: args.statusCode,
    });
  }
  return new RepoIntakeError({
    code: "GITHUB_REQUEST_FAILED",
    message: `GitHub request failed (${args.statusCode}): ${args.body}`,
    recoverable: args.statusCode >= 500,
    statusCode: args.statusCode,
  });
};
