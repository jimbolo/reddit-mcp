const subreddit = process.argv[2] ?? "news";
const accessToken = process.env.REDDIT_ACCESS_TOKEN;
const clientId = process.env.REDDIT_CLIENT_ID;
const clientSecret = process.env.REDDIT_CLIENT_SECRET;
const userAgent = process.env.REDDIT_USER_AGENT ?? "script:reddit-mcp-access-diagnostics:v1.0 (by /u/unknown)";

async function request(name, url, headers = {}) {
  try {
    const response = await fetch(url, { headers });
    const body = await response.text();
    return {
      name,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      rateLimitRemaining: response.headers.get("x-ratelimit-remaining"),
      bodyKind: body.trimStart().startsWith("{") || body.trimStart().startsWith("[") ? "json" : "non-json",
      preview: body.replace(/\s+/g, " ").slice(0, 180),
    };
  } catch (error) {
    return { name, error: error instanceof Error ? error.message : String(error) };
  }
}

async function getEgress() {
  const services = [
    { name: "api64.ipify.org", url: "https://api64.ipify.org?format=json", parse: (body) => JSON.parse(body).ip },
    { name: "api.ipify.org", url: "https://api.ipify.org?format=json", parse: (body) => JSON.parse(body).ip },
  ];

  const errors = [];
  for (const service of services) {
    try {
      const response = await fetch(service.url);
      if (!response.ok) {
        errors.push(`${service.name} returned ${response.status}`);
        continue;
      }
      return { publicIp: service.parse(await response.text()), provider: service.name };
    } catch (error) {
      errors.push(`${service.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { error: errors.join("; ") };
}

async function getNetworkProfile(ip) {
  if (!ip) return { skipped: "No public IP was available for RDAP lookup." };

  try {
    const response = await fetch(`https://rdap.org/ip/${encodeURIComponent(ip)}`);
    if (!response.ok) return { error: `RDAP returned ${response.status}` };

    const data = await response.json();
    return {
      name: data.name ?? null,
      country: data.country ?? null,
      range: data.handle ?? null,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function requestTokenWithoutCredentials() {
  try {
    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
      },
      body: "grant_type=client_credentials",
    });
    const body = await response.text();
    return {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      bodyKind: body.trimStart().startsWith("{") || body.trimStart().startsWith("[") ? "json" : "non-json",
      preview: body.replace(/\s+/g, " ").slice(0, 180),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

async function getAppOnlyToken() {
  if (!clientId || !clientSecret) {
    return {
      result: { skipped: "Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET to test the application-only OAuth grant." },
    };
  }

  try {
    const basicCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicCredentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
      },
      body: "grant_type=client_credentials",
    });
    const body = await response.text();
    const data = body.trimStart().startsWith("{") ? JSON.parse(body) : null;

    if (!response.ok || !data?.access_token) {
      return {
        result: {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get("content-type"),
          bodyKind: data ? "json" : "non-json",
          preview: body.replace(/\s+/g, " ").slice(0, 180),
        },
      };
    }

    return {
      token: data.access_token,
      result: {
        status: response.status,
        tokenType: data.token_type ?? null,
        expiresInSeconds: data.expires_in ?? null,
        scope: data.scope ?? null,
      },
    };
  } catch (error) {
    return { result: { error: error instanceof Error ? error.message : String(error) } };
  }
}

const egress = await getEgress();
const appOnlyToken = accessToken ? undefined : await getAppOnlyToken();
const resolvedAccessToken = accessToken ?? appOnlyToken?.token;
const results = {
  timestamp: new Date().toISOString(),
  subreddit,
  egress,
  networkProfile: await getNetworkProfile(egress.publicIp),
  anonymousPublicJson: await request(
    "anonymous public JSON",
    `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/new.json?limit=1&raw_json=1`,
    { "User-Agent": userAgent },
  ),
  oauthWithoutToken: await request(
    "OAuth host without token",
    `https://oauth.reddit.com/r/${encodeURIComponent(subreddit)}/new?limit=1&raw_json=1`,
    { "User-Agent": userAgent },
  ),
  oauthTokenEndpointWithoutCredentials: await requestTokenWithoutCredentials(),
  oauthTokenAcquisition: accessToken
    ? { skipped: "REDDIT_ACCESS_TOKEN was provided directly." }
    : appOnlyToken.result,
};

if (resolvedAccessToken) {
  results.oauthWithToken = await request(
    "OAuth host with token",
    `https://oauth.reddit.com/r/${encodeURIComponent(subreddit)}/new?limit=1&raw_json=1`,
    {
      Authorization: `Bearer ${resolvedAccessToken}`,
      "User-Agent": userAgent,
    },
  );
} else {
  results.oauthWithToken = {
    skipped: "Set REDDIT_ACCESS_TOKEN or REDDIT_CLIENT_ID plus REDDIT_CLIENT_SECRET to verify authenticated access without storing credentials in this project.",
  };
}

console.log(JSON.stringify(results, null, 2));