# CAMARA Device Status API Implementation

## Overview

The **Device Status API** is a fully CAMARA-compliant implementation that provides network reachability and roaming status for mobile devices. This API enables applications to:

1. **Check Device Reachability** - Determine if a device can receive data connections, SMS only, or is offline
2. **Check Roaming Status** - Determine if a device is on its home network or roaming internationally
3. **Subscribe to Status Changes** - Receive real-time notifications when device status changes

## API Reference

### Base URL
```
/device-status
```

### Endpoints

#### 1. Reachability Status

**POST** `/device-status/reachability/v1/retrieve`

Check if a device is reachable for data or SMS.

**Request Body:**
```json
{
  "device": {
    "ipv4Address": {
      "publicAddress": "12.1.0.1"
    },
    "phoneNumber": "+33612345678"  // Optional
  }
}
```

**Response (200 OK):**
```json
{
  "reachabilityStatus": "CONNECTED_DATA",
  "lastStatusTime": "2025-01-20T18:30:00Z"
}
```

**Reachability Status Values:**
| Status | Description |
|--------|-------------|
| `CONNECTED_DATA` | Device can receive data connections |
| `CONNECTED_SMS` | Device can only receive SMS |
| `NOT_CONNECTED` | Device is not reachable |

---

#### 2. Roaming Status

**POST** `/device-status/roaming/v1/retrieve`

Check if a device is roaming on a foreign network.

**Request Body:**
```json
{
  "device": {
    "ipv4Address": {
      "publicAddress": "12.1.0.1"
    }
  }
}
```

**Response (200 OK):**
```json
{
  "roaming": false,
  "countryCode": 208,
  "countryName": ["France"]
}
```

---

#### 3. Create Reachability Subscription

**POST** `/device-status/reachability/v1/subscriptions`

Subscribe to reachability status change notifications.

**Request Body:**
```json
{
  "device": {
    "ipv4Address": {
      "publicAddress": "12.1.0.1"
    }
  },
  "sink": "https://myapp.com/webhooks/device-status",
  "sinkCredential": {
    "credentialType": "ACCESSTOKEN",
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "subscriptionExpireTime": "2025-01-21T18:30:00Z",
  "subscriptionMaxEvents": 100
}
```

**Response (201 Created):**
```json
{
  "subscriptionId": "550e8400-e29b-41d4-a716-446655440000",
  "device": {
    "ipv4Address": {
      "publicAddress": "12.1.0.1"
    }
  },
  "sink": "https://myapp.com/webhooks/device-status",
  "startsAt": "2025-01-20T18:30:00Z",
  "expiresAt": "2025-01-21T18:30:00Z"
}
```

---

#### 4. Delete Reachability Subscription

**DELETE** `/device-status/reachability/v1/subscriptions/{subscriptionId}`

Remove a reachability status subscription.

**Response:** `204 No Content`

---

#### 5. Create Roaming Subscription

**POST** `/device-status/roaming/v1/subscriptions`

Subscribe to roaming status change notifications.

**Request Body:**
```json
{
  "device": {
    "ipv4Address": {
      "publicAddress": "12.1.0.1"
    }
  },
  "sink": "https://myapp.com/webhooks/roaming-status"
}
```

**Response (201 Created):**
```json
{
  "subscriptionId": "660e8400-e29b-41d4-a716-446655440001",
  "device": {
    "ipv4Address": {
      "publicAddress": "12.1.0.1"
    }
  },
  "sink": "https://myapp.com/webhooks/roaming-status",
  "startsAt": "2025-01-20T18:30:00Z"
}
```

---

#### 6. Delete Roaming Subscription

**DELETE** `/device-status/roaming/v1/subscriptions/{subscriptionId}`

Remove a roaming status subscription.

**Response:** `204 No Content`

---

## CAMARA Compliance

### Error Response Format

All errors follow the CAMARA standard format:

```json
{
  "status": 400,
  "code": "INVALID_ARGUMENT",
  "message": "Device identifier is required"
}
```

### Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `INVALID_ARGUMENT` | Invalid request parameters |
| 401 | `UNAUTHENTICATED` | Missing or invalid authentication |
| 403 | `PERMISSION_DENIED` | Not authorized for this device |
| 404 | `NOT_FOUND` | Device or subscription not found |
| 409 | `CONFLICT` | Subscription already exists |
| 500 | `INTERNAL` | Server error |
| 503 | `UNAVAILABLE` | Service temporarily unavailable |

### Headers

