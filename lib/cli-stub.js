#!/usr/bin/env node
'use strict';

// This is purely a helper to get us into EJS mode via esm.
require = require('esm')(module/*, options*/);
module.exports = require('./cli.mjs').default;
