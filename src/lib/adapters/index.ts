import { BackendAdapter } from '../types/camara';
import { CoreSimAdapter } from './coresim-tfsdk';
import { Free5GCAdapter } from './free5gc-tfsdk';

/**
 * Get 5G Core adapter by name.
 * All adapters use tf-sdk as the integration layer.
 *
 * Available 5G cores:
 * - coresim  : CoreSim 5G Core Simulator (all CAMARA APIs)
 * - free5gc  : free5GC 5G Core (QoD, Location, Traffic Influence)
 */
export function getAdapter(adapterName: string = 'coresim'): BackendAdapter {
  switch (adapterName.toLowerCase()) {
    case 'coresim':
      return new CoreSimAdapter();
    case 'free5gc':
      return new Free5GCAdapter();
    default:
      return new CoreSimAdapter(); // Default to CoreSim
  }
}

export function getAvailableAdapters(): string[] {
  return ['coresim', 'free5gc'];
}

export { CoreSimAdapter, Free5GCAdapter };
