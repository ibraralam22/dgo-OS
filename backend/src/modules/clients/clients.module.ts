import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { AccountsController } from './accounts.controller';
import { ContactsController } from './contacts.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AccountsController, ContactsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
