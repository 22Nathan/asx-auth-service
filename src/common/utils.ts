import { InternalServerErrorException, Logger } from "@nestjs/common";
import { UntilResult } from "until-async";

export function unwrap<T>(
  [error, result]: UntilResult<Error, T>,
  logger: Logger,
  context: string,
  allowNullish?: false,
  exception?: new (...args: any[]) => Error
): NonNullable<T>;

export function unwrap<T>(
  [error, result]: UntilResult<Error, T>,
  logger: Logger,
  context: string,
  allowNullish: true,
  exception?: new (...args: any[]) => Error
): T | null | undefined;

export function unwrap<T>(
  [error, result]: UntilResult<Error, T>,
  logger: Logger,
  context: string,
  allowNullish: boolean = false,
  exception: new (...args: any[]) => Error = InternalServerErrorException,
) {
  if (error) {
    logger.error(context, error);
    throw new exception();
  }
  const empty = result === undefined || result === null || (Array.isArray(result) && result.length === 0);
  if (!allowNullish && empty) throw new exception();
  return result;
}

export function sortKeyFilesAsc(files: string[]) {
  const indexedKeyFile = files.map(file => {
    const unixTimestamp = parseInt(file.split('-')[0], 10);
    const kid = file.split('-key')[0];
    return { fileName: file, unixTimestamp, kid };
  });

  return indexedKeyFile.sort((a, b) => a.unixTimestamp - b.unixTimestamp);
}