# Interoperability evidence

## Independently sourced previous transaction

Retrieved read-only from Blockstream's **testnet3** API during implementation, recorded in `tests/fixtures/interoperability/public-prevout.json`. Its raw bytes hash to transaction `b9f4580e3039942926321269ba969a1176dd9fd4e0e5483a73ee3f449ed9922e`, output 1: native P2WPKH, 90,617 sats. The manifest records source, script, block reference and expected totals.

`src/demo/interoperability.ts` builds an unsigned illustrative PSBT: Riya's synthetic destination receives 50,000 sats, configured synthetic change receives 39,617 sats, fee 1,000 sats. Tests validate the raw previous transaction hash, exact input/output totals and normal engine verdict. Browser tests import this PSBT through the ordinary file-upload/confirmation flow; there is no fixture bypass.

This output is public, not owned by Awaaz. Its current unspent status is not checked. The illustrative spend must not be signed or broadcast. The previous transaction itself may contain historical signatures; the proposed spending PSBT does not.

Reproducible SHA-256 digests:

- Previous transaction raw bytes: `83c6dae724191874489500574697970aa39d77082412b25d99e81102e2dc4736`.
- Generated unsigned illustrative PSBT bytes: `32fb67f612902e66a15bd7467e9f5a8a7ddc4e0c90b968e5faf5f1abb30fbde2`.

## Genuine external-wallet export — outstanding

A genuine external-wallet spending PSBT has **not** been supplied or validated. Earlier implementation notes mentioned a Sparrow unlock prompt; the grant-companion changes make no further local wallet/app/config access. A fabricated export or inferred wallet version would not satisfy this gate.

To earn a supported-wallet claim: obtain an independently supplied unsigned export from an explicitly authorized watch-only testnet facility (not the user's local Sparrow); record facility version, exact chain, verified destination/change addresses, export steps, SHA-256 fixture hashes and raw previous transaction evidence. Import it into Awaaz and independently compare payment/change/fee. Never sign or broadcast from Awaaz.

Public previous-transaction consistency testing is useful independent evidence; it is **not** proof of Sparrow interoperability, chain inclusion, ownership or spendability. The prototype remains a demo, not a supported beta or audited mainnet tool.
