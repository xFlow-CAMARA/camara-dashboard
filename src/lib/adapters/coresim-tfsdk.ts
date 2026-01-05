import { BaseTFSDKAdapter } from './base-tfsdk';

/**
 * CoreSim 5G Core Adapter
 * Connects to CoreSim via TF-SDK
 */
export class CoreSimAdapter extends BaseTFSDKAdapter {
  name = 'CoreSim';
  protected coreName = 'coresim';
}
