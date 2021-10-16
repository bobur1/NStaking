# Staking
Staking tokens and get rewards after some period of time.

## Using this Project

Clone this repository, then install the dependencies with `npm install`, then compile contracts with `npm run compile`.

### Run Contract Tests & Get Callstacks

`npm run test`

### Run Coverage Report for Tests

`npm run coverage`

### Run docgen

`npm run doc` or `npx hardhat docgen` 

The document will be created in the docs folder.

Check about [NatSpec](https://docs.soliditylang.org/en/v0.5.10/natspec-format.html) to know how to describe your contract to docgen.
### Deploy example

Script to deploy Staking in rinkeby.

_create .env before._

`npx hardhat run --network rinkeby scripts/deployStaking.ts`
