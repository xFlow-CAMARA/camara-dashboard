import { BaseTFSDKAdapter } from './base-tfsdk';

/**
 * Open5GS 5G Core Adapter
 * Connects to Open5GS via TF-SDK
 */
export class Open5GSAdapter extends BaseTFSDKAdapter {
  name = 'Open5GS';
  protected coreName = 'open5gs';
}
