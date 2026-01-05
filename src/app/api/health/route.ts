import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const adapter = request.nextUrl.searchParams.get('adapter') || 'coresim';
  
  const services = {
    qod: 'http://3gpp-as-session-with-qos:8080',
    location: 'http://3gpp-monitoring-event:8080',
    trafficInfluence: 'http://3gpp-traffic-influence:8080',
    coresim: 'http://core-simulator:8081/core-simulator/v1/status',
  };

  const status: any = {
    adapter,
    connected: false,
    services: {},
  };

  try {
    // Check CoreSim status
    const coresimResponse = await axios.get(services.coresim, { timeout: 2000 });
    status.services.coresim = {
      available: true,
      status: coresimResponse.data.Status || 'UNKNOWN',
    };
    status.connected = true;
  } catch (error) {
    status.services.coresim = {
      available: false,
      error: 'CoreSim not reachable',
    };
  }

  // Check NEF services (just test connectivity, 404 is fine)
  for (const [name, url] of Object.entries(services)) {
    if (name === 'coresim') continue;
    
    try {
      // Just check if service responds (even 404 means it's alive)
      await axios.get(url, { 
        timeout: 1000,
        validateStatus: () => true, // Accept any status code
      });
      status.services[name] = { available: true };
    } catch (error) {
      status.services[name] = { available: false };
    }
  }

  return NextResponse.json(status);
}
