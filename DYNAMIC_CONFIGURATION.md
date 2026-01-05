# Dynamic Configuration - Changes Summary

## Overview
Removed all hardcoded values and made the dashboard fully dynamic with real-time data from CoreSim backend.

## Changes Made

### 1. New CoreSim Status API
**File**: `/src/app/api/coresim/status/route.ts`

Created a new API endpoint that fetches real-time data from CoreSim:
- **Status**: `GET /core-simulator/v1/status` - Current simulator state (STARTED/STOPPED)
- **UEs**: `GET /core-simulator/v1/ues` - List of all configured User Equipment
- **Config**: `GET /core-simulator/v1/configuration` - PLMN, DNN, and other settings

Returns consolidated data:
```json
{
  "status": "STARTED",
  "ues": [
    { "supi": "001010000000001", "ipAddress": "12.1.0.1" }
  ],
  "config": {
    "plmn": { "mcc": "001", "mnc": "01" },
    "dnn": "internet"
  },
  "available": true
}
```

### 2. CoreSimStatus Component
**File**: `/src/components/CoreSimStatus.tsx`

**Before**: Displayed hardcoded values (5 UEs, PLMN 001-01, DNN internet)

**After**: Fetches real data every 5 seconds:
- ✅ Dynamic UE count from backend
- ✅ Real PLMN from CoreSim configuration
- ✅ Real DNN from CoreSim configuration
- ✅ Live UE list with SUPI and IP addresses
- ✅ Scrollable UE list (max-height with overflow)
- ✅ Shows "No UEs configured" when list is empty
- ✅ Real-time NEF service status indicators

### 3. QoD Panel Component
**File**: `/src/components/QodPanel.tsx`

**Before**: Hardcoded default device IP `12.1.0.1`

**After**: 
- ✅ Fetches UE list from CoreSim on mount
- ✅ Dropdown selector populated with real UEs
- ✅ Shows IP and SUPI in format: `12.1.0.1 (001010000000001)`
- ✅ Falls back to text input if no UEs available
- ✅ Auto-selects first UE as default

### 4. Location Panel Component
**File**: `/src/components/LocationPanel.tsx`

**Before**: Hardcoded IMSI `001010000000001`

**After**:
- ✅ Fetches UE list from CoreSim on mount
- ✅ Dropdown selector populated with real UEs (SUPI)
- ✅ Shows SUPI and IP in format: `001010000000001 (12.1.0.1)`
- ✅ Falls back to text input if no UEs available
- ✅ Auto-selects first UE as default
- ✅ Updated help text to be more generic

### 5. Traffic Influence Panel Component
**File**: `/src/components/TrafficInfluencePanel.tsx`

**Before**: Hardcoded IMSI `001010000000001`, no device IP field

**After**:
- ✅ Fetches UE list from CoreSim on mount
- ✅ Dropdown selector for SUPI with real UEs
- ✅ Added Device IP field (auto-filled from selected UE)
- ✅ Synchronized selection: changing SUPI updates device IP
- ✅ Device IP sent in API request payload
- ✅ Falls back to text inputs if no UEs available

### 6. CoreSim Adapter
**File**: `/src/lib/adapters/coresim.ts`

**Before**: Hardcoded DNN as `'internet'` in all methods

**After**:
- ✅ Added `coreSimClient` to fetch configuration
- ✅ New `getDnn()` private method fetches real DNN value
- ✅ `createQodSession()` uses dynamic DNN
- ✅ `createTrafficInfluence()` uses dynamic DNN
- ✅ Fallback to `'internet'` if fetch fails

### 7. Main Page
**File**: `/src/app/page.tsx`

**Before**: Quick Start guide with hardcoded IPs and IMSIs

**After**:
- ✅ Updated instructions to mention auto-population
- ✅ Removed hardcoded IP ranges
- ✅ More user-friendly guidance

## Technical Benefits

### Real-time Synchronization
- Dashboard reflects actual CoreSim state
- No manual configuration needed
- Automatic updates every 5 seconds

### Flexibility
- Works with any UE configuration
- Adapts to custom PLMN/DNN settings
- Supports dynamic UE additions/removals

### Error Handling
- Graceful fallback to text inputs
- Maintains functionality when CoreSim is offline
- Clear visual indicators for service status

### User Experience
- No need to memorize IP addresses or IMSIs
- Dropdown selection prevents typos
- Context-aware auto-fill reduces input burden

## API Flow

```
User Opens Dashboard
    ↓
Components Mount
    ↓
Fetch /api/coresim/status
    ↓
CoreSim API: GET /core-simulator/v1/status
CoreSim API: GET /core-simulator/v1/ues
CoreSim API: GET /core-simulator/v1/configuration
    ↓
Populate Dropdowns with Real Data
    ↓
User Selects UE from Dropdown
    ↓
Form Auto-fills IP/SUPI
    ↓
User Submits Request
    ↓
Adapter Uses Dynamic DNN from Config
    ↓
Request Sent to NEF with Real Values
```

## Configuration Sources

| Field | Source | Fallback |
|-------|--------|----------|
| UE List | `/core-simulator/v1/ues` | Text input |
| Device IP | UE selection | Manual entry |
| SUPI/IMSI | UE selection | Manual entry |
| PLMN | `/core-simulator/v1/configuration` | "N/A" |
| DNN | `/core-simulator/v1/configuration` | "internet" |
| Status | `/core-simulator/v1/status` | "Offline" |

## Testing

To verify dynamic behavior:

1. **Start CoreSim** with custom configuration
2. **Open Dashboard** - should auto-populate with real UEs
3. **Stop CoreSim** - status changes to "Offline", fallback inputs appear
4. **Add/Remove UEs** - refresh dashboard to see updates
5. **Change DNN/PLMN** - restart CoreSim, verify dashboard reflects changes

## Future Enhancements

Potential improvements:
- WebSocket for instant updates (no 5s polling delay)
- Edit UE configuration directly from dashboard
- Add new UEs through UI
- Export/Import UE configurations
- Validate IP addresses against UE network ranges
