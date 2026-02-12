import { InternalServerErrorException, Logger } from "@nestjs/common";
import { UntilResult } from "until-async";

export function unwrap<T>(
  [error, result]: UntilResult<Error, T>,
  logger: Logger,
  context: string,
  exception: new (...args: any[]) => Error = InternalServerErrorException,
) {
  if (error) {
    logger.error(context, error);
    throw new exception();
  }
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