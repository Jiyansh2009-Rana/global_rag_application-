import { apiGet } from './client';
import type { PlatformGuide } from './types';

export async function getPlatformGuide(): Promise<PlatformGuide> {
  return apiGet<PlatformGuide>('/guide');
}
