# CAMARA API Dashboard

A modular Next.js dashboard for testing CAMARA APIs with multiple 5G core backends.

## Features

- **🎯 CAMARA-Compliant APIs**
  - Quality on Demand (QoD)
  - Device Location
  - Traffic Influence

- **🔌 Modular Backend Architecture**
  - Pluggable 5G core adapters
  - Currently supports CoreSim
  - Easy to add Open5GS, free5GC, etc.

- **📊 Real-time Monitoring**
  - Active provisioning table
  - Session status tracking
  - CoreSim integration status

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- CoreSim 5G simulator running
- NEF services (QoD, Location, Traffic Influence) running

### Installation

```bash
cd /home/xflow/camara-dashboard
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Architecture

### Directory Structure

```
camara-dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── qod/          # QoD endpoints
│   │   │   ├── location/     # Location endpoints
│   │   │   └── traffic-influence/
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Main dashboard
│   │   └── globals.css       # Global styles
│   ├── components/            # React components
│   │   ├── Header.tsx        # Dashboard header
│   │   ├── Tabs.tsx          # API selection tabs
│   │   ├── QodPanel.tsx      # QoD form & results
│   │   ├── LocationPanel.tsx # Location form & results
│   │   ├── TrafficInfluencePanel.tsx
│   │   └── ProvisioningTable.tsx
│   └── lib/
│       ├── adapters/          # 5G core adapters
│       │   ├── coresim.ts    # CoreSim adapter
│       │   └── index.ts      # Adapter factory
│       └── types/
│           └── camara.ts     # TypeScript types
├── package.json
└── tsconfig.json
```

### Backend Adapter Pattern

The dashboard uses a modular adapter pattern to support multiple 5G cores:

```typescript
interface BackendAdapter {
  name: string;
  createQodSession(request: QodSession): Promise<QodSessionResponse>;
  getLocation(request: LocationRequest): Promise<LocationResponse>;
  createTrafficInfluence(request: TrafficInfluenceRequest): Promise<TrafficInfluenceResponse>;
  // ... more methods
}
```

**Current Adapters:**
- ✅ CoreSim (implemented)

**Future Adapters:**
- 🔄 Open5GS (planned)
- 🔄 free5GC (planned)
- 🔄 OAI (planned)

### Adding New Adapters

1. Create new adapter class in `src/lib/adapters/`:

```typescript
// src/lib/adapters/open5gs.ts
export class Open5GSAdapter implements BackendAdapter {
  name = 'Open5GS';
  // Implement interface methods...
}
```

2. Register in adapter factory:

```typescript
// src/lib/adapters/index.ts
export function getAdapter(name: string): BackendAdapter {
  switch (name.toLowerCase()) {
    case 'coresim': return new CoreSimAdapter();
    case 'open5gs': return new Open5GSAdapter();
    // ...
  }
}
```

3. Add to available adapters list:

```typescript
export function getAvailableAdapters(): string[] {
  return ['coresim', 'open5gs'];
}
```

## API Endpoints

### QoD (Quality on Demand)

```
POST /api/qod              - Create QoD session
GET  /api/qod?sessionId=   - Get session details
DELETE /api/qod?sessionId= - Delete session
```

### Location

```
POST /api/location         - Get device location
```

### Traffic Influence

```
POST /api/traffic-influence                    - Create subscription
GET  /api/traffic-influence?subscriptionId=    - Get subscription
DELETE /api/traffic-influence?subscriptionId=  - Delete subscription
```

## Configuration

### Environment Variables

Create `.env.local`:

```bash
# CoreSim Endpoints
NEXT_PUBLIC_QOD_BASE_URL=http://localhost:8100
NEXT_PUBLIC_LOCATION_BASE_URL=http://localhost:8102
NEXT_PUBLIC_TRAFFIC_INFLUENCE_BASE_URL=http://localhost:8101

# Default Backend
NEXT_PUBLIC_DEFAULT_ADAPTER=coresim
```

### CoreSim Setup

Ensure CoreSim and NEF services are running:

```bash
# Start CoreSim
cd /home/xflow/coresim/artifacts/docker-compose
docker-compose up -d

# Start NEF services
cd /home/xflow/nef
docker-compose up -d
```

## Usage Examples

### QoD Session

1. Select "Quality on Demand" tab
2. Enter device IP (e.g., 12.1.0.1)
3. Enter app server IP (e.g., 10.0.0.1)
4. Select QoS profile
5. Click "Create QoD Session"

### Location Query

1. Select "Location" tab
2. Enter IMSI (e.g., 001010000000001)
3. Set max age (seconds)
4. Click "Get Device Location"

### Traffic Influence

1. Select "Traffic Influence" tab
2. Enter device info (IMSI + IP)
3. Configure traffic filters
4. Click "Create Traffic Influence"

## CoreSim Integration

### Available Test UEs

| IMSI | IP Address | MSISDN |
|------|------------|--------|
| 001010000000001 | 12.1.0.1 | +330603040201 |
| 001010000000002 | 12.1.0.2 | +330603040202 |
| 001010000000003 | 12.1.0.3 | +330603040203 |
| 001010000000004 | 12.1.0.4 | +330603040204 |
| 001010000000005 | 12.1.0.5 | +330603040205 |

### Network Configuration

- **PLMN:** 001-01
- **DNN:** internet
- **IP Range:** 12.1.0.0/16
- **Cell ID:** 000000001

## Troubleshooting

### Location API Returns "redis: nil"

Ensure core-network-service has subscribed to CoreSim events:

```bash
docker logs core-network-service | grep subscription
```

### QoD Session Creation Fails

Check NEF QoD service logs:

```bash
docker logs 3gpp-as-session-with-qos
```

### Connection Refused

Verify all services are running:

```bash
docker ps | grep -E "core-simulator|nef"
```

## Development

### Component Guidelines

- Keep components small and focused
- Use TypeScript for type safety
- Extract reusable logic to hooks
- Follow React best practices

### Adding New CAMARA APIs

1. Define types in `src/lib/types/camara.ts`
2. Implement in adapter classes
3. Create API route in `src/app/api/`
4. Create UI component in `src/components/`
5. Add tab in main page

## License

Apache License 2.0

## Related Projects

- [CoreSim](../coresim/) - 5G Core Simulator
- [NEF Services](../nef/) - Network Exposure Function
- [TF-SDK](../oop/tf-sdk/) - Python CAMARA Client

## Support

For issues and questions:
1. Check the implementation report: `/home/xflow/CAMARA_LOCATION_API_IMPLEMENTATION_REPORT.md`
2. Review CoreSim logs
3. Verify NEF service status
