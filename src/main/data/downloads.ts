import { DownloadManager } from 'tomate-launcher-core';
// import { log } from '../../common/logging/log';
import { invoke } from '../api';

// const logger = log('downloads');

export const downloadManager = new DownloadManager();
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
