import { z } from 'zod';
import { Stage } from './stage';
import * as dotenv from 'dotenv';

const envSchema = z.object({
  STAGE: z.nativeEnum(Stage),
});

export type EnvConfig = z.infer<typeof envSchema>;
export type AppConfig = {
  env: EnvConfig;
};
export class Configuration {
  private static instance: Configuration;
  private appConfig?: AppConfig;
  private constructor() {}

  public static init() {
    const stage = process.env.STAGE;
    if (!stage || !Object.values(Stage).includes(stage as Stage)) {
      throw new Error(`Unknown stage: ${stage}`);
    }
    if (this.instance && this.instance.appConfig) {
      throw new Error('Configuration already initialized');
    }
    this.instance = new Configuration();

    dotenv.config({ path: `.env.${stage}` });
    const validatedEnv = envSchema.parse(process.env);
    this.instance.appConfig = {
      env: validatedEnv,
    };
  }
  public static getAppConfig(): AppConfig {
    if (!this.instance || !this.instance.appConfig) {
      throw new Error('Configuration has not been initialized.');
    }
    return this.instance.appConfig;
  }
}
