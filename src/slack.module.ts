import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { SLACK_OPTIONS } from './constants';
import { SlackModuleAsyncOptions, SlackModuleOptions, SlackOptionsFactory } from './interfaces';
import { SlackService } from './services';
import { ScheduleModule } from '@nestjs/schedule';

@Global()
@Module({})
export class SlackModule {
  static forRoot(options: SlackModuleOptions): DynamicModule {
    return {
      module: SlackModule,
      providers: [
        {
          provide: SLACK_OPTIONS,
          useValue: options,
        },
        SlackService,
      ],
      exports: [SlackService],
    };
  }

  static forRootAsync(options: SlackModuleAsyncOptions): DynamicModule {
    return {
      module: SlackModule,
      imports: [...(options.imports || [])],
      providers: [
        ...this.createAsyncProviders(options),
        SlackService,
      ],
      exports: [SlackService],
    };
  }

  private static createAsyncProviders(
    options: SlackModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: SlackModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: SLACK_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    return {
      provide: SLACK_OPTIONS,
      useFactory: async (optionsFactory: SlackOptionsFactory) =>
        await optionsFactory.createSlackOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }
}