| Header | Description |
|--------|-------------|
| `x-correlator` | Request/response correlation ID (UUID) |
| `Content-Type` | `application/json` |

---

## Architecture Flow

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Dashboard  │────▶│  TF-SDK API │────▶│ UE Profile Svc   │────▶│    Redis    │
│  (Next.js)  │     │  (FastAPI)  │     │  (Go Service)    │     │   (Cache)   │
└─────────────┘     └─────────────┘     └──────────────────┘     └─────────────┘
       │                   │                     │                       │
       │ POST /retrieve    │ Get UE Profile      │ HGETALL ue:{imsi}     │
       │ ────────────────▶ │ ──────────────────▶ │ ─────────────────────▶│
       │                   │                     │                       │
       │                   │                     │ UE State Data         │
       │                   │ ◀────────────────── │ ◀─────────────────────│
       │                   │                     │                       │
       │ Status Response   │ Map to CAMARA       │                       │
       │ ◀──────────────── │                     │                       │
```

## Data Mapping

### ConnectionStatus → ReachabilityStatus

| UE Profile | CAMARA Status |
|------------|---------------|
| `CM-CONNECTED` | `CONNECTED_DATA` |
| `CM-IDLE` | `CONNECTED_SMS` |
| `RM-DEREGISTERED` | `NOT_CONNECTED` |

### PLMN → Roaming Status

| Condition | Result |
|-----------|--------|
| UE PLMN = Home PLMN | `roaming: false` |
| UE PLMN ≠ Home PLMN | `roaming: true` |

---

## Dashboard UI

The Device Status Panel provides:

1. **UE Selection** - Choose from registered UEs in CoreSim
2. **Reachability Check** - One-click status retrieval
3. **Roaming Check** - Instant roaming status
4. **Visual Status Indicators** - Color-coded status display
5. **Network Flow Visualization** - See the API call sequence

### Status Icons

| Status | Icon | Color |
|--------|------|-------|
| CONNECTED_DATA | 📶 | Green |
| CONNECTED_SMS | 💬 | Yellow |
| NOT_CONNECTED | 📵 | Red |
| Not Roaming | 🏠 | Green |
| Roaming | 🌐 | Yellow |

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOME_MCC` | `001` | Home network MCC |
| `HOME_MNC` | `06` | Home network MNC |
| `UE_PROFILE_BASE_URL` | `http://localhost:8104` | UE Profile Service URL |

### MCC Country Codes

Supported Mobile Country Codes (MCC):

| MCC | Country |
|-----|---------|
| 001 | Test Network |
| 208 | France |
| 310 | United States |
| 234 | United Kingdom |
| 262 | Germany |
| 222 | Italy |
| 214 | Spain |
| 505 | Australia |
| 440 | Japan |
| 450 | South Korea |
| 460 | China |

---

## Testing

### cURL Examples

**Check Reachability:**
```bash
curl -X POST http://localhost:8200/device-status/reachability/v1/retrieve \
  -H "Content-Type: application/json" \
  -H "x-correlator: $(uuidgen)" \
  -d '{
    "device": {
      "ipv4Address": {
        "publicAddress": "12.1.0.1"
      }
    }
  }'
```

**Check Roaming:**
```bash
curl -X POST http://localhost:8200/device-status/roaming/v1/retrieve \
  -H "Content-Type: application/json" \
  -H "x-correlator: $(uuidgen)" \
  -d '{
    "device": {
      "ipv4Address": {
        "publicAddress": "12.1.0.1"
      }
    }
  }'
```

---

## Integration with CoreSim

The Device Status API integrates with CoreSim through:

1. **UE Profile Service** - Reads UE state from Redis cache
2. **Redis Pub/Sub** - Real-time state change notifications
3. **CoreSim Events** - Registration, connection, and PLMN changes

When a UE changes state in CoreSim (e.g., attaches, detaches, hands over), the status is immediately available via the Device Status API.

---

## CAMARA Specification Reference

- **DeviceStatus API**: https://github.com/camaraproject/DeviceStatus
- **API Specification**: https://github.com/camaraproject/DeviceStatus/blob/main/code/API_definitions/device-status.yaml
- **GSMA Profile**: OPG.1.DeviceReachabilityStatus

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-20 | Initial implementation |

## Related APIs

- [Number Verification API](./NUMBER_VERIFICATION_API.md)
- [Device Location API](./DEVICE_LOCATION_API.md)
- [Quality on Demand API](./QUALITY_ON_DEMAND_API.md)
