# Verified faucet

A faucet to issue tokens to SMS or email verified accounts.

It requires running a Parity node on a chain with registrar and verification contracts.

Variables in `server.js` can be changed to configure:
- RPC endpoint 
- unlocked (`--unlock ... --password ...`) address full of tokens
- number of tokens to send to SMS/email verified address
- minimum time between claims
