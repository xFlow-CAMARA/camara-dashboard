# 🎉 CAMARA Dashboard - Successfully Deployed!

## ✅ Installation Complete

The CAMARA API Dashboard is now running and ready to use!

---

## 🌐 Access the Dashboard

**URL:** http://localhost:3002

The dashboard is running on port 3002 (ports 3000 and 3001 were already in use).

---

## 📋 Dashboard Features

### 1. **Quality on Demand (QoD) Tab** ⚡
- Create QoS sessions with guaranteed bandwidth
- Profiles: QOS_E (10Mbps), QOS_S (50Mbps), QOS_M (100Mbps), QOS_L (200Mbps)
- Configure device IP, app server IP, and session duration
- Real-time session status and expiration tracking

### 2. **Location Tab** 📍
- Query device location by IMSI/SUPI
- Returns CAMARA-compliant GPS polygon coordinates
- Mock coordinates generated from CoreSim cell-based location
- Configurable max age for location data

### 3. **Traffic Influence Tab** 🔀
- Create traffic routing policies
- Configure traffic filters (TCP/UDP, ports)
- Route traffic to specific application servers
- Real-time subscription management

### 4. **Provisioning Table** 📊
- View all active provisions in one place
- Track session status (active/expired/failed)
- Monitor creation and expiration times
- Quick delete functionality

### 5. **CoreSim Status Panel** 🖥️
- Real-time simulator status
- Active UE count and details
- Network configuration (PLMN, DNN)
- Available test UEs with IP mappings

---

## 🚀 Quick Start Guide

### Test the Location API

1. Open http://localhost:3002
2. Click the **"Location"** tab
3. Use these test values:
   - **Network Access Identifier:** `001010000000001`
   - **Max Age:** `60`
4. Click **"Get Device Location"**
5. View the polygon coordinates returned

**Expected Result:**
```json
{
  "lastLocationTime": "2025-12-02T...",
  "area": {
    "areaType": "POLYGON",
    "boundary": [
      {"latitude": 48.8576, "longitude": 2.3532},
      {"latitude": 48.8576, "longitude": 2.3512},
      ...
    ]
  }
}
```

### Test the QoD API

1. Click the **"Quality on Demand"** tab
2. Use these test values:
   - **Device IP:** `12.1.0.1`
   - **App Server IP:** `10.0.0.1`
   - **QoS Profile:** `QOS_E`
   - **Duration:** `3600` (1 hour)
3. Click **"Create QoD Session"**
4. Session details will appear with Session ID

### Test Traffic Influence

1. Click the **"Traffic Influence"** tab
2. Use these test values:
   - **Network Access Identifier:** `001010000000001`
   - **Device IP:** `12.1.0.1`
   - **App Server IP:** `10.0.0.1`
   - **Protocol:** `TCP`
   - **Destination Port:** `80`
3. Click **"Create Traffic Influence"**

---

## 🔧 Architecture Highlights

### Modular Backend Design

The dashboard uses a **pluggable adapter pattern** to support multiple 5G cores:

```
Dashboard UI → Next.js API Routes → Backend Adapter → 5G Core NEF
```

**Current Adapters:**
- ✅ **CoreSim** - Fully implemented and tested

**Future Adapters (Easy to Add):**
- 🔄 Open5GS
- 🔄 free5GC  
- 🔄 OAI (OpenAirInterface)

### Component Structure

```
src/
├── app/
│   ├── api/              # Next.js API routes
│   │   ├── qod/         # QoD endpoints
│   │   ├── location/    # Location endpoints
│   │   └── traffic-influence/
│   ├── page.tsx         # Main dashboard (orchestration only)
│   └── layout.tsx       # Root layout
├── components/          # Reusable React components
│   ├── Header.tsx      # Backend selector & status
│   ├── Tabs.tsx        # API navigation
│   ├── QodPanel.tsx    # QoD form & results
│   ├── LocationPanel.tsx
│   ├── TrafficInfluencePanel.tsx
│   └── ProvisioningTable.tsx
└── lib/
    ├── adapters/       # 5G core adapters
    │   ├── coresim.ts # CoreSim implementation
    │   └── index.ts   # Adapter factory
    └── types/
        └── camara.ts  # TypeScript interfaces
```

