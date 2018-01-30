#!/usr/bin/env node
'use strict';

// This is purely a helper to get us into EJS mode via @std/esm.
require = require('@std/esm')(module);
module.exports = require('./cli.mjs').default;
