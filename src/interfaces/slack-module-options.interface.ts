import { ModuleMetadata, Type } from '@nestjs/common';

export interface SlackModuleOptions {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
  serviceName?: string;
}

export interface SlackOptionsFactory {
  createSlackOptions(): Promise<SlackModuleOptions> | SlackModuleOptions;
}

export interface SlackModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<SlackOptionsFactory>;
  useClass?: Type<SlackOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<SlackModuleOptions> | SlackModuleOptions;
  inject?: any[];
}
