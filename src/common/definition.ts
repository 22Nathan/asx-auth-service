export enum WhichToken {
  ACCESS = 'access',
  REFRESH = 'refresh',
  BOTH = 'both',
}

export type SignTokenWrapper = {
  kid: string;
  key: string | NonSharedBuffer;
  userId: string;
  claims?: Record<string, any>;
};