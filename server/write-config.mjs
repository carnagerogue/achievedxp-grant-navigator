import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {aiConfig} from './index.mjs';
const settings=aiConfig();
const config={aiEnabled:settings.enabled,aiAuthMode:settings.authMode};
if(process.env.LEAD_ENDPOINT!==undefined)config.leadEndpoint=process.env.LEAD_ENDPOINT;
await writeFile(resolve(process.env.NAVIGATOR_WEB_ROOT||'/usr/share/nginx/html','config.js'),'window.NAV_CONFIG = '+JSON.stringify(config)+';\n','utf8');
