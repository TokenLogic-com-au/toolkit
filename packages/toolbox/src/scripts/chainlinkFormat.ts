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

export function formatChainlinkFeeds(
  feeds: UpstreamChainlinkFeed[],
): FormattedChainlinkFeed[] {
  return (
    feeds
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
        return {
          contractAddress: f.contractAddress,
          proxyAddress: f.proxyAddress,
          decimals: f.decimals,
          name: name,
          ...(f.secondaryProxyAddress
            ? { secondaryProxyAddress: f.secondaryProxyAddress }
            : {}),
        };
      })
      .filter((feed) => feed.contractAddress !== zeroAddress)
  );
}
