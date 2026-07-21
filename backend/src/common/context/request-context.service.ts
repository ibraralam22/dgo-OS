import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestStore {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  ipAddress?: string;
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

  setTenantId(tenantId: string) {
    const store = this.getStore();
    if (store) {
      store.tenantId = tenantId;
    }
  }

  getUserId(): string | null {
    return this.getStore()?.userId || null;
  }

  setUserId(userId: string) {
    const store = this.getStore();
    if (store) {
      store.userId = userId;
    }
  }

  getRequestId(): string | null {
    return this.getStore()?.requestId || null;
  }

  setRequestId(requestId: string) {
    const store = this.getStore();
    if (store) {
      store.requestId = requestId;
    }
  }

  getIpAddress(): string | null {
    return this.getStore()?.ipAddress || null;
  }

  setIpAddress(ipAddress: string) {
    const store = this.getStore();
    if (store) {
      store.ipAddress = ipAddress;
    }
  }
}