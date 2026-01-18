import { AxiosError } from 'axios';
import { log } from '../common/logging/log';
import { TasksError } from 'tomate-launcher-core';

const logger = log('error');

export class FrontendError extends Error {
  constructor(
    message: string,
    public original?: unknown,
  ) {
    super(message);
    if (this.constructor.name !== 'FrontendError') {
      this.name = this.constructor.name;
    }
  }
}

type NetworkErrorType = 'offline' | 'timeout' | 'http' | 'network' | 'unknown';

export function classifyNetworkError(err: AxiosError): NetworkErrorType {
  logger.log(navigator.onLine);
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'offline';
  }

  if (err.code === 'ERR_NETWORK' && !err.response) return 'offline';

  if (err.response) return 'http';

  if (err.code === 'ECONNABORTED') return 'timeout';

  return 'network';
}

export class NetworkError extends FrontendError {
  constructor(context: string, details?: string, err?: unknown) {
    super(`${context}. ${details ?? ''}`, err);
  }
}

export class OfflineError extends NetworkError {
  constructor(context: string, err: unknown) {
    super(`${context}. No internet connection available`, undefined, err);
  }
}

export class TimeoutError extends NetworkError {
  constructor(context: string, err: unknown) {
    super(`${context}. The request timed out`, undefined, err);
  }
}

export class HttpError extends NetworkError {
  constructor(context: string, err: AxiosError) {
    super(
      `${context}. Server returned ${err.response?.status}: ${err.response?.statusText ?? 'Unknown'}.`,
      undefined,
      err,
    );
  }
}

export function error(context: string, err: unknown): FrontendError {
  if (err instanceof TasksError) {
    const reason = err.failedTasks.map((task) =>
      !(task.error instanceof AxiosError)
        ? 'not-axios'
        : classifyNetworkError(task.error),
    );

    const allSame = reason.every((r) => r == reason[0]);
    if ((allSame && reason[0] !== 'not-axios') || err.failedTasks.length == 1) {
      return error(context, err.failedTasks[0].error);
    }

    for (const e of err.failedTasks) {
      logger.error(e.task.url, e.error);
    }

    return new FrontendError(
      context +
        `. Multiple tasks failed. ${err.failedTasks
          .filter((task) => 'url' in task.task)
          .map((task: any) => task.task.url)
          .join(', ')} failed to download`,
      err,
    );
  }

  if (!(err instanceof AxiosError)) {
    return new FrontendError(`${context}. ${String(err)}`, err);
  }

  switch (classifyNetworkError(err)) {
    case 'offline':
      return new OfflineError(context, err);
    case 'timeout':
      return new TimeoutError(context, err);
    case 'http':
      return new HttpError(context, err);
    default:
      return new NetworkError(context, 'Unexpected network error', err);
  }
}
