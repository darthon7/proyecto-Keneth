import type { DigitalKey, KeyStatus } from './entities/digital-key.entity.js';

export interface PublicDigitalKey {
  id: string;
  status: KeyStatus;
  batchId: string;
  updatedAt: Date;
}

export function sanitizeDigitalKeys(
  keys?: DigitalKey[],
): PublicDigitalKey[] | undefined {
  if (!keys) {
    return undefined;
  }
  return keys.map(({ id, status, batchId, updatedAt }) => ({
    id,
    status,
    batchId,
    updatedAt,
  }));
}
