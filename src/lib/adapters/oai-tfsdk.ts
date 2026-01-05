import { BaseTFSDKAdapter } from './base-tfsdk';

/**
 * OpenAirInterface (OAI) 5G Core Adapter
 * Connects to OAI via TF-SDK
 */
export class OAIAdapter extends BaseTFSDKAdapter {
  name = 'OAI';
  protected coreName = 'oai';
}
