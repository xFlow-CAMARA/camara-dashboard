# CAMARA Number Verification API Documentation

## Overview

The **Number Verification API** is a CAMARA-compliant API that enables application providers to verify or retrieve the mobile phone number (MSISDN) associated with a user's device. This API uses **silent network-based authentication** to verify phone number possession without requiring user interaction like SMS OTPs.

### Key Use Cases

| Use Case | Description |
|----------|-------------|
| **Fraud Prevention** | Verify that a phone number provided during signup actually belongs to the device making the request |
| **Account Recovery** | Silently verify phone ownership during password reset flows |
| **SIM Swap Detection** | Detect if a phone number has been transferred to a different SIM |
| **KYC Verification** | Validate phone numbers for regulatory compliance |
| **Seamless Login** | Enable passwordless authentication via phone number verification |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Application (Your App)                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                 CAMARA API
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CAMARA Dashboard (Next.js)                               │
│  /api/number-verification/verify        - Verify phone number                   │
│  /api/number-verification/device-phone-number - Get device's phone number       │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              TF-SDK (FastAPI)                                    │
│  /number-verification/vwip/verify                                               │
│  /number-verification/vwip/device-phone-number                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                ▼                      ▼                      ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│  UE Identity Service  │  │   CoreSim (5G Core)   │  │   Production NEF      │
│  (IP → MSISDN)        │  │   (UE Profiles)       │  │   (Real Network)      │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
```

---

## API Endpoints

### 1. Verify Phone Number

**POST** `/api/number-verification/verify`

Verifies if a provided phone number matches the phone number associated with the device making the request.

#### Request

```http
POST /api/number-verification/verify HTTP/1.1
Content-Type: application/json
x-correlator: 550e8400-e29b-41d4-a716-446655440000

