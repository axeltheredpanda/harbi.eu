export type GithubActivity = {
  repo: string;
  message: string;
  url: string;
  at: string;
} | null;

const GITHUB_USER = "axeltheredpanda";

export async function getLatestGithubActivity(): Promise<GithubActivity> {
  try {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/events/public?per_page=10`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "harbi.eu",
        },
        next: { revalidate: 1800 },
      },
    );
    if (!res.ok) return null;

    const events = (await res.json()) as Array<{
      type: string;
      repo?: { name: string };
      created_at?: string;
      payload?: {
        commits?: Array<{ message?: string; sha?: string }>;
        ref_type?: string;
        action?: string;
      };
    }>;

    for (const event of events) {
      if (event.type === "PushEvent" && event.payload?.commits?.length) {
        const commit = event.payload.commits[event.payload.commits.length - 1];
        const repo = event.repo?.name?.split("/")[1] ?? event.repo?.name ?? "repo";
        const message = (commit.message ?? "commit").split("\n")[0]!;
        return {
          repo,
          message,
          url: `https://github.com/${event.repo?.name}`,
          at: event.created_at ?? "",
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}
