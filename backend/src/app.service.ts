import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getSystemStatus() {
    return {
      tenantStatus: 'Active',
      stripeWebhooks: 'Idempotency Guard Active',
      databaseMode: 'PostgreSQL + RLS',
      authMethod: 'JWT Stateless Access + Cookie Refresh Family',
      securityLevel: 'Role-Based Guard (RBAC Interceptor) Enabled',
    };
  }
}
