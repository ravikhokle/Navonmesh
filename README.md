# Emergex – Emergency Coordination System

**Emergex** is a real‑time emergency coordination system that connects **Citizens**, **Emergency Response Services (ERS)**, **Ambulances**, **Hospitals**, and **Traffic Police** through a unified web platform. It simplifies and accelerates the 108‑style emergency response by integrating automatic GPS tracking, centralized SOS management, and live map sharing.

---

## Overview

Emergex allows a patient in an emergency to request help in **two ways**:

- **Option 1**: Call **108 directly** from any phone (no app required).  
- **Option 2**: Open the **Emergex web app** and click **SOS**; the app auto‑dials 108 and sends the patient’s GPS location to the system.

Once the emergency is logged, **ERS assigns**:
- An appropriate **hospital**,  
- A nearby **ambulance**,  
- And starts **live GPS tracking** of the ambulance.

All stakeholders (ERS, Hospital, Ambulance, Traffic, and patient) share **a common GPS map** showing the patient’s and ambulance’s real‑time locations.

---

## User Roles

1. **Citizen (Patient)**  
   - Can trigger an emergency via:
     - Direct 108 call from phone, or  
     - Emergex web app with SOS button and auto‑dial.  
   - Provides basic details (name, phone number) for tracing and coordination.

2. **Emergency Response Officer (ERS)**  
   - Manages the **Emergex dashboard**.  
   - Receives and logs emergencies (auto‑loaded from SOS clicks or manually entered when citizen calls 108).  
   - Assigns **ambulance** and **hospital**.  
   - Monitors **live GPS tracking** and ETA.

3. **Ambulance (Driver / EMT)**  
   - Receives emergency assignment via system / notifications.  
   - Shares **real‑time GPS location** of the ambulance.  
   - Views route and ETA on the map.

4. **Hospital**  
   - Receives **pre‑arrival alerts** when ambulance is assigned.  
   - Views **patient location**, **ambulance position**, and **ETA** on map.  
   - Prepares ER / ward in advance.

5. **Traffic Police**  
   - Watches **ambulance movement** on map.  
   - Can help clear or monitor traffic on the route to golden‑hour arrival.

---

## How the System Works (High‑Level Flow)

### 1. Patient Initiates Emergency

There are **two paths**:

#### Path A: Patient uses Emergex web app

- Opens **Emergex Citizen Dashboard** in browser (on phone or laptop).  
- Clicks **“SOS / Call 108”** button.  
- A small **form** appears where the patient enters:
  - Name  
  - Phone number  
- On submission:
  - The browser **auto‑dials 108** using `tel:108` link.  
  - The app **requests GPS location** (`navigator.geolocation`) and sends it to the backend along with name and phone number.  
  - An **EmergencyRecord** is created with `lat`, `lng`, status, and contact details.

#### Path B: Patient calls 108 directly

- Citizen calls **108 from any phone** (no app).  
- Call is routed to **108 / ERS call‑center** as usual.  
- ERS operator **manually enters** the citizen’s:
  - Name  
  - Phone number  
  - Collected location details  
- This emergency is then **created as an EmergencyRecord** in the Emergex backend (via admin form or ERS dashboard).

---

### 2. ERS Assigns Hospital and Ambulance

- ERS sees all **pending emergencies** on the **ERS Dashboard**:
  - List of SOS records with patient details and GPS location.  
- For each emergency, ERS:
  - Selects an **appropriate hospital** based on:
    - Proximity to patient,  
    - Capacity / bed availability,  
    - Specialization (e.g., cardiac, trauma).  
  - Selects the **nearest available ambulance** (from GPS‑tracked fleet).  
- After assignment:
  - Hospital and ambulance receive **notifications** (web alerts / UI updates).  
  - System updates `EmergencyRecord` to:
    - `status: "assigned"`  
    - `assignedHospitalId`, `assignedAmbulanceId`

---

### 3. Ambulance GPS Tracking and Live Map Sharing

- Each **ambulance** periodically sends its **current GPS location** to the backend (e.g., every 5–10 seconds).  
- The backend stores:
  - `ambulanceId`, `lat`, `lng`, `timestamp`.  
- All dashboards share a **common map component** (e.g., `LiveTrackingMap`) that:
  - Plots the **patient location** (from `EmergencyRecord.lat/lng`).  
  - Plots the **ambulance location** in real time.  
  - Shows **ETA** and **route** when possible.  

This map is visible to:
- **ERS** (central view of all emergencies),  
- **Hospital** (incoming ambulance for assigned
