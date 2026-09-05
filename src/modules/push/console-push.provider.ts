import { Injectable, Logger } from '@nestjs/common';
import { PushProvider } from './push-provider.interface';

@Injectable()
export class ConsolePushProvider implements PushProvider {
  private readonly logger = new Logger(ConsolePushProvider.name);

  async send(token: string, title: string, body: string): Promise<void> {
    this.logger.log(
      `📱 [PUSH] → ${token.slice(0, 10)}...: "${title}" — ${body}`,
    );
  }
}
