import { Global, Module } from '@nestjs/common';
import { ServiceAuthService } from './service-auth.service';
import { ServiceAuthGuard } from '../common/guards/service-auth.guard';

@Global()
@Module({
  providers: [ServiceAuthService, ServiceAuthGuard],
  exports: [ServiceAuthService, ServiceAuthGuard],
})
export class AuthModule {}
