import { zeroAddress, type Address } from "viem";

export type UpstreamChainlinkFeed = {
  contractAddress: Address;
  proxyAddress: Address;
  path: string;
  // seems to be always svr
  secondaryProxyAddress?: Address;
  svrDisplayLabel?: string;
  decimals: number;
  name: string;
  docs?: { hidden?: boolean | null };
};

export type FormattedChainlinkFeed = {
  contractAddress: Address;
  proxyAddress: Address;
  secondaryProxyAddress?: Address;
  decimals: number;
  name: string;
};

// "ETH / USD" -> "eth-usd"
const toPath = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const pathMatchesName = (feed: UpstreamChainlinkFeed) =>
  feed.path === toPath(feed.name);

// picks the feed that keeps the plain name among feeds sharing it:
// the only documented (non-hidden) one, else the one whose path matches the name
// (e.g. `eth-usd` for "ETH / USD")
function pickPlainNameFeed(
  name: string,
  feeds: UpstreamChainlinkFeed[],
): UpstreamChainlinkFeed {
  const visible = feeds.filter((feed) => !feed.docs?.hidden);
  const candidates = visible.length > 0 ? visible : feeds;
  if (candidates.length === 1) return candidates[0];

  const match = candidates.find(pathMatchesName);
  if (!match) {
    const paths = candidates.map((feed) => feed.path).join(", ");
    throw new Error(
      `No path matches duplicate Chainlink feed name "${name}": ${paths}`,
    );
  }
  return match;
}

export function formatChainlinkFeeds(
  feeds: UpstreamChainlinkFeed[],
): FormattedChainlinkFeed[] {
  const named = feeds
    .filter((f) => f.contractAddress !== zeroAddress)
    // hidden backup feeds reuse the main feed's name and would overwrite it downstream
    .filter((f) => !/-cre-backup$/.test(f.path))
    // other protocols' SVR feeds (e.g. "Compound SVR") recapture value for that protocol, not Aave
    .filter(
      (f) =>
        !f.svrDisplayLabel ||
        f.svrDisplayLabel === "Shared SVR" ||
        f.svrDisplayLabel === "Aave SVR",
    )
    .map((f) => {
      let name = f.name;
      if (f.svrDisplayLabel === "Shared SVR") {
        name = `SVR ${name}`;
      } else if (f.svrDisplayLabel === "Aave SVR") {
        name = `AAVE SVR ${name}`;
      }
      return { feed: f, name };
    });

  // consumers key feeds by name, so names shared by several feeds have to be made unique:
  // one feed keeps the plain name, the others get their path appended
  const feedsByName = new Map<string, UpstreamChainlinkFeed[]>();
  for (const { feed, name } of named) {
    feedsByName.set(name, [...(feedsByName.get(name) ?? []), feed]);
  }

  const plainNameFeeds = new Map<string, UpstreamChainlinkFeed>();
  for (const [name, feedsWithName] of feedsByName) {
    plainNameFeeds.set(name, pickPlainNameFeed(name, feedsWithName));
  }

  return named.map(({ feed, name }) => {
    const uniqueName =
      plainNameFeeds.get(name) === feed ? name : `${name} (${feed.path})`;

    return {
      contractAddress: feed.contractAddress,
      proxyAddress: feed.proxyAddress,
      decimals: feed.decimals,
      name: uniqueName,
      ...(feed.secondaryProxyAddress
        ? { secondaryProxyAddress: feed.secondaryProxyAddress }
        : {}),
    };
  });
}
