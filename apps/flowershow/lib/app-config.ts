import { AppConfig } from '@/components/types';
import config from '../config.json';

const typedConfig: AppConfig = config;

export const getConfig = (): AppConfig => typedConfig;

// Default export for convenience
export default getConfig();
