import { BackendAdapter } from '../types/camara';
import { CoreSimAdapter } from './coresim-tfsdk';

/**
 * Get 5G Core adapter by name.
 * All adapters use tf-sdk as the integration layer.
 * 
 * Available 5G cores:
 * - coresim: CoreSim 5G Core Simulator
 */
export function getAdapter(adapterName: string = 'coresim'): BackendAdapter {
  switch (adapterName.toLowerCase()) {
    case 'coresim':
      return new CoreSimAdapter();
    default:
      return new CoreSimAdapter(); // Default to CoreSim
  }
}

export function getAvailableAdapters(): string[] {
  return ['coresim'];
}

export { CoreSimAdapter };
