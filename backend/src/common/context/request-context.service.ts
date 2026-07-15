import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestStore {
  tenantId?: string;
  userId?: string;
}

@Injectable()
export class RequestContextService {
  private static readonly storage = new AsyncLocalStorage<RequestStore>();

  getStore(): RequestStore | undefined {
    return RequestContextService.storage.getStore();
  }

  run(store: RequestStore, callback: () => void) {
    RequestContextService.storage.run(store, callback);
  }

  getTenantId(): string | null {
    return this.getStore()?.tenantId || null;
  }

  getUserId(): string | null {
    return this.getStore()?.userId || null;
  }
}
