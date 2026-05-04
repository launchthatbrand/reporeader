import { describe, expect, it } from "vitest";

import {
  RepoIntakeError,
  buildRepoIngestionIdempotencyKey,
  normalizeGitHubRepoUrl,
} from "./repoIntake";

describe("repo intake url normalization", () => {
  it("normalizes standard GitHub URL", () => {
    const result = normalizeGitHubRepoUrl("https://github.com/LaunchThatBrand/RepoReader");
    expect(result).toMatchObject({
      owner: "launchthatbrand",
      repo: "reporeader",
      fullName: "launchthatbrand/reporeader",
      normalizedUrl: "https://github.com/launchthatbrand/reporeader",
    });
  });

  it("normalizes urls with .git, query params, and trailing slash", () => {
    const result = normalizeGitHubRepoUrl(
      "https://github.com/launchthatbrand/reporeader.git/?tab=readme-ov-file",
    );
    expect(result.normalizedUrl).toBe(
      "https://github.com/launchthatbrand/reporeader",
    );
  });

  it("supports host-only shorthand inputs", () => {
    const result = normalizeGitHubRepoUrl("github.com/LaunchThatBrand/RepoReader");
    expect(result.fullName).toBe("launchthatbrand/reporeader");
  });

  it("throws for unsupported hosts", () => {
    expect(() =>
      normalizeGitHubRepoUrl("https://gitlab.com/launchthatbrand/reporeader"),
    ).toThrowError(RepoIntakeError);
  });
});

describe("repo intake idempotency keys", () => {
  it("is deterministic for normalized url", () => {
    const first = buildRepoIngestionIdempotencyKey(
      "https://github.com/launchthatbrand/reporeader",
    );
    const second = buildRepoIngestionIdempotencyKey(
      "https://github.com/launchthatbrand/reporeader",
    );
    expect(first).toBe(second);
    expect(first).toBe("repo-intake:https://github.com/launchthatbrand/reporeader");
  });
});
