## [5.2.1](https://github.com/JaredReisinger/order-fetcher/compare/v5.2.0...v5.2.1) (2024-09-14)


### Bug Fixes

* don't double-convert dates! ([ac7614b](https://github.com/JaredReisinger/order-fetcher/commit/ac7614b3170abe9368152fb30fdfc85bda2091fe))

# [5.2.0](https://github.com/JaredReisinger/order-fetcher/compare/v5.1.1...v5.2.0) (2024-09-14)


### Features

* support date fields and `[date]` column flag ([e00d6d7](https://github.com/JaredReisinger/order-fetcher/commit/e00d6d73d69243a8eb06f12b11ddf343e5f53074))

## [5.1.1](https://github.com/JaredReisinger/order-fetcher/compare/v5.1.0...v5.1.1) (2024-09-11)


### Bug Fixes

* remove accidental console output ([b229f73](https://github.com/JaredReisinger/order-fetcher/commit/b229f730f7dae4933f93121aef233e5848bd7a30))

# [5.1.0](https://github.com/JaredReisinger/order-fetcher/compare/v5.0.2...v5.1.0) (2024-09-10)


### Features

* add column aliasing ([3295b4b](https://github.com/JaredReisinger/order-fetcher/commit/3295b4bbdf40231595be03fa01499a8d71e0ed35))

## [5.0.2](https://github.com/JaredReisinger/order-fetcher/compare/v5.0.1...v5.0.2) (2024-09-01)


### Bug Fixes

* **dependencies:** update dependencies ([0f1c5c8](https://github.com/JaredReisinger/order-fetcher/commit/0f1c5c8553b65335bd94230df4e47ba5a3e2d3f6))
* make stub executable ([a5acaad](https://github.com/JaredReisinger/order-fetcher/commit/a5acaad1bd6332e77beec868f9843d458e446ebb))
* properly handle multi-value meta keys ([53cc3d9](https://github.com/JaredReisinger/order-fetcher/commit/53cc3d982291be7f0eca307040aa7b97e3a4c2c4))
* support column names with commas ([726aede](https://github.com/JaredReisinger/order-fetcher/commit/726aede0c1331b6dfd22512e2cc1928347d2a1bf))

## [5.0.1](https://github.com/JaredReisinger/order-fetcher/compare/v5.0.0...v5.0.1) (2024-07-19)


### Bug Fixes

* **codecov:** remove codecov package; use GitHub Actions uploader instead ([db341a1](https://github.com/JaredReisinger/order-fetcher/commit/db341a1eb866e6404af5f7ef65710242d4c29c64))

# [5.0.0](https://github.com/JaredReisinger/order-fetcher/compare/v4.0.2...v5.0.0) (2024-07-19)


### Features

* begin stubbing out non-HTTPS auth ([31ae7e9](https://github.com/JaredReisinger/order-fetcher/commit/31ae7e98032202170dd49920cb92ce304b23fc9d))
* use `ky` instead of `woocommerce-api` ([cf523fa](https://github.com/JaredReisinger/order-fetcher/commit/cf523fa35d820028931814a0c690ffa734db5de1))


### BREAKING CHANGES

* --verify-ssl option removed

## [4.0.2](https://github.com/JaredReisinger/order-fetcher/compare/v4.0.1...v4.0.2) (2024-07-18)


### Bug Fixes

* **config:** properly set filename when running `config init` ([d90c8f6](https://github.com/JaredReisinger/order-fetcher/commit/d90c8f611630c1489bc38bdd7c9c85da5435af91))

## [4.0.1](https://github.com/JaredReisinger/order-fetcher/compare/v4.0.0...v4.0.1) (2024-07-18)


### Bug Fixes

* **dependencies:** update all dependencies ([007ef11](https://github.com/JaredReisinger/order-fetcher/commit/007ef11ba915e0cc20327eda97491322ff9d9dd2))
* **dependencies:** update dependencies ([11abc25](https://github.com/JaredReisinger/order-fetcher/commit/11abc25551c2f6ea8a9674412e4bd34983385100))

# [4.0.0](https://github.com/JaredReisinger/order-fetcher/compare/v3.2.0...v4.0.0) (2024-05-09)


### Bug Fixes

* **audit:** npm audit fix ([823f360](https://github.com/JaredReisinger/order-fetcher/commit/823f360546850fb5a924ffa35e02663e90056cdb))
* **dependencies:** update dependencies, *except* eslint ([2c95ef9](https://github.com/JaredReisinger/order-fetcher/commit/2c95ef91d94c80d10ad63cd02783435652a08cc6))
* require node v20, fix module/resolution for tests ([f605f4b](https://github.com/JaredReisinger/order-fetcher/commit/f605f4b42d2f53332e62a687b7efab3994872837))


### BREAKING CHANGES

* **dependencies:** node version requirement update

# [3.2.0](https://github.com/JaredReisinger/order-fetcher/compare/v3.1.0...v3.2.0) (2023-07-12)


### Bug Fixes

* **json2csv:** update from `json2csv` to `@json2csv/plainjs` ([6d2c3b1](https://github.com/JaredReisinger/order-fetcher/commit/6d2c3b1a25c0e36d4dc2436aa6ca3aaf2dbcd8c6))
* small yargs import tweak ([ec46368](https://github.com/JaredReisinger/order-fetcher/commit/ec46368bb28ef79e2b840ae044e35d7b6692c7db))
* **snyk:** switch from `snyk protect` to @snyk/protect's `snyk-protect` ([66775c2](https://github.com/JaredReisinger/order-fetcher/commit/66775c2bebc4e0f8a9ae126854e0aaffa329b04c))


### Features

* add `--verify-ssl` and `--no-verify-ssl` CLI opts ([6edd789](https://github.com/JaredReisinger/order-fetcher/commit/6edd78939688beff2fb9df7e305514c9f9b22a0e))
* **dependencies:** update all dependencies ([0bdff03](https://github.com/JaredReisinger/order-fetcher/commit/0bdff03b7035579bb50835cdc6a413f4aa6a5fe2))

# [3.1.0](https://github.com/JaredReisinger/order-fetcher/compare/v3.0.3...v3.1.0) (2022-09-08)


### Bug Fixes

* **config:** fix timezone display in `config view` ([36b4708](https://github.com/JaredReisinger/order-fetcher/commit/36b47082b95de1f188a2119774863c4ebf45bb2c))


### Features

* **columns:** add column filtering ([257b89e](https://github.com/JaredReisinger/order-fetcher/commit/257b89e8718326763fbd1659427716954dca7be8))

## [3.0.3](https://github.com/JaredReisinger/order-fetcher/compare/v3.0.2...v3.0.3) (2022-09-07)


### Bug Fixes

* **readme:** update README (marked as fix to force a release) ([52af466](https://github.com/JaredReisinger/order-fetcher/commit/52af466381e07334748da91bac2c6cb4df3654f2))

## [3.0.2](https://github.com/JaredReisinger/order-fetcher/compare/v3.0.1...v3.0.2) (2022-09-07)


### Bug Fixes

* **config:** fix config-file-finding logic ([4718b42](https://github.com/JaredReisinger/order-fetcher/commit/4718b42d192e3738ab53473606cd549b2183b56c))
* **csv:** add UTF BOM to output CSV file ([1f77994](https://github.com/JaredReisinger/order-fetcher/commit/1f7799444649b6fab56e121bc2cfdc59799474d6)), closes [#120](https://github.com/JaredReisinger/order-fetcher/issues/120)
* **dependencies:** update all dependencies (except inquirer) ([7b3f060](https://github.com/JaredReisinger/order-fetcher/commit/7b3f06057f37290cc251443b8e8cf1a17efc0db8))

## [3.0.1](https://github.com/JaredReisinger/order-fetcher/compare/v3.0.0...v3.0.1) (2022-08-23)


### Bug Fixes

* add CLI stub file to ensure Node is running! :facepalm: ([904129e](https://github.com/JaredReisinger/order-fetcher/commit/904129e834d363a284d80490a9e71be43ec25985))

# [3.0.0](https://github.com/JaredReisinger/order-fetcher/compare/v2.0.0...v3.0.0) (2022-08-23)


### Features

* **typescript:** convert to typescript, now ESM only ([5355743](https://github.com/JaredReisinger/order-fetcher/commit/5355743c27d4c4a90e1cc86f860236cef66c7932))


### BREAKING CHANGES

* **typescript:** converted to Typescript, output is now ESM

# [2.0.0](https://github.com/JaredReisinger/order-fetcher/compare/v1.0.17...v2.0.0) (2021-06-07)


### chore

* update all dependencies ([d8665a7](https://github.com/JaredReisinger/order-fetcher/commit/d8665a700d5ff163f545fa7666fb4066220aabe7))


### BREAKING CHANGES

* Some dependencies have dropped support for previous versions of node; order-fetcher
now required Node 12.x or newer (and is tested on Node 14.x).

## [1.0.17](https://github.com/JaredReisinger/order-fetcher/compare/v1.0.16...v1.0.17) (2020-12-24)


### Bug Fixes

* **dependencies:** update all depedencies, including security fixes ([2c3747e](https://github.com/JaredReisinger/order-fetcher/commit/2c3747e7d1a2e07882edf6dd2fc4b9d7d07f7fbf))

## [1.0.16](https://github.com/JaredReisinger/order-fetcher/compare/v1.0.15...v1.0.16) (2020-12-23)


### Bug Fixes

* package.json & package-lock.json to reduce vulnerabilities ([d531e11](https://github.com/JaredReisinger/order-fetcher/commit/d531e114246b9d03b2b0f5c9907d014d769c7f6a))
* upgrade cz-conventional-changelog from 3.2.1 to 3.3.0 ([1a03c29](https://github.com/JaredReisinger/order-fetcher/commit/1a03c29e5921d9c6062e5bae2639cbea92940f6e))
* upgrade eslint from 7.7.0 to 7.8.1 ([2f9f76d](https://github.com/JaredReisinger/order-fetcher/commit/2f9f76d7b2043581bb8143cd391a09aa23debed2))
* upgrade inquirer-autocomplete-prompt from 1.0.2 to 1.1.0 ([bf157b0](https://github.com/JaredReisinger/order-fetcher/commit/bf157b0b8d5701c474f71ec6f41f07e0424a4560))
* upgrade prettier from 2.1.0 to 2.1.1 ([58de436](https://github.com/JaredReisinger/order-fetcher/commit/58de43674abbadeae06e0b05917b191a257d9808))
* upgrade snyk from 1.381.1 to 1.389.0 ([97e0b00](https://github.com/JaredReisinger/order-fetcher/commit/97e0b002b5c2564d9c13a077bad57b3fe7b48ccc))

## [1.0.15](https://github.com/JaredReisinger/order-fetcher/compare/v1.0.14...v1.0.15) (2020-09-04)


### Bug Fixes

* upgrade cz-conventional-changelog from 3.2.0 to 3.2.1 ([23edc25](https://github.com/JaredReisinger/order-fetcher/commit/23edc257897fa80d64aa2b4a05db43c04c18be24))
* upgrade mocha from 8.1.1 to 8.1.2 ([f7ae64e](https://github.com/JaredReisinger/order-fetcher/commit/f7ae64ea12745f0fb73c2b2d76c0cc72c060ad24))
* upgrade prettier from 2.0.5 to 2.1.0 ([2d936c6](https://github.com/JaredReisinger/order-fetcher/commit/2d936c6d03ca097b355a44ad1df293d00e0ff63f))
* upgrade pretty-quick from 2.0.1 to 2.0.2 ([1968997](https://github.com/JaredReisinger/order-fetcher/commit/19689976dea1e9897888cbe533a523bd6b588dbb))
* upgrade snyk from 1.374.0 to 1.381.1 ([b1c6646](https://github.com/JaredReisinger/order-fetcher/commit/b1c66467b6973c93e7f6f69a1f279da8a2302dd4))

## [1.0.14](https://github.com/JaredReisinger/order-fetcher/compare/v1.0.13...v1.0.14) (2020-08-21)


### Bug Fixes

* package.json & package-lock.json to reduce vulnerabilities ([8ec6dfe](https://github.com/JaredReisinger/order-fetcher/commit/8ec6dfe1e04c361a89a7f4257f157e80b79afd6b))
* upgrade eslint from 7.6.0 to 7.7.0 ([05d8ff4](https://github.com/JaredReisinger/order-fetcher/commit/05d8ff4ccc8d48071e7a91322fc4d9e451a3b401))
* upgrade snyk from 1.373.1 to 1.374.0 ([772be69](https://github.com/JaredReisinger/order-fetcher/commit/772be693e3ab5ce2113b37709c13192d9a3ea3f6))

## [1.0.13](https://github.com/JaredReisinger/order-fetcher/compare/v1.0.12...v1.0.13) (2020-08-12)


### Bug Fixes

* **dependencies:** run `npm audit fix` ([e480164](https://github.com/JaredReisinger/order-fetcher/commit/e480164aa2e4c24db3e9e0fdbe717c853d864a9e))
* **dependencies:** update all dependencies (including for vulnerabilities) ([501d12b](https://github.com/JaredReisinger/order-fetcher/commit/501d12bd06cc30def5c8e1a6d27baf42081f3251))
* package.json, package-lock.json & .snyk to reduce vulnerabilities ([a019821](https://github.com/JaredReisinger/order-fetcher/commit/a01982131aa86feff1dd58c8ea42fd17dcb4c68c))
* upgrade json2csv from 5.0.0 to 5.0.1 ([e29e47b](https://github.com/JaredReisinger/order-fetcher/commit/e29e47b848db28efe0489e88f28d368e97932341))
* upgrade json2csv from 5.0.0 to 5.0.1 ([0679a1f](https://github.com/JaredReisinger/order-fetcher/commit/0679a1ff510f57f2d4ff7f841c82d2857c9e010e))
* upgrade moment-timezone from 0.5.28 to 0.5.29 ([93e8d81](https://github.com/JaredReisinger/order-fetcher/commit/93e8d81b9dc82dcc99c5ccac882318d434f372d8))
* upgrade moment-timezone from 0.5.28 to 0.5.29 ([5b366d3](https://github.com/JaredReisinger/order-fetcher/commit/5b366d3dbedd4e01ec1c446cc51f04986e01bdb9))

## [1.0.12](https://github.com/JaredReisinger/order-fetcher/compare/v1.0.11...v1.0.12) (2020-06-02)

### Bug Fixes

- package.json, package-lock.json & .snyk to reduce vulnerabilities ([cb4910a](https://github.com/JaredReisinger/order-fetcher/commit/cb4910a6e8a1798875b9b5b197811f6ec3b12f14))
- package.json, package-lock.json & .snyk to reduce vulnerabilities ([c7723a8](https://github.com/JaredReisinger/order-fetcher/commit/c7723a8339b5f9d62d011e20f87550e1b22da2a0))
- package.json, package-lock.json & .snyk to reduce vulnerabilities ([bfea29d](https://github.com/JaredReisinger/order-fetcher/commit/bfea29d49c504aa94b3541a8f56f6c6fd05ca0a4))

## [1.0.11](https://github.com/JaredReisinger/order-fetcher/compare/v1.0.10...v1.0.11) (2020-03-17)

### Bug Fixes

- **vulnerabilities:** update dependencies ([ade6935](https://github.com/JaredReisinger/order-fetcher/commit/ade6935bf7c455195eb2c91bfd24b7ab8e49cf4e))

## [1.0.10](https://github.com/JaredReisinger/order-fetcher/compare/v1.0.9...v1.0.10) (2020-03-17)

### Bug Fixes

- upgrade inquirer from 7.0.4 to 7.0.6 ([32a142f](https://github.com/JaredReisinger/order-fetcher/commit/32a142f1ab346d0c652c95977cf096e15e55ff87))

## [1.0.9](https://github.com/JaredReisinger/order-fetcher/compare/v1.0.8...v1.0.9) (2020-03-17)

### Bug Fixes

- package.json & package-lock.json to reduce vulnerabilities ([06b5ff5](https://github.com/JaredReisinger/order-fetcher/commit/06b5ff5c5b8a6509de84a1c720ea731d320aa967))

## [1.0.8](https://github.com/JaredReisinger/order-fetcher/compare/v1.0.7...v1.0.8) (2020-01-19)

### Bug Fixes

- **dependencies:** update all dependencies ([02d6794](https://github.com/JaredReisinger/order-fetcher/commit/02d6794f6b027216887bc051f48b45ca9cc05907))

## [1.0.7](https://github.com/JaredReisinger/order-fetcher/compare/v1.0.6...v1.0.7) (2020-01-17)

### Bug Fixes

- **package:** update chalk to version 3.0.0 ([cc0dbe0](https://github.com/JaredReisinger/order-fetcher/commit/cc0dbe0))
- **package:** update yargs to version 15.0.1 ([b00c3e6](https://github.com/JaredReisinger/order-fetcher/commit/b00c3e6))

## [1.0.6](https://github.com/JaredReisinger/order-fetcher/compare/v1.0.5...v1.0.6) (2019-08-30)

### Bug Fixes

- **package:** update inquirer to version 7.0.0 ([426fe19](https://github.com/JaredReisinger/order-fetcher/commit/426fe19))
- **package:** update yargs to version 14.0.0 ([8f513ee](https://github.com/JaredReisinger/order-fetcher/commit/8f513ee))

## [1.0.5](https://github.com/JaredReisinger/order-fetcher/compare/v1.0.4...v1.0.5) (2019-07-09)

### Bug Fixes

- **config:** handle exact/substring timezone matches ([784b62c](https://github.com/JaredReisinger/order-fetcher/commit/784b62c))
