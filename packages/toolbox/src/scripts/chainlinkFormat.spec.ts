import { zeroAddress } from "viem";
import { describe, expect, it } from "vitest";
import {
  formatChainlinkFeeds,
  type UpstreamChainlinkFeed,
} from "./chainlinkFormat";

const feed = (
  overrides: Partial<UpstreamChainlinkFeed>,
): UpstreamChainlinkFeed => ({
  contractAddress: "0x0000000000000000000000000000000000000001",
  proxyAddress: "0x0000000000000000000000000000000000000002",
  path: "eth-usd",
  decimals: 8,
  name: "ETH / USD",
  ...overrides,
});

describe("scripts:chainlinkFormat", () => {
  it("should keep the plain name of feeds without svr label", () => {
    expect(formatChainlinkFeeds([feed({})])).toEqual([
      {
        contractAddress: "0x0000000000000000000000000000000000000001",
        proxyAddress: "0x0000000000000000000000000000000000000002",
        decimals: 8,
        name: "ETH / USD",
      },
    ]);
  });

  it("should prefix shared svr feeds with SVR", () => {
    expect(
      formatChainlinkFeeds([
        feed({
          path: "eth-usd-shared-svr-2",
          svrDisplayLabel: "Shared SVR",
          secondaryProxyAddress: "0x0000000000000000000000000000000000000003",
        }),
      ]),
    ).toEqual([
      {
        contractAddress: "0x0000000000000000000000000000000000000001",
        proxyAddress: "0x0000000000000000000000000000000000000002",
        secondaryProxyAddress: "0x0000000000000000000000000000000000000003",
        decimals: 8,
        name: "SVR ETH / USD",
      },
    ]);
  });

  it("should prefix aave svr feeds with AAVE SVR", () => {
    expect(
      formatChainlinkFeeds([
        feed({ path: "eth-usd-svr", svrDisplayLabel: "Aave SVR" }),
      ])[0].name,
    ).toEqual("AAVE SVR ETH / USD");
  });

  it("should name from the svr label, not the path", () => {
    expect(
      formatChainlinkFeeds([
        // shared svr feed whose path doesn't mention svr
        feed({
          path: "usfron-usd-ondo-api",
          name: "USFRon-USD (Ondo API)",
          svrDisplayLabel: "Shared SVR",
        }),
        // svr path without label
        feed({ path: "btc-usd-svr", name: "BTC / USD" }),
      ]).map((f) => f.name),
    ).toEqual(["SVR USFRon-USD (Ondo API)", "BTC / USD"]);
  });

  it.each(["Compound SVR", "Some Protocol SVR"])(
    "should skip third party svr feeds labeled %s",
    (svrDisplayLabel) => {
      expect(
        formatChainlinkFeeds([
          feed({ path: "eth-usd-shared-svr", svrDisplayLabel }),
        ]),
      ).toEqual([]);
    },
  );

  it("should skip cre-backup feeds", () => {
    expect(
      formatChainlinkFeeds([
        feed({ path: "btc-usd", name: "BTC / USD" }),
        feed({
          path: "btc-usd-cre-backup",
          name: "BTC / USD",
          decimals: 18,
        }),
      ]),
    ).toMatchObject([{ name: "BTC / USD", decimals: 8 }]);
  });

  it("should skip feeds without contract", () => {
    expect(
      formatChainlinkFeeds([feed({ contractAddress: zeroAddress })]),
    ).toEqual([]);
  });
});
