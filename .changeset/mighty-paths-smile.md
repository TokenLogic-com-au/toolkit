---
"@aave-dao/toolbox": patch
---

fix: name Chainlink SVR feeds from `svrDisplayLabel` instead of `path`, skip other protocols' SVR feeds (e.g. Compound SVR on Base) and Arbitrum `-cre-backup` feeds, and make feed names unique per chain: when names collide, the only documented (non-hidden) feed keeps the name, otherwise the one whose path matches it, and the others get their path appended (e.g. `NGN / USD (ngn-usd-fx)`).