{
  "device": {
    "ipv4Address": {
      "publicAddress": "12.1.0.1"
    }
  },
  "phoneNumber": "+33610000001"
}
```

#### Request Body Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `device` | object | Yes | Device identifier |
| `device.ipv4Address.publicAddress` | string | Yes | Device's public IPv4 address |
| `phoneNumber` | string | One of* | Phone number in E.164 format (e.g., `+33612345678`) |
| `hashedPhoneNumber` | string | One of* | SHA-256 hash of phone number (64 hex characters) |

> *Either `phoneNumber` or `hashedPhoneNumber` must be provided, but not both.

#### Response (200 OK)

```json
{
  "devicePhoneNumberVerified": true
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `devicePhoneNumberVerified` | boolean | `true` if phone number matches, `false` otherwise |

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_ARGUMENT` | Missing or invalid parameters |
| 401 | `UNAUTHENTICATED` | Missing or invalid authentication |
| 403 | `NUMBER_VERIFICATION.USER_NOT_AUTHENTICATED_BY_MOBILE_NETWORK` | Device not authenticated via mobile network |
| 500 | `INTERNAL` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Network service unavailable |

---

### 2. Get Device Phone Number

**GET** `/api/number-verification/device-phone-number`

Retrieves the phone number associated with a device. This allows the application to get the MSISDN directly for verification on the application side.

#### Request

```http
GET /api/number-verification/device-phone-number?deviceIp=12.1.0.1 HTTP/1.1
x-correlator: 550e8400-e29b-41d4-a716-446655440000
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `deviceIp` | string | Yes | Device's public IPv4 address |
| `adapter` | string | No | Backend adapter (`coresim` default) |

#### Response (200 OK)

```json
{
  "devicePhoneNumber": "+33610000001"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `devicePhoneNumber` | string | Phone number in E.164 format |

---

## Phone Number Format

### E.164 Format

All phone numbers must be in **E.164 international format**:
- Starts with `+`
- Followed by country code
- Then national number
- Total length: 5-15 digits after `+`

```
+[Country Code][National Number]
```

**Examples:**
| Country | Format | Example |
|---------|--------|---------|
| France | +33XXXXXXXXX | +33612345678 |
| USA | +1XXXXXXXXXX | +12025551234 |
| UK | +44XXXXXXXXXX | +447911123456 |

**Regex Pattern:** `^\+[1-9][0-9]{4,14}$`

---

## Hashed Phone Number (Privacy Mode)

For privacy-sensitive applications, you can verify phone numbers without transmitting the actual number in the request.

### How It Works

1. **Client-side:** Hash the phone number using SHA-256
2. **Send hash:** Include `hashedPhoneNumber` instead of `phoneNumber`
3. **Server comparison:** Backend hashes the device's MSISDN and compares

### Generating the Hash

**JavaScript:**
```javascript
async function hashPhoneNumber(phoneNumber) {
  const encoder = new TextEncoder();
  const data = encoder.encode(phoneNumber);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Example
const hash = await hashPhoneNumber('+33612345678');
// Result: 32f67ab4e4312618b09cd23ed8ce41b13e095fe52b73b2e8da8ef49830e50dba
```

**Python:**
```python
import hashlib

def hash_phone_number(phone_number: str) -> str:
    return hashlib.sha256(phone_number.encode('utf-8')).hexdigest()

# Example
hash = hash_phone_number('+33612345678')
# Result: 32f67ab4e4312618b09cd23ed8ce41b13e095fe52b73b2e8da8ef49830e50dba
```

**cURL (using TF-SDK helper):**
```bash
curl "http://localhost:8200/number-verification/vwip/demo/hash-phone-number?phone_number=%2B33612345678"
```

### Request with Hashed Number

```json
{
  "device": {
    "ipv4Address": {
      "publicAddress": "12.1.0.1"
    }
  },
  "hashedPhoneNumber": "32f67ab4e4312618b09cd23ed8ce41b13e095fe52b73b2e8da8ef49830e50dba"
}
```

---

## Authentication Flow

### Production Mode (3-Legged OAuth)

In production, the API requires network-based authentication:

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   App    │     │   Auth   │     │  Mobile  │     │   API    │
│          │     │  Server  │     │ Network  │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  1. Auth Request               │                │
     │───────────────▶│                │                │
     │                │  2. Network Auth (Silent)      │
     │                │───────────────▶│                │
     │                │  3. Phone # confirmed          │
     │                │◀───────────────│                │
     │  4. Access Token (with MSISDN claim)            │
     │◀───────────────│                │                │
     │                │                │                │
     │  5. API Request with Bearer Token               │
     │─────────────────────────────────────────────────▶
     │                │                │                │
     │  6. Verification Result                         │
     │◀─────────────────────────────────────────────────
```

**Request with Bearer Token:**
```http
POST /number-verification/vwip/verify HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json

{
  "phoneNumber": "+33612345678"
}
```

### Demo Mode (Device IP)

For testing and development, pass `device_ip` query parameter to bypass OAuth:

```bash
# Direct API call with device_ip (bypasses OAuth)
curl -X POST "http://localhost:8200/number-verification/vwip/verify?core=coresim&device_ip=12.1.0.1" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+33610000001"}'
```

---

## Implementation Details

### TF-SDK Backend (Python/FastAPI)

**Location:** `/oop/tf-sdk/camara_number_verification.py`

```python
@router.post("/verify", response_model=NumberVerificationMatchResponse)
async def phone_number_verify(
    raw_request: Request,
    response: Response,
    core: str = Query("coresim", description="Target 5G core"),
    device_ip: Optional[str] = Query(None, description="Device IP (demo mode)"),
    x_correlator: Optional[str] = Header(None, alias="x-correlator")
):
    """
    Verify if provided phone number matches device's MSISDN.
    
    Demo mode: Pass device_ip to bypass OAuth authentication.
    Production: Requires 3-legged OAuth token from network auth.
    """
```

**Key Functions:**

| Function | Description |
|----------|-------------|
| `verify_phone_numbers()` | Compares device MSISDN with request (plain or hashed) |
| `hash_phone_number()` | Generates SHA-256 hash of phone number |
| `get_client()` | Gets network client for IP→MSISDN resolution |
| `get_phone_from_session()` | Retrieves phone from OAuth session |

### Dashboard Frontend (TypeScript/React)

**Location:** `/camara-dashboard/src/components/NumberVerificationPanel.tsx`

**Features:**
- UE selection dropdown (from CoreSim)
- Plain text vs hashed phone number toggle
- SHA-256 hash calculator
- Real-time verification results
- Network flow visualization

### Dashboard API Routes

**Verify Route:** `/camara-dashboard/src/app/api/number-verification/verify/route.ts`
```typescript
export async function POST(request: NextRequest) {
  const adapter = getAdapter(body.adapter || 'coresim');
  const result = await adapter.verifyPhoneNumber({
    device: normalizedDevice,
    phoneNumber: body.phoneNumber,
    hashedPhoneNumber: body.hashedPhoneNumber,
  });
  return NextResponse.json(result, { status: 200 });
}
```

**Device Phone Number Route:** `/camara-dashboard/src/app/api/number-verification/device-phone-number/route.ts`
```typescript
export async function GET(request: NextRequest) {
  const adapter = getAdapter(adapterName);
  const result = await adapter.getDevicePhoneNumber({
    ipv4Address: { publicAddress: deviceIp },
  });
  return NextResponse.json(result, { status: 200 });
}
```

---

## Testing with CoreSim

### Available Test UEs

CoreSim provides simulated UEs with consistent MSISDN generation:

| Device IP | MSISDN (Generated) | IMSI Pattern |
|-----------|--------------------|--------------|
| 12.1.0.1 | +33610000001 | 208930000000001 |
| 12.1.0.2 | +33610000002 | 208930000000002 |
| 12.1.0.3 | +33610000003 | 208930000000003 |
| ... | ... | ... |
| 12.1.0.8 | +33610000008 | 208930000000008 |

**MSISDN Generation Logic:**
```
MSISDN = "+336" + last 8 digits of IMSI
Example: IMSI 208930000000001 → MSISDN +33610000001
```

### Test Commands

**1. Verify matching phone number:**
```bash
curl -s -X POST "http://localhost:8200/number-verification/vwip/verify?core=coresim&device_ip=12.1.0.1" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+33610000001"}' | jq .

# Response: {"devicePhoneNumberVerified": true}
```

**2. Verify non-matching phone number:**
```bash
curl -s -X POST "http://localhost:8200/number-verification/vwip/verify?core=coresim&device_ip=12.1.0.1" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+33699999999"}' | jq .

# Response: {"devicePhoneNumberVerified": false}
```

**3. Get device phone number:**
```bash
curl -s "http://localhost:8200/number-verification/vwip/device-phone-number?core=coresim&device_ip=12.1.0.1" | jq .

# Response: {"devicePhoneNumber": "+33610000001"}
```

**4. Verify with hashed phone number:**
```bash
# First, get the hash
HASH=$(curl -s "http://localhost:8200/number-verification/vwip/demo/hash-phone-number?phone_number=%2B33610000001" | jq -r '.hashedPhoneNumber')

# Then verify
curl -s -X POST "http://localhost:8200/number-verification/vwip/verify?core=coresim&device_ip=12.1.0.1" \
  -H "Content-Type: application/json" \
  -d "{\"hashedPhoneNumber\": \"$HASH\"}" | jq .
```

---

## Error Handling

### CAMARA-Compliant Error Response

All errors follow the CAMARA error format:

```json
{
  "status": 400,
  "code": "INVALID_ARGUMENT",
  "message": "Either phoneNumber or hashedPhoneNumber must be provided"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_ARGUMENT` | 400 | Invalid request parameters |
| `UNAUTHENTICATED` | 401 | Missing/invalid credentials |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `NUMBER_VERIFICATION.USER_NOT_AUTHENTICATED_BY_MOBILE_NETWORK` | 403 | Device not on mobile network |
| `NOT_FOUND` | 404 | Resource not found |
| `INTERNAL` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Security Considerations

### Why Silent Authentication?

The Number Verification API uses **silent network-based authentication** instead of SMS OTP because:

1. **No SIM Swap Vulnerability** - SMS can be intercepted if SIM is swapped
2. **No User Interaction** - Better UX, no waiting for SMS
3. **Network-Level Trust** - Mobile network authenticates the device
4. **Real-Time Verification** - Instant result, no delay

### Privacy Best Practices

1. **Use Hashed Phone Numbers** when possible to avoid transmitting actual numbers
2. **Implement x-correlator** for request tracing and audit logs
3. **Validate E.164 Format** on client-side before API calls
4. **Cache Results Briefly** to reduce API calls (consider 5-10 second TTL)
5. **Log Verification Attempts** for fraud detection

### Token Security

- Access tokens from network authentication should be short-lived
- Never log or store tokens with phone number claims
- Implement token refresh for long sessions

---

## Integration Examples

### React/Next.js

```typescript
import { apiClient } from '@/lib/api-client';

async function verifyUserPhoneNumber(deviceIp: string, phoneNumber: string) {
  try {
    const result = await apiClient.verifyPhoneNumber({
      device: {
        ipv4Address: { publicAddress: deviceIp }
      },
      phoneNumber
    });
    
    if (result.devicePhoneNumberVerified) {
      console.log('Phone number verified successfully');
      return true;
    } else {
      console.log('Phone number does not match device');
      return false;
    }
  } catch (error) {
    console.error('Verification failed:', error);
    throw error;
  }
}
```

### Python

```python
import requests
import hashlib

class NumberVerificationClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
    
    def verify_phone_number(
        self, 
        device_ip: str, 
        phone_number: str = None,
        use_hash: bool = False
    ) -> bool:
        url = f"{self.base_url}/number-verification/vwip/verify"
        params = {"core": "coresim", "device_ip": device_ip}
        
        if use_hash and phone_number:
            hashed = hashlib.sha256(phone_number.encode()).hexdigest()
            payload = {"hashedPhoneNumber": hashed}
        else:
            payload = {"phoneNumber": phone_number}
        
        response = requests.post(url, params=params, json=payload)
        response.raise_for_status()
        return response.json()["devicePhoneNumberVerified"]
    
    def get_device_phone_number(self, device_ip: str) -> str:
        url = f"{self.base_url}/number-verification/vwip/device-phone-number"
        params = {"core": "coresim", "device_ip": device_ip}
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()["devicePhoneNumber"]

# Usage
client = NumberVerificationClient("http://localhost:8200")
is_verified = client.verify_phone_number("12.1.0.1", "+33610000001")
print(f"Verified: {is_verified}")
```

### cURL

```bash
# Verify phone number
curl -X POST "http://localhost:3100/api/number-verification/verify" \
  -H "Content-Type: application/json" \
  -H "x-correlator: $(uuidgen)" \
  -d '{
    "device": {"ipv4Address": {"publicAddress": "12.1.0.1"}},
    "phoneNumber": "+33610000001"
  }'

# Get device phone number
curl "http://localhost:3100/api/number-verification/device-phone-number?deviceIp=12.1.0.1"
```

---

## CAMARA Specification Compliance

This implementation follows the **CAMARA Number Verification API vWIP** specification:

| Requirement | Status | Notes |
|-------------|--------|-------|
| E.164 phone number format | ✅ | Validated with regex |
| SHA-256 hashed phone number | ✅ | 64 hex character format |
| Mutual exclusion (phone OR hash) | ✅ | Validation enforced |
| x-correlator header | ✅ | Auto-generated if not provided |
| CAMARA error format | ✅ | {status, code, message} |
| 3-legged OAuth support | ✅ | With demo mode bypass |
| Silent authentication | ✅ | No user interaction required |

**CAMARA Project Reference:**
- [CAMARA Number Verification](https://github.com/camaraproject/NumberVerification)
- [CAMARA API Design Guidelines](https://github.com/camaraproject/Commonalities)

---

## Troubleshooting

### Common Issues

**1. "Network client not available" error**
```
Solution: Ensure CoreSim is running and TF-SDK can connect
Check: curl http://localhost:8200/api/coresim/status
```

**2. Verification always returns false**
```
Cause: MSISDN mismatch between dashboard and backend
Solution: Check MSISDN generation logic matches:
  Dashboard: +336${imsi.slice(-8)}
  Backend:   +336${imsi[-8:]}
```

**3. "UNAUTHENTICATED" error in production mode**
```
Cause: Missing or invalid Bearer token
Solution: 
  - Use demo mode with device_ip query param for testing
  - Implement proper OAuth flow for production
```

**4. Hash verification fails**
```
Cause: Phone number format mismatch when hashing
Solution: Ensure phone number includes '+' prefix before hashing
  Correct: hashSHA256("+33612345678")
  Wrong:   hashSHA256("33612345678")
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-05 | Initial documentation |
| - | - | CAMARA vWIP compliance |
| - | - | CoreSim integration |
| - | - | Hashed phone number support |
| - | - | Demo mode with device_ip |
