import { DownloadManager } from 'tomate-launcher-core';
// import { log } from '../../common/logging/log';
import { invoke } from '../api';
import axiosRetry from 'axios-retry';
import axios from 'axios';
import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';

// const logger = log('downloads');
//
//

const httpAgent = new HttpAgent({ keepAlive: true, maxSockets: 5 });
const httpsAgent = new HttpsAgent({ keepAlive: true, maxSockets: 5 });
const api = axios.create({
  httpAgent,
  httpsAgent,
});
axiosRetry(api);

export const downloadManager = new DownloadManager(api);
// This is too verbose even for verbose logging
// downloadManager.on('debug', (msg) => logger.verbose(msg));

downloadManager.on('start-download', (payload) => {
  invoke('start-download', payload);
});
downloadManager.on('download-status', (payload) => {
  invoke('download-status', payload);
});
downloadManager.on('end-download', (payload) => {
  invoke('end-download', payload);
});
