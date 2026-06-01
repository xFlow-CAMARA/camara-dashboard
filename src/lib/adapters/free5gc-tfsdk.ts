import { BaseTFSDKAdapter } from './base-tfsdk';

/**
 * free5GC 5G Core Adapter
 * Connects to free5GC via TF-SDK, using free5GC's own built-in NEF.
 *
 * free5GC's NEF (NFs/nef) exposes:
 *   /3gpp-traffic-influence/v1   → used by TF-SDK for Traffic Influence
 *   /3gpp-pfd-management/v1     → PFD management (not used by TF-SDK)
 *
 * free5GC's NEF does NOT expose:
 *   /3gpp-as-session-with-qos   → QoD ❌
 *   /3gpp-monitoring-event      → Location Retrieval ❌
 *
 * Supported CAMARA APIs:
 *   ✅ Traffic Influence  — via free5GC NEF /3gpp-traffic-influence/v1
 *
 * Not supported:
 *   ❌ QoD (Quality on Demand)        — no /3gpp-as-session-with-qos in free5GC NEF
 *   ❌ Location Retrieval              — no /3gpp-monitoring-event in free5GC NEF
 *   ❌ Number Verification             — no MSISDN verification in 5G core
 *   ❌ SIM Swap                        — requires HSS subscriber history
 *   ❌ Device Status (Reachability)    — not exposed via free5GC NEF
 */
export class Free5GCAdapter extends BaseTFSDKAdapter {
  name = 'free5GC';
  protected coreName = 'free5gc';

  /**
   * APIs not supported by free5GC.
   * Used by the dashboard to render "Not Supported" overlays.
   */
  static readonly unsupportedApis = [
    'qod',
    'location',
    'number-verification',
    'sim-swap',
    'device-status',
  ] as const;

  static readonly unsupportedReasons: Record<string, string> = {
    'qod':
      'free5GC\'s built-in NEF does not expose the /3gpp-as-session-with-qos API ' +
      'required for QoD session management.',
    'location':
      'free5GC\'s built-in NEF does not expose the /3gpp-monitoring-event API ' +
      'required for location retrieval.',
    'number-verification':
      'free5GC does not expose a Number Verification (MSISDN authentication) API. ' +
      'This CAMARA API requires operator-specific HSS/HLR integration.',
    'sim-swap':
      'free5GC does not expose SIM Swap history. ' +
      'This CAMARA API requires subscriber history tracking in the UDM/HSS.',
    'device-status':
      'Device reachability and roaming status are not exposed via the free5GC NEF.',
  };
}
