import { join } from "path";

export const KEYS_DIR: string = join(__dirname, '../../keys/');

export const KEY_REGEX = /^\d+-.*-key-(?:private|public)\.pem$/
export const PRIVATE_KEY_REGEX = /^\d+-.*-key-private\.pem$/
export const PUBLIC_KEY_REGEX = /^\d+-.*-key-public\.pem$/