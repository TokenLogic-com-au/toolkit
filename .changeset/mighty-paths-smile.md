---
"@aave-dao/toolbox": patch
---

fix: name Chainlink SVR feeds from `svrDisplayLabel` instead of `path`, skip other protocols' SVR feeds (e.g. Compound SVR on Base) and Arbitrum `-cre-backup` feeds, and warn on duplicate feed names per chain.
