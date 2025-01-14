#!/usr/bin/env node
import { WnpBackendApp } from '../lib/app';
import { Configuration } from '../lib/config';

// Initialize configuration
Configuration.init();

const stage = Configuration.getAppConfig().env.STAGE;
const app = new WnpBackendApp({
  context: {
    appName: `WnpBackendApp-${stage}`,
  },
});

app.synth();
