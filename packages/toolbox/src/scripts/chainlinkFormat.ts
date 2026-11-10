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

  // consumers key feeds by name, so names shared by several feeds have to be made unique
  const feedsByName = new Map<string, UpstreamChainlinkFeed[]>();
  for (const { feed, name } of named) {
    feedsByName.set(name, [...(feedsByName.get(name) ?? []), feed]);
  }

  for (const [name, feedsWithName] of feedsByName) {
    if (feedsWithName.length > 1 && !feedsWithName.some(pathMatchesName)) {
      const paths = feedsWithName.map((feed) => feed.path).join(", ");
      throw new Error(
        `No path matches duplicate Chainlink feed name "${name}": ${paths}`,
      );
    }
  }

  return named.map(({ feed, name }) => {
    // the feed whose path matches the name (e.g. `eth-usd` for "ETH / USD") keeps it,
    // the others get their path appended
    const isDuplicate = feedsByName.get(name)!.length > 1;
    const uniqueName =
      isDuplicate && !pathMatchesName(feed) ? `${name} (${feed.path})` : name;

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