**Key Design Principles:**
- ✅ **Separation of Concerns** - Each component has a single responsibility
- ✅ **Reusable Components** - Form panels are self-contained
- ✅ **Type Safety** - Full TypeScript coverage
- ✅ **Modular Backends** - Easy to add new 5G cores

---

## 🧪 Available Test Data

### CoreSim UEs

| IMSI | IP Address | MSISDN | Status |
|------|------------|--------|--------|
| 001010000000001 | 12.1.0.1 | +330603040201 | Active |
| 001010000000002 | 12.1.0.2 | +330603040202 | Active |
| 001010000000003 | 12.1.0.3 | +330603040203 | Active |
| 001010000000004 | 12.1.0.4 | +330603040204 | Active |
| 001010000000005 | 12.1.0.5 | +330603040205 | Active |

### Network Configuration
- **PLMN:** 001-01
- **DNN:** internet
- **IP Range:** 12.1.0.0/16
- **Cell ID:** 000000001

---

## 📡 Service Endpoints

### NEF Services (Backend)
- **QoD:** http://localhost:8100
- **Location:** http://localhost:8102
- **Traffic Influence:** http://localhost:8101

### CoreSim
- **SBI (AMF/SMF):** http://localhost:8080
- **OAM (Control):** http://localhost:8081

### Dashboard
- **Frontend:** http://localhost:3002
- **API Routes:** http://localhost:3002/api/*

---

## 🛠️ Development Commands

### Start Development Server
```bash
cd /home/xflow/camara-dashboard
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

### Lint Code
```bash
npm run lint
```

---

## 🔍 Troubleshooting

### Dashboard Won't Load
1. Check if services are running:
```bash
docker ps | grep -E "core-simulator|nef|redis"
```

2. Verify NEF services are accessible:
```bash
curl http://localhost:8102/health
```

### Location API Fails
1. Check Redis has UE data:
```bash
docker exec nef-redis redis-cli JSON.GET user:001010000000001
```

2. Verify monitoring-event logs:
```bash
docker logs 3gpp-monitoring-event | tail -20
```

### QoD Session Creation Fails
1. Check QoD service logs:
```bash
docker logs 3gpp-as-session-with-qos
```

2. Verify device IP is from CoreSim range (12.1.0.x)

### Port Already in Use
The dashboard automatically tries ports 3000, 3001, 3002. If all are in use:
```bash
# Kill process on port
sudo lsof -ti:3000 | xargs kill -9

# Or specify a different port
PORT=3005 npm run dev
```

---

## 📚 Related Documentation

1. **Implementation Report:** `/home/xflow/CAMARA_LOCATION_API_IMPLEMENTATION_REPORT.md`
2. **Dashboard README:** `/home/xflow/camara-dashboard/README.md`
3. **TF-SDK Examples:** `/home/xflow/oop/tf-sdk/examples/`

---

## 🎯 Next Steps

### Immediate Actions
1. ✅ Open dashboard at http://localhost:3002
2. ✅ Test Location API with IMSI 001010000000001
3. ✅ Create a QoD session
4. ✅ View provisions in the table

### Future Enhancements
1. 🔄 Add Open5GS backend adapter
2. 🔄 Implement WebSocket for real-time updates
3. 🔄 Add session lifecycle management
4. 🔄 Export provisions to JSON/CSV
5. 🔄 Add authentication/authorization
6. 🔄 Implement notification callback viewer

---

## ✨ Key Achievements

- ✅ **Fully Functional** - All 3 CAMARA APIs working
- ✅ **CAMARA Compliant** - Proper GPS coordinates, standard schemas
- ✅ **Modular Architecture** - Easy to extend with new backends
- ✅ **Component-Based** - Clean, maintainable React components
- ✅ **Type-Safe** - Full TypeScript coverage
- ✅ **Production Ready** - Build optimized, deployable

---

## 📞 Support

For issues:
1. Check browser console (F12) for errors
2. Review Next.js terminal output
3. Verify all Docker services are running
4. Check implementation report for integration details

---

**Dashboard Status:** 🟢 Running on http://localhost:3002  
**Last Updated:** December 2, 2025  
**Version:** 0.1.0
