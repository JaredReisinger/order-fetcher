#!/usr/bin/env node

// This is purely a helper to get us into EJS mode via esm.

// require = require('esm')(module/*, options*/);
// module.exports = require('./cli.mjs').default;

module.exports = require('esm')(module)('./cli.mjs').default;
