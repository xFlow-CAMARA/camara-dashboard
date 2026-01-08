'use client';

import { useEffect, useState } from 'react';
import { capifClient, type RegisteredService } from '@/lib/capif-client';

interface FlowStep {
  id: number;
  from: string;
  to: string;
  message: string;
  endpoint: string;
  method: string;
  requestData?: any;
  responseData?: any;
  responseStatus?: number;
  timestamp?: number;
  duration?: number;
}

interface EnhancedNetworkFlowProps {
  apiType: 'qod' | 'location' | 'traffic' | 'number-verification' | 'device-status';
  requestData?: any;
  responseData?: any;
  onComplete?: () => void;
}

export default function EnhancedNetworkFlow({ 
  apiType, 
  requestData, 
  responseData, 
  onComplete 
}: EnhancedNetworkFlowProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [services, setServices] = useState<RegisteredService[]>([]);

  // Fetch registered services from CAPIF on mount
  useEffect(() => {
    capifClient.getRegisteredServices().then(setServices);
  }, []);

  // Build dynamic flow based on API type and actual components
  useEffect(() => {
    const steps = buildFlowSteps(apiType, requestData, responseData, services);
    setFlowSteps(steps);
  }, [apiType, requestData, responseData, services]);

  function buildFlowSteps(
    type: string, 
    reqData: any, 
    resData: any,
    registeredServices: RegisteredService[]
  ): FlowStep[] {
    
    // Helper to get endpoint from CAPIF registry
    const getEndpoint = (serviceName: string, operation: string): string => {
      const service = registeredServices.find(s => s.apiName === serviceName);
      if (service && service.endpoints[operation]) {
        const ep = service.endpoints[operation];
        return `${ep.method} ${service.baseUrl}${ep.path}`;
      }
      return `Service not registered in CAPIF`;
    };

    switch (type) {
      case 'qod':
        const tfSdk = registeredServices.find(s => s.apiName === 'tf-sdk-api');
        const qodNef = registeredServices.find(s => s.apiName === '3gpp-as-session-with-qos');
        const coreNet = registeredServices.find(s => s.apiName === 'core-network-service');
        const coreSim = registeredServices.find(s => s.apiName === 'core-simulator');

        return [
          {
            id: 1,
            from: 'Dashboard',
            to: 'TF-SDK API',
            message: 'CAMARA QoD: Create Session',
            endpoint: getEndpoint('tf-sdk-api', 'qodSessions'),
            method: 'POST',
            requestData: reqData,
            responseData: resData,
            responseStatus: resData ? 201 : undefined,
          },
          {
            id: 2,
            from: 'TF-SDK API',
            to: 'SDK Client',
            message: 'Transform to 3GPP Format',
            endpoint: `SDK: client.create_qod_session()`,
            method: 'SDK',
            requestData: reqData ? {
              duration: reqData.duration,
              qosProfile: reqData.qosProfile,
              device: reqData.device,
              applicationServer: reqData.applicationServer,
              sink: reqData.sink,
            } : undefined,
            responseData: resData ? {
              sessionId: resData.sessionId,
            } : undefined,
            responseStatus: resData ? 200 : undefined,
          },
          {
            id: 3,
            from: 'SDK Client',
            to: qodNef ? `${qodNef.apiName}:${qodNef.baseUrl.split(':')[2]?.split('/')[0] || '8100'}` : '3gpp-as-session-with-qos:8100',
            message: '3GPP TS 29.122 AsSessionWithQoS',
            endpoint: getEndpoint('3gpp-as-session-with-qos', 'createSession'),
            method: 'POST',
            requestData: reqData ? {
              qosReference: reqData.qosProfile,
              ueIpv4Addr: reqData.device?.ipv4Address?.publicAddress,
              dnn: 'internet',
              notificationDestination: reqData.sink,
              flowInfo: [{ flowId: 1, flowDescriptions: [] }],
            } : undefined,
            responseData: resData ? {
              self: resData.sessionId,
              qosReference: resData.qosProfile,
            } : undefined,
            responseStatus: 201,
          },
          {
            id: 4,
            from: '3gpp-as-session-with-qos',
            to: coreNet ? `${coreNet.apiName}:${coreNet.baseUrl.split(':')[2]?.split('/')[0] || '9090'}` : 'Core Network:9090',
            message: '3GPP TS 29.514 PCF Policy Auth',
            endpoint: getEndpoint('core-network-service', 'pcfPolicyAuth'),
            method: 'POST',
            requestData: reqData ? {
              ascReqData: {
                supi: 'imsi-from-ue-ip',
                dnn: 'internet',
                qosReference: reqData.qosProfile,
              },
            } : undefined,
            responseData: resData ? {
              ascRespData: {
                authSessAmbr: { uplink: '100Mbps', downlink: '100Mbps' },
              },
            } : undefined,
            responseStatus: 201,
          },
          {
            id: 5,
            from: 'Core Network Service',
            to: coreSim ? `CoreSim:${coreSim.baseUrl.split(':')[2]?.split('/')[0] || '8080'}` : 'CoreSim:8080',
            message: '3GPP TS 29.502 SMF PDU Session',
            endpoint: getEndpoint('core-simulator', 'smfPduSession'),
            method: 'POST',
            requestData: {
              pduSessionId: 1,
              qosFlows: [{ qfi: 1, fiveQI: reqData?.qosProfile === 'QOS_E' ? 1 : 9 }],
            },
            responseData: resData ? {
              qosStatus: resData.qosStatus,
              pduSessionId: 1,
            } : undefined,
            responseStatus: resData ? 200 : undefined,
          },
          {
            id: 6,
            from: 'CoreSim (SMF)',
            to: 'UE via gNB',
            message: '3GPP TS 38.413 N2 Setup',
            endpoint: '3GPP: N1/N2 PDU Session Resource Setup',
            method: 'N2',
            responseData: resData,
            responseStatus: resData ? 200 : undefined,
          },
          // Response flow back
          {
            id: 7,
            from: 'UE via gNB',
            to: 'CoreSim (SMF)',
            message: 'N2 Response: PDU Session Established',
            endpoint: '3GPP: N2 Session Response',
            method: 'RESPONSE',
            responseData: { status: 'ACTIVE' },
            responseStatus: 200,
          },
          {
            id: 8,
            from: coreSim ? `CoreSim:${coreSim.baseUrl.split(':')[2]?.split('/')[0] || '8080'}` : 'CoreSim:8080',
            to: 'Core Network Service',
            message: 'PDU Session Created',
            endpoint: 'Response: SMF PDU Session',
            method: 'RESPONSE',
            responseData: resData ? {
              qosStatus: resData.qosStatus,
              pduSessionId: 1,
            } : undefined,
            responseStatus: 200,
          },
          {
            id: 9,
            from: coreNet ? `${coreNet.apiName}:${coreNet.baseUrl.split(':')[2]?.split('/')[0] || '9090'}` : 'Core Network:9090',
            to: '3gpp-as-session-with-qos',
            message: 'Policy Authorization Response',
            endpoint: 'Response: PCF Policy Auth',
            method: 'RESPONSE',
            responseData: resData ? {
              ascRespData: {
                authSessAmbr: { uplink: '100Mbps', downlink: '100Mbps' },
              },
            } : undefined,
            responseStatus: 201,
          },
          {
            id: 10,
            from: qodNef ? `${qodNef.apiName}:${qodNef.baseUrl.split(':')[2]?.split('/')[0] || '8100'}` : '3gpp-as-session-with-qos:8100',
            to: 'SDK Client',
            message: 'QoS Session Created',
            endpoint: 'Response: AsSessionWithQoS',
            method: 'RESPONSE',
            responseData: resData ? {
              self: resData.sessionId,
              qosReference: resData.qosProfile,
            } : undefined,
            responseStatus: 201,
          },
          {
            id: 11,
            from: 'SDK Client',
            to: 'TF-SDK API',
            message: 'Transform to CAMARA Format',
            endpoint: 'SDK Response',
            method: 'RESPONSE',
            responseData: resData ? {
              sessionId: resData.sessionId,
            } : undefined,
            responseStatus: 200,
          },
          {
            id: 12,
            from: 'TF-SDK API',
            to: 'Dashboard',
            message: 'CAMARA QoD Session Created',
            endpoint: 'Response: QoD Session',
            method: 'RESPONSE',
            responseData: resData,
            responseStatus: resData ? 201 : undefined,
          },
        ];

      case 'location':
        const locNef = registeredServices.find(s => s.apiName === '3gpp-monitoring-event');
        const locCoreNet = registeredServices.find(s => s.apiName === 'core-network-service');

        return [
          {
            id: 1,
            from: 'Dashboard',
            to: 'TF-SDK API',
            message: 'CAMARA Location: Retrieve',
            endpoint: getEndpoint('tf-sdk-api', 'locationRetrieval'),
            method: 'POST',
            requestData: reqData,
            responseData: resData,
            responseStatus: resData ? 200 : undefined,
          },
          {
            id: 2,
            from: 'TF-SDK API',
            to: 'SDK Client',
            message: 'Build 3GPP MonitoringEvent',
            endpoint: `SDK: client.create_monitoring_event_subscription()`,
            method: 'SDK',
            requestData: reqData ? {
              msisdn: reqData.device?.phoneNumber,
              externalId: reqData.device?.networkAccessIdentifier,
              monitoringType: 'LOCATION_REPORTING',
            } : undefined,
            responseStatus: resData ? 200 : undefined,
          },
          {
            id: 3,
            from: 'SDK Client',
            to: locNef ? `${locNef.apiName}:${locNef.baseUrl.split(':')[2]?.split('/')[0] || '8102'}` : '3gpp-monitoring-event:8102',
            message: '3GPP TS 29.122 Monitoring Event',
            endpoint: getEndpoint('3gpp-monitoring-event', 'createSubscription'),
            method: 'POST',
            requestData: reqData ? {
              externalId: reqData.device?.networkAccessIdentifier,
              notificationDestination: 'SDK callback',
              monitoringType: 'LOCATION_REPORTING',
            } : undefined,
            responseData: resData ? {
              locationInfo: resData.area,
            } : undefined,
            responseStatus: 201,
          },
          {
            id: 4,
            from: '3gpp-monitoring-event',
            to: locCoreNet ? `${locCoreNet.apiName}:${locCoreNet.baseUrl.split(':')[2]?.split('/')[0] || '9090'}` : 'Core Network:9090',
            message: '3GPP TS 29.518 AMF Events',
            endpoint: getEndpoint('core-network-service', 'amfEvents'),
            method: 'POST',
            requestData: {
              supi: 'Resolved from external ID',
              eventList: [{ type: 'LOCATION_REPORT' }],
            },
            responseStatus: 201,
          },
          {
            id: 5,
            from: 'Core Network Service',
            to: 'CoreSim:8080 (AMF)',
            message: '3GPP Namf_EventExposure',
            endpoint: '3GPP: Query UE location from AMF',
            method: 'GET',
            responseData: resData,
            responseStatus: resData ? 200 : undefined,
          },
          // Response flow back
          {
            id: 6,
            from: 'CoreSim:8080 (AMF)',
            to: 'Core Network Service',
            message: 'UE Location Data',
            endpoint: 'Response: Namf_EventExposure',
            method: 'RESPONSE',
            responseData: resData ? {
              locationInfo: resData.area,
            } : undefined,
            responseStatus: 200,
          },
          {
            id: 7,
            from: locCoreNet ? `${locCoreNet.apiName}:${locCoreNet.baseUrl.split(':')[2]?.split('/')[0] || '9090'}` : 'Core Network:9090',
            to: '3gpp-monitoring-event',
            message: 'AMF Event Response',
            endpoint: 'Response: AMF Events',
            method: 'RESPONSE',
            responseData: resData ? {
              locationInfo: resData.area,
            } : undefined,
            responseStatus: 201,
          },
          {
            id: 8,
            from: locNef ? `${locNef.apiName}:${locNef.baseUrl.split(':')[2]?.split('/')[0] || '8102'}` : '3gpp-monitoring-event:8102',
            to: 'SDK Client',
            message: 'Monitoring Event Created',
            endpoint: 'Response: Monitoring Event',
            method: 'RESPONSE',
            responseData: resData ? {
              locationInfo: resData.area,
            } : undefined,
            responseStatus: 201,
          },
          {
            id: 9,
            from: 'SDK Client',
            to: 'TF-SDK API',
            message: 'Transform to CAMARA Format',
            endpoint: 'SDK Response',
            method: 'RESPONSE',
            responseData: resData,
            responseStatus: 200,
          },
          {
            id: 10,
            from: 'TF-SDK API',
            to: 'Dashboard',
            message: 'CAMARA Location Retrieved',
            endpoint: 'Response: Location Retrieval',
            method: 'RESPONSE',
            responseData: resData,
            responseStatus: resData ? 200 : undefined,
          },
        ];

      case 'traffic':
        const tiNef = registeredServices.find(s => s.apiName === '3gpp-traffic-influence');
        const tiCoreNet = registeredServices.find(s => s.apiName === 'core-network-service');
        const tiCoreSim = registeredServices.find(s => s.apiName === 'core-simulator');

        return [
          {
            id: 1,
            from: 'Dashboard',
            to: 'TF-SDK API',
            message: 'CAMARA Traffic Influence: Create',
            endpoint: getEndpoint('tf-sdk-api', 'trafficInfluence'),
            method: 'POST',
            requestData: reqData,
            responseData: resData,
            responseStatus: resData ? 201 : undefined,
          },
          {
            id: 2,
            from: 'TF-SDK API',
            to: 'SDK Client',
            message: 'Build 3GPP TrafficInfluence',
            endpoint: `SDK: client.create_traffic_influence_subscription()`,
            method: 'SDK',
            requestData: reqData ? {
              deviceIpv4: reqData.device?.ipv4Address?.publicAddress,
              appServerIp: reqData.applicationServer?.ipv4Address,
              trafficFilters: reqData.trafficFilters,
            } : undefined,
            responseStatus: resData ? 200 : undefined,
          },
          {
            id: 3,
            from: 'SDK Client',
            to: tiNef ? `${tiNef.apiName}:${tiNef.baseUrl.split(':')[2]?.split('/')[0] || '8101'}` : '3gpp-traffic-influence:8101',
            message: '3GPP TS 29.122 Traffic Influence',
            endpoint: getEndpoint('3gpp-traffic-influence', 'createSubscription'),
            method: 'POST',
            requestData: reqData ? {
              afAppId: 'traffic-steering',
              trafficFilters: reqData.trafficFilters,
              trafficRoutes: [{
                dnai: 'edge-zone',
                routeProfId: 'route-1',
              }],
            } : undefined,
            responseData: resData ? {
              self: resData.subscriptionId,
            } : undefined,
            responseStatus: 201,
          },
          {
            id: 4,
            from: '3gpp-traffic-influence',
            to: tiCoreNet ? `${tiCoreNet.apiName}:${tiCoreNet.baseUrl.split(':')[2]?.split('/')[0] || '9090'}` : 'Core Network:9090',
            message: '3GPP TS 29.514 PCF Traffic Rules',
            endpoint: getEndpoint('core-network-service', 'pcfPolicyAuth'),
            method: 'POST',
            requestData: {
              ueIpv4: reqData?.device?.ipv4Address?.publicAddress,
              appServerIp: reqData?.applicationServer?.ipv4Address,
              trafficRoute: 'edge-forwarding',
            },
            responseStatus: 201,
          },
          {
            id: 5,
            from: 'Core Network Service',
            to: tiCoreSim ? `CoreSim:${tiCoreSim.baseUrl.split(':')[2]?.split('/')[0] || '8080'}` : 'CoreSim:8080',
            message: '3GPP SMF Traffic Steering',
            endpoint: '3GPP: PFCP Session Modification (N4)',
            method: 'POST',
            responseData: resData ? {
              subscriptionId: resData.subscriptionId,
              trafficFilters: resData.trafficFilters,
            } : undefined,
            responseStatus: resData ? 200 : undefined,
          },
          {
            id: 6,
            from: 'CoreSim (SMF)',
            to: 'UPF (User Plane)',
            message: '3GPP N4 Forwarding Rules',
            endpoint: '3GPP: PFCP - Update PDR/FAR',
            method: 'N4',
            responseData: resData,
            responseStatus: resData ? 200 : undefined,
          },
          // Response flow back
          {
            id: 7,
            from: 'UPF (User Plane)',
            to: 'CoreSim (SMF)',
            message: 'N4 Response: Rules Applied',
            endpoint: 'Response: PFCP Session Modified',
            method: 'RESPONSE',
            responseData: { status: 'ACTIVE' },
            responseStatus: 200,
          },
          {
            id: 8,
            from: tiCoreSim ? `CoreSim:${tiCoreSim.baseUrl.split(':')[2]?.split('/')[0] || '8080'}` : 'CoreSim:8080',
            to: 'Core Network Service',
            message: 'Traffic Steering Applied',
            endpoint: 'Response: SMF Traffic Steering',
            method: 'RESPONSE',
            responseData: resData ? {
              subscriptionId: resData.subscriptionId,
              trafficFilters: resData.trafficFilters,
            } : undefined,
            responseStatus: 200,
          },
          {
            id: 9,
            from: tiCoreNet ? `${tiCoreNet.apiName}:${tiCoreNet.baseUrl.split(':')[2]?.split('/')[0] || '9090'}` : 'Core Network:9090',
            to: '3gpp-traffic-influence',
            message: 'PCF Traffic Rules Response',
            endpoint: 'Response: PCF Traffic Rules',
            method: 'RESPONSE',
            responseStatus: 201,
          },
          {
            id: 10,
            from: tiNef ? `${tiNef.apiName}:${tiNef.baseUrl.split(':')[2]?.split('/')[0] || '8101'}` : '3gpp-traffic-influence:8101',
            to: 'SDK Client',
            message: 'Traffic Influence Created',
            endpoint: 'Response: Traffic Influence',
            method: 'RESPONSE',
            responseData: resData ? {
              self: resData.subscriptionId,
            } : undefined,
            responseStatus: 201,
          },
          {
            id: 11,
            from: 'SDK Client',
            to: 'TF-SDK API',
            message: 'Transform to CAMARA Format',
            endpoint: 'SDK Response',
            method: 'RESPONSE',
            responseData: resData,
            responseStatus: 200,
          },
          {
            id: 12,
            from: 'TF-SDK API',
            to: 'Dashboard',
            message: 'CAMARA Traffic Influence Created',
            endpoint: 'Response: Traffic Influence',
            method: 'RESPONSE',
            responseData: resData,
            responseStatus: resData ? 201 : undefined,
          },
        ];

      case 'number-verification':
        const nvUeIdentity = registeredServices.find(s => s.apiName === 'ue-identity-service');
        
        return [
          {
            id: 1,
            from: 'Dashboard',
            to: 'TF-SDK API',
            message: 'CAMARA Number Verification',
            endpoint: getEndpoint('tf-sdk-api', 'numberVerification'),
            method: 'POST',
            requestData: reqData,
            responseData: resData,
            responseStatus: resData ? 200 : undefined,
          },
          {
            id: 2,
            from: 'TF-SDK API',
            to: 'SDK Client',
            message: 'Resolve Device IP to MSISDN',
            endpoint: `SDK: client.get_msisdn_by_ip()`,
            method: 'SDK',
            requestData: reqData ? {
              deviceIp: reqData.device?.ipv4Address?.publicAddress,
            } : undefined,
            responseStatus: resData ? 200 : undefined,
          },
          {
            id: 3,
            from: 'SDK Client',
            to: nvUeIdentity ? `${nvUeIdentity.apiName}:${nvUeIdentity.baseUrl?.split(':')[2]?.split('/')[0] || '8103'}` : 'UE Identity:8103',
            message: 'MSISDN Lookup by IP',
            endpoint: '/msisdn?ip={deviceIp}',
            method: 'GET',
            requestData: reqData ? {
              ip: reqData.device?.ipv4Address?.publicAddress,
            } : undefined,
            responseStatus: 200,
          },
          {
            id: 4,
            from: 'UE Identity Service',
            to: 'Redis Cache',
            message: 'Query GPSI Cache',
            endpoint: 'Redis: HGET gpsi:{ip}',
            method: 'GET',
            responseStatus: 200,
          },
          {
            id: 5,
            from: 'Redis Cache',
            to: 'UE Identity Service',
            message: 'MSISDN Found (from CoreSim)',
            endpoint: 'Response: GPSI/MSISDN',
            method: 'RESPONSE',
            responseData: resData?.devicePhoneNumber ? {
              msisdn: resData.devicePhoneNumber,
            } : undefined,
            responseStatus: 200,
          },
          {
            id: 6,
            from: nvUeIdentity ? `${nvUeIdentity.apiName}:${nvUeIdentity.baseUrl?.split(':')[2]?.split('/')[0] || '8103'}` : 'UE Identity:8103',
            to: 'SDK Client',
            message: 'MSISDN Response',
            endpoint: 'Response: MSISDN Lookup',
            method: 'RESPONSE',
            responseData: resData?.devicePhoneNumber ? {
              msisdn: resData.devicePhoneNumber,
            } : undefined,
            responseStatus: 200,
          },
          {
            id: 7,
            from: 'SDK Client',
            to: 'TF-SDK API',
            message: reqData?.phoneNumber ? 'Compare Phone Numbers' : 'Return Device MSISDN',
            endpoint: reqData?.phoneNumber ? 'SDK: verify_phone_number()' : 'SDK: get_msisdn_by_ip()',
            method: 'SDK',
            responseData: resData,
            responseStatus: 200,
          },
          {
            id: 8,
            from: 'TF-SDK API',
            to: 'Dashboard',
            message: resData?.devicePhoneNumberVerified !== undefined 
              ? (resData.devicePhoneNumberVerified ? 'Verification: Match ✓' : 'Verification: No Match ✗')
              : 'Phone Number Retrieved',
            endpoint: 'Response: Number Verification',
            method: 'RESPONSE',
            responseData: resData,
            responseStatus: resData ? 200 : undefined,
          },
        ];

      case 'device-status':
        const dsUeProfile = registeredServices.find(s => s.apiName === 'ue-profile-service');
        
        return [
          {
            id: 1,
            from: 'Dashboard',
            to: 'TF-SDK API',
            message: resData?.reachabilityStatus ? 'CAMARA Reachability Status' : 'CAMARA Roaming Status',
            endpoint: resData?.reachabilityStatus 
              ? getEndpoint('tf-sdk-api', 'reachabilityStatus') 
              : getEndpoint('tf-sdk-api', 'roamingStatus'),
            method: 'POST',
            requestData: reqData,
            responseData: resData,
            responseStatus: resData ? 200 : undefined,
          },
          {
            id: 2,
            from: 'TF-SDK API',
            to: 'SDK Client',
            message: 'Resolve Device to UE Profile',
            endpoint: `SDK: client.get_ue_profile()`,
            method: 'SDK',
            requestData: reqData ? {
              deviceIp: reqData.device?.ipv4Address?.publicAddress,
            } : undefined,
            responseStatus: resData ? 200 : undefined,
          },
          {
            id: 3,
            from: 'SDK Client',
            to: dsUeProfile ? `${dsUeProfile.apiName}:${dsUeProfile.baseUrl?.split(':')[2]?.split('/')[0] || '8104'}` : 'UE Profile:8104',
            message: 'Query UE Profile by IP',
            endpoint: '/ue-profile?ip={deviceIp}',
            method: 'GET',
            requestData: reqData ? {
              ip: reqData.device?.ipv4Address?.publicAddress,
            } : undefined,
            responseStatus: 200,
          },
          {
            id: 4,
            from: 'UE Profile Service',
            to: 'Redis Cache',
            message: 'Query UE State Cache',
            endpoint: 'Redis: HGETALL ue:{imsi}',
            method: 'GET',
            responseStatus: 200,
          },
          {
            id: 5,
            from: 'Redis Cache',
            to: 'UE Profile Service',
            message: 'UE State Found (from CoreSim)',
            endpoint: 'Response: RegistrationStatus, ConnectionStatus, PLMN',
            method: 'RESPONSE',
            responseData: resData?.reachabilityStatus ? {
              connectionStatus: resData.reachabilityStatus,
            } : resData?.roaming !== undefined ? {
              roaming: resData.roaming,
              plmn: resData.countryCode,
            } : undefined,
            responseStatus: 200,
          },
          {
            id: 6,
            from: dsUeProfile ? `${dsUeProfile.apiName}:${dsUeProfile.baseUrl?.split(':')[2]?.split('/')[0] || '8104'}` : 'UE Profile:8104',
            to: 'SDK Client',
            message: 'UE Profile Response',
            endpoint: 'Response: UE Status Data',
            method: 'RESPONSE',
            responseData: resData,
            responseStatus: 200,
          },
          {
            id: 7,
            from: 'SDK Client',
            to: 'TF-SDK API',
            message: resData?.reachabilityStatus ? 'Map to Connectivity Status' : 'Determine Roaming Status',
            endpoint: resData?.reachabilityStatus ? 'SDK: map_connectivity_status()' : 'SDK: check_roaming_status()',
            method: 'SDK',
            responseData: resData,
            responseStatus: 200,
          },
          {
            id: 8,
            from: 'TF-SDK API',
            to: 'Dashboard',
            message: resData?.reachabilityStatus 
              ? `Status: ${resData.reachabilityStatus}` 
              : resData?.roaming !== undefined 
                ? (resData.roaming ? 'Roaming: Yes 🌐' : 'Roaming: No 🏠')
                : 'Status Retrieved',
            endpoint: 'Response: Device Status',
            method: 'RESPONSE',
            responseData: resData,
            responseStatus: resData ? 200 : undefined,
          },
        ];

      default:
        return [];
    }
  }

  const participants = Array.from(
    new Set(flowSteps.flatMap(step => [step.from, step.to]))
  );

  useEffect(() => {
    if (!isAnimating || flowSteps.length === 0) return;
    
    if (activeStep < flowSteps.length) {
      const timer = setTimeout(() => {
        setActiveStep(prev => prev + 1);
      }, 1200); // 1.2 seconds per step
      
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      if (onComplete) onComplete();
    }
  }, [activeStep, isAnimating, flowSteps.length, onComplete]);

  const toggleStepExpansion = (stepId: number) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700 w-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold mb-2">
            {apiType === 'qod' && '📊 Quality on Demand Flow'}
            {apiType === 'location' && '📍 Device Location Flow'}
            {apiType === 'traffic' && '🌐 Traffic Influence Flow'}
            {apiType === 'number-verification' && '📱 Number Verification Flow'}
            {apiType === 'device-status' && '📶 Device Status Flow'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Real-time sequence diagram with actual API calls
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Components: {participants.length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Steps: {flowSteps.length}
          </div>
        </div>
      </div>

      {/* Sequence Diagram */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 overflow-x-auto w-full">
        <div className="w-full min-w-[1400px]">
          {/* Participants Header */}
          <div className="flex justify-between mb-6">
            {participants.map((participant, idx) => (
              <div key={idx} className="flex-1 text-center px-2">
                <div className="inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-lg font-semibold text-sm shadow-lg">
                  {participant}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {participant.includes('Dashboard') && 'Client'}
                  {participant.includes('TF-SDK') && 'CAMARA Gateway'}
                  {participant.includes('NEF') && '5G Exposure'}
                  {participant.includes('CoreSim') && '5G Core Network'}
                  {participant.includes('Service') && 'Middleware'}
                  {participant.includes('Data Plane') && 'User Plane'}
                </div>
              </div>
            ))}
          </div>

          {/* Lifelines */}
          <div className="relative" style={{ minHeight: `${flowSteps.length * 160 + 50}px` }}>
            {/* Vertical lifelines */}
            {participants.map((participant, idx) => (
              <div
                key={idx}
                className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded"
                style={{
                  left: `${((idx + 0.5) / participants.length) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              />
            ))}

            {/* Messages */}
            {flowSteps.map((step, stepIdx) => {
              const fromIdx = participants.indexOf(step.from);
              const toIdx = participants.indexOf(step.to);
              const isActive = stepIdx <= activeStep;
              const isCurrent = stepIdx === activeStep;
              const isExpanded = expandedStep === step.id;
              
              const leftPos = Math.min(fromIdx, toIdx);
              const rightPos = Math.max(fromIdx, toIdx);
              const leftPercent = ((leftPos + 0.5) / participants.length) * 100;
              const rightPercent = ((rightPos + 0.5) / participants.length) * 100;
              const width = rightPercent - leftPercent;
              const isRightward = toIdx > fromIdx;

              return (
                <div key={step.id}>
                  {/* Request Arrow */}
                  <div
                    className="absolute transition-all duration-500 cursor-pointer hover:scale-105"
                    style={{
                      top: `${stepIdx * 160 + 30}px`,
                      left: `${leftPercent}%`,
                      width: `${width}%`,
                      opacity: isActive ? 1 : 0.3,
                    }}
                    onClick={() => toggleStepExpansion(step.id)}
                  >
                    {/* Arrow line */}
                    <div className="relative h-0">
                      <div
                        className={`absolute h-1 rounded transition-all duration-500 ${
                          isCurrent
                            ? 'bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300 shadow-lg'
                            : isActive
                            ? 'bg-gray-700 dark:bg-gray-300'
                            : 'bg-gray-400'
                        }`}
                        style={{
                          width: '100%',
                          top: '0',
                        }}
                      />
                      {/* Arrow head */}
                      <div
                        className={`absolute w-0 h-0 border-t-[6px] border-b-[6px] transition-colors duration-500 ${
                          isCurrent
                            ? 'border-l-blue-500 dark:border-l-blue-300'
                            : isActive
                            ? 'border-l-gray-700 dark:border-l-gray-300'
                            : 'border-l-gray-400'
                        } border-t-transparent border-b-transparent`}
                        style={{
                          [isRightward ? 'right' : 'left']: '-6px',
                          top: '-6px',
                          borderLeftWidth: '12px',
                          transform: isRightward ? 'none' : 'rotate(180deg)',
                        }}
                      />
                    </div>

                    {/* Message label */}
                    <div
                      className="absolute"
                      style={{
                        top: '-45px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <div
                        className={`text-xs whitespace-nowrap transition-all duration-300 ${
                          isCurrent
                            ? 'font-bold text-blue-600 dark:text-blue-400 scale-110'
                            : isActive
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-400'
                        }`}
                      >
                        {step.id}. {step.message}
                      </div>
                      <div
                        className={`text-[10px] whitespace-nowrap mt-1 font-mono px-2 py-0.5 rounded transition-all duration-300 ${
                          isCurrent
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold'
                            : isActive
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            : 'text-gray-400'
                        }`}
                      >
                        {step.method} {step.endpoint}
                      </div>
                    </div>
                  </div>

                  {/* Response Arrow */}
                  {step.responseStatus && (
                    <div
                      className="absolute transition-all duration-500 cursor-pointer"
                      style={{
                        top: `${stepIdx * 160 + 70}px`,
                        left: `${leftPercent}%`,
                        width: `${width}%`,
                        opacity: isActive ? 1 : 0.3,
                      }}
                      onClick={() => toggleStepExpansion(step.id)}
                    >
                      {/* Dashed line for response */}
                      <div className="relative h-0">
                        <div
                          className={`absolute h-0.5 border-t-2 border-dashed transition-colors duration-500 ${
                            isCurrent
                              ? 'border-green-600 dark:border-green-400'
                              : isActive
                              ? 'border-gray-600 dark:border-gray-400'
                              : 'border-gray-400'
                          }`}
                          style={{
                            width: '100%',
                            top: '0',
                          }}
                        />
                        {/* Arrow head pointing back */}
                        <div
                          className={`absolute w-0 h-0 border-t-[5px] border-b-[5px] transition-colors duration-500 ${
                            isCurrent
                              ? 'border-l-green-600 dark:border-l-green-400'
                              : isActive
                              ? 'border-l-gray-600 dark:border-l-gray-400'
                              : 'border-l-gray-400'
                          } border-t-transparent border-b-transparent`}
                          style={{
                            [isRightward ? 'left' : 'right']: '-5px',
                            top: '-5px',
                            borderLeftWidth: '10px',
                            transform: isRightward ? 'rotate(180deg)' : 'none',
                          }}
                        />
                      </div>

                      {/* Response label */}
                      <div
                        className={`absolute text-[10px] whitespace-nowrap font-mono px-2 py-0.5 rounded transition-all duration-300 ${
                          isCurrent
                            ? 'font-semibold bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : isActive
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            : 'text-gray-400'
                        }`}
                        style={{
                          top: '8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                        }}
                      >
                        {step.responseStatus} {getStatusText(step.responseStatus)}
                      </div>
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isExpanded && isActive && (
                    <div
                      className="absolute z-10 bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400 rounded-lg shadow-2xl p-4 transition-all duration-300"
                      style={{
                        top: `${stepIdx * 160 + 110}px`,
                        left: `${leftPercent}%`,
                        width: `${Math.max(width, 30)}%`,
                        minWidth: '400px',
                      }}
                    >
                      <div className="text-xs">
                        <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center justify-between">
                          <span>Step {step.id}: {step.message}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStepExpansion(step.id);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            ✕
                          </button>
                        </div>
                        
                        {/* Request Details */}
                        <div className="mb-3">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Request:
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                            <div className="font-mono text-[10px] text-blue-600 dark:text-blue-400">
                              {step.method} {step.endpoint}
                            </div>
                            {step.requestData && (
                              <pre className="mt-2 text-[10px] overflow-x-auto">
                                {JSON.stringify(step.requestData, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>

                        {/* Response Details */}
                        {step.responseStatus && (
                          <div>
                            <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Response:
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
                              <div className="font-mono text-[10px] text-green-600 dark:text-green-400">
                                HTTP {step.responseStatus} {getStatusText(step.responseStatus)}
                              </div>
                              {step.responseData && (
                                <pre className="mt-2 text-[10px] overflow-x-auto">
                                  {JSON.stringify(step.responseData, null, 2)}
                                </pre>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Step Info */}
      {activeStep > 0 && activeStep <= flowSteps.length && (
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="text-sm">
            <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-xs">
                {flowSteps[activeStep - 1].id}
              </span>
              {flowSteps[activeStep - 1].message}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
                <div className="text-gray-700 dark:text-gray-300 mb-1">
                  <span className="font-medium">Endpoint:</span>
                </div>
                <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded block">
                  {flowSteps[activeStep - 1].method} {flowSteps[activeStep - 1].endpoint}
                </code>
              </div>
              {flowSteps[activeStep - 1].responseStatus && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                  <div className="text-gray-700 dark:text-gray-300 mb-1">
                    <span className="font-medium text-green-700 dark:text-green-400">Status:</span>
                  </div>
                  <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded block text-green-600 dark:text-green-400">
                    {flowSteps[activeStep - 1].responseStatus} {getStatusText(flowSteps[activeStep - 1].responseStatus!)}
                  </code>
                </div>
              )}
            </div>
            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
              💡 Click on any arrow to view detailed request/response data
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Step {Math.min(activeStep, flowSteps.length)} of {flowSteps.length}
          {activeStep >= flowSteps.length && ' ✅ Complete'}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveStep(0);
              setIsAnimating(true);
              setExpandedStep(null);
            }}
            className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            🔄 Replay
          </button>
        </div>
      </div>
    </div>
  );
}

function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
  };
  return statusTexts[status] || 'Unknown';
}
