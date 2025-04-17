import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Check,
  MapPin,
  AlertTriangle,
  Loader,
  LogIn,
  LogOut,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// import { useNavigate } from "react-router-dom"; // Uncomment if using react-router
import FaceRecognition from "./FaceRecognition"; // Assuming FaceRecognition component exists

// Types
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface GeofenceZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusInMeters: number;
}

interface AttendanceRecord {
  id: string;
  timestamp: Date;
  action: "check-in" | "check-out";
  locationName: string;
}

// Sample geofence zones - in a real app, these would come from an API or config
const GEOFENCE_ZONES: GeofenceZone[] = [
  {
    id: "1",
    name: "Main Office",
    latitude: 28.470046,
    longitude: 77.493496,
    radiusInMeters: 100,
  },
  {
    id: "2",
    name: "Branch Office",
    latitude: 28.6236477,
    longitude: 77.3073903,
    radiusInMeters: 100,
  },
  {
    id: "3",
    name: "SRM Office",
    latitude: 28.796565,
    longitude: 77.538373,
    radiusInMeters: 1000,
  },
  // Example for current location based on context (Yusufpur Manota) - Adjust radius as needed
  // {
  //   id: "4",
  //   name: "Yusufpur Manota Area",
  //   latitude: 28.88, // Approximate Latitude for Yusufpur Manota
  //   longitude: 77.58, // Approximate Longitude for Yusufpur Manota
  //   radiusInMeters: 5000, // Example radius
  // },
];

// Helper function to calculate distance between coordinates in meters
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check if coordinates are within a geofence zone
const isWithinGeofence = (coords: Coordinates, zone: GeofenceZone): boolean => {
  if (!coords) return false; // Guard against null coordinates
  const distance = calculateDistance(
    coords.latitude,
    coords.longitude,
    zone.latitude,
    zone.longitude
  );
  return distance <= zone.radiusInMeters;
};

const GeolocationAttendanceSystem: React.FC = () => {
  // const navigate = useNavigate(); // Uncomment if using react-router
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(
    null
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [nearbyZones, setNearbyZones] = useState<GeofenceZone[]>([]);
  const [activeZone, setActiveZone] = useState<GeofenceZone | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [checkedIn, setCheckedIn] = useState<boolean>(false);
  const [refreshCounter, setRefreshCounter] = useState<number>(0); // If manual refresh is needed elsewhere
  const [showDashboard, setShowDashboard] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [recognizedName, setRecognizedName] = useState<string | null>(null);
  const [proceedToFace, setProceedToFace] = useState(false);
  const [earlyCheckouts, setEarlyCheckouts] = useState<number>(0);
  const lastCheckedInZoneRef = useRef<GeofenceZone | null>(null); // Track where user checked in

  // Fetch current location
  const fetchLocation = useCallback(() => {
    setLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        setLoading(false);
      },
      (error) => {
        let errorMessage = "Failed to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "Location access denied. Please enable location services.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        setLocationError(errorMessage);
        setCurrentLocation(null); // Clear location on error
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // Increased timeout
        maximumAge: 0, // Force fresh location
      }
    );
  }, []);

  // Initial location fetch and trigger refresh
  useEffect(() => {
    fetchLocation();
  }, [fetchLocation, refreshCounter]);

  // *** CORRECTED useEffect to handle nearby zones and active zone ***
  useEffect(() => {
    // Don't run if location is not yet available
    if (!currentLocation) {
      // If location becomes unavailable, clear zones
      setNearbyZones([]);
      setActiveZone(null);
      return;
    }

    // Calculate zones based *only* on the current location
    const currentNearbyZones = GEOFENCE_ZONES.filter((zone) =>
      isWithinGeofence(currentLocation, zone)
    );

    setNearbyZones(currentNearbyZones); // Update the list of nearby zones

    // Update activeZone based on the new list of zones and the *previous* activeZone state
    setActiveZone((prevActiveZone) => {
      // Check if the previously active zone is still in the nearby list
      const isPrevZoneStillNearby =
        prevActiveZone &&
        currentNearbyZones.some((z) => z.id === prevActiveZone.id);

      if (isPrevZoneStillNearby) {
        // If the previously active zone is still valid, keep it.
        return prevActiveZone;
      } else if (currentNearbyZones.length > 0) {
        // If the previous zone is gone (or was null), but new zones are nearby,
        // select the first new one as the active zone.
        // Ensure it's not resetting if user manually selected another nearby zone
        const manualSelectionExists =
          prevActiveZone &&
          currentNearbyZones.some((z) => z.id === prevActiveZone.id);
        if (manualSelectionExists) return prevActiveZone; // Keep manual selection if still nearby
        return currentNearbyZones[0]; // Otherwise, pick the first
      } else {
        // If no zones are nearby (neither previous nor new), set to null.
        return null;
      }
    });
  }, [currentLocation]); // <- Now only depends on currentLocation

  // Auto-checkout logic
  useEffect(() => {
    // Only run if checked in and associated with a specific zone
    if (!checkedIn || !lastCheckedInZoneRef.current) return;

    const checkOutZone = lastCheckedInZoneRef.current;

    // 1. Check if user moved out of the check-in zone
    let isOutsideCheckInZone = true; // Assume outside unless proven otherwise
    if (currentLocation) {
      isOutsideCheckInZone = !isWithinGeofence(currentLocation, checkOutZone);
    } else {
      // If location becomes unavailable, we can't confirm they are inside.
      // Depending on policy, you might auto-checkout here or wait.
      // For this example, let's assume checkout if location is lost.
      console.warn("Location unavailable, cannot confirm if still in zone.");
    }

    if (isOutsideCheckInZone) {
      console.log(`Auto-checking out: Left zone ${checkOutZone.name}`);
      handleAutoCheckout(checkOutZone, false); // Pass the zone they left
      return; // Exit effect early after checkout
    }

    // 2. Check for 8 PM auto-checkout
    const now = new Date();
    const eightPM = new Date(now);
    eightPM.setHours(20, 0, 0, 0); // Set to 8:00:00 PM today

    const msTo8pm = eightPM.getTime() - now.getTime();
    let timerId: ReturnType<typeof setTimeout> | null = null;

    if (now.getHours() >= 20) {
      // If it's already 8 PM or later
      console.log(
        `Auto-checking out: It's past 8 PM in zone ${checkOutZone.name}`
      );
      handleAutoCheckout(checkOutZone, true);
    } else {
      // If it's before 8 PM, set a timer
      timerId = setTimeout(() => {
        // Re-check if still checked in when timer fires
        // Need access to the latest 'checkedIn' state here. Best practice involves refs or state checks.
        // For simplicity, we assume if the timer fires, checkout should happen.
        console.log(
          `Auto-checking out: Reached 8 PM in zone ${checkOutZone.name}`
        );
        handleAutoCheckout(checkOutZone, true);
      }, msTo8pm);
    }

    // Cleanup function
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
    // This effect should re-run if checkedIn status changes, or the check-in zone changes (though unlikely)
    // Also re-run if location changes to re-evaluate the 'isOutsideCheckInZone' condition
  }, [checkedIn, currentLocation]); // Dependency added: currentLocation

  // Auto checkout handler (now accepts the specific zone)
  const handleAutoCheckout = (zone: GeofenceZone, is8pm = false) => {
    // Double check if still checked in before proceeding
    if (!checkedIn) return;

    const now = new Date();
    const isEarly = !is8pm && now.getHours() < 20; // Early if not 8pm checkout and before 8pm

    if (isEarly) {
      setEarlyCheckouts((prev) => prev + 1);
    }

    const record: AttendanceRecord = {
      id: `${Date.now()}-checkout-${zone.id}`, // More unique ID
      timestamp: now,
      action: "check-out",
      locationName: `${zone.name} ${
        is8pm ? "(Auto 8pm)" : isEarly ? "(Early Auto)" : "(Auto Left Zone)"
      }`,
    };

    setAttendanceRecords((prev) => [...prev, record]);
    setCheckedIn(false);
    setProceedToFace(false); // Reset face recognition flow
    setFaceVerified(false);
    setRecognizedName(null);
    lastCheckedInZoneRef.current = null; // Clear the check-in zone ref
    console.log("Auto Checkout Processed:", record);
  };

  // Handle check-in (now requires face verification stage)
  const handleInitiateCheckIn = () => {
    if (!activeZone) return;
    setProceedToFace(true); // Move to face verification step
  };

  // Actual check-in after face verification
  const performCheckIn = (zone: GeofenceZone, userName: string) => {
    const record: AttendanceRecord = {
      id: `${Date.now()}-checkin-${zone.id}`, // More unique ID
      timestamp: new Date(),
      action: "check-in",
      locationName: `${zone.name} (${userName})`,
    };

    setAttendanceRecords((prev) => [...prev, record]);
    setCheckedIn(true);
    lastCheckedInZoneRef.current = zone; // Store the zone where check-in occurred
    setShowDashboard(false); // Go back to main view after check-in
    setProceedToFace(false); // Done with face step
    console.log("Check-In Processed:", record);
  };

  // Handle manual check-out (now requires face verification stage)
  const handleInitiateCheckOut = () => {
    if (!activeZone || !checkedIn) return;
    // For checkout, face verification might be optional based on policy
    // For this example, we'll do a direct manual checkout
    handleManualCheckout(activeZone);
  };

  // Actual manual check-out
  const handleManualCheckout = (zone: GeofenceZone) => {
    const now = new Date();
    const isEarly = now.getHours() < 20; // Check if manual checkout is early

    if (isEarly) {
      setEarlyCheckouts((prev) => prev + 1);
    }

    const record: AttendanceRecord = {
      id: `${Date.now()}-checkout-${zone.id}`,
      timestamp: new Date(),
      action: "check-out",
      locationName: `${zone.name} ${isEarly ? "(Manual Early)" : "(Manual)"}`,
    };

    setAttendanceRecords((prev) => [...prev, record]);
    setCheckedIn(false);
    setProceedToFace(false); // Reset face recognition flow
    setFaceVerified(false);
    setRecognizedName(null);
    lastCheckedInZoneRef.current = null; // Clear the check-in zone ref
    console.log("Manual Checkout Processed:", record);
  };

  // Format coordinates for display
  const formatCoordinates = (coords: Coordinates | null): string => {
    if (!coords) return "N/A";
    return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
  };

  // Select a specific zone (allow changing zone even if one is auto-detected)
  const selectZone = (zone: GeofenceZone) => {
    setActiveZone(zone);
    // Reset face verification if zone changes before verification
    if (!faceVerified) {
      setProceedToFace(false);
    }
  };

  // Handler for successful face verification
  const handleFaceVerified = (name: string) => {
    setFaceVerified(true);
    setRecognizedName(name);
    // Automatically proceed with check-in after verification
    if (activeZone && !checkedIn) {
      // Only check-in if not already checked-in
      performCheckIn(activeZone, name);
    } else if (!activeZone) {
      console.error("Face verified but no active zone found for check-in.");
      // Handle this case - maybe show an error message
      setProceedToFace(false); // Go back if no zone
      setFaceVerified(false);
    }
  };

  // Enhanced Dashboard UI Component
  const Dashboard = () => {
    const totalCheckIns = attendanceRecords.filter(
      (r) => r.action === "check-in"
    ).length;
    const totalCheckOuts = attendanceRecords.filter(
      (r) => r.action === "check-out"
    ).length;
    // Find last record of each type more robustly
    const lastCheckIn = [...attendanceRecords]
      .reverse()
      .find((r) => r.action === "check-in");
    const lastCheckOut = [...attendanceRecords]
      .reverse()
      .find((r) => r.action === "check-out");

    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 max-w-2xl mx-auto mt-10">
        <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center text-yellow-400 flex items-center justify-center gap-2">
          <MapPin className="inline-block" size={24} /> User Dashboard
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 text-center">
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Total Check-ins</div>
            <div className="text-2xl font-bold text-green-400">
              {totalCheckIns}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Total Check-outs</div>
            <div className="text-2xl font-bold text-blue-400">
              {totalCheckOuts}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 col-span-2 md:col-span-1">
            <div className="text-xs text-gray-400 mb-1">Early Check-outs</div>
            <div className="text-2xl font-bold text-yellow-400">
              {earlyCheckouts}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 col-span-2 md:col-span-3">
            <div className="text-xs text-gray-400">Last Check-in</div>
            <div className="text-sm sm:text-base font-semibold text-gray-200 mt-1 break-words">
              {lastCheckIn
                ? `${
                    lastCheckIn.locationName
                  } at ${lastCheckIn.timestamp.toLocaleString()}`
                : "-"}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 col-span-2 md:col-span-3">
            <div className="text-xs text-gray-400">Last Check-out</div>
            <div className="text-sm sm:text-base font-semibold text-gray-200 mt-1 break-words">
              {lastCheckOut
                ? `${
                    lastCheckOut.locationName
                  } at ${lastCheckOut.timestamp.toLocaleString()}`
                : "-"}
            </div>
          </div>
        </div>

        <h3 className="text-lg font-bold mb-3 text-yellow-300">
          Attendance History
        </h3>
        <div className="max-h-64 overflow-y-auto border border-gray-700 rounded-md">
          {attendanceRecords.length > 0 ? (
            <ul className="divide-y divide-gray-700">
              {attendanceRecords
                .slice() // Create a shallow copy before reversing
                .reverse()
                .map((record) => (
                  <li
                    key={record.id}
                    className="px-3 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between"
                  >
                    <div className="mb-1 sm:mb-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mr-2 whitespace-nowrap ${
                          record.action === "check-in"
                            ? "bg-green-700 text-green-200"
                            : "bg-blue-700 text-blue-200"
                        }`}
                      >
                        {record.action === "check-in" ? "IN" : "OUT"}
                      </span>
                      <span className="text-gray-200 font-medium text-sm break-words">
                        {record.locationName}
                      </span>
                    </div>
                    <div className="text-gray-400 text-xs sm:text-sm whitespace-nowrap pl-5 sm:pl-0">
                      {record.timestamp.toLocaleString()}
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 py-4">No records yet.</p>
          )}
        </div>

        <button
          className="mt-6 w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2.5 px-4 rounded transition duration-150 ease-in-out"
          onClick={() => setShowDashboard(false)}
        >
          Back to Attendance
        </button>
      </div>
    );
  };

  // Main Component Render
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 font-sans">
      {showDashboard ? (
        <Dashboard />
      ) : (
        <motion.div
          key="attendance-view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            {/* Replace with your actual logo */}
            <span className="text-xl font-bold text-yellow-400">
              GeoAttendance
            </span>
            {/* <img
               src="/logo.png"
               alt="Georilla Logo"
               className="h-10" // Adjust size
             /> */}
            <button
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 px-4 rounded transition text-sm"
              onClick={() => setShowDashboard(true)}
              disabled={attendanceRecords.length === 0} // Disable if no records
              title={
                attendanceRecords.length === 0
                  ? "No records to show"
                  : "View Dashboard"
              }
            >
              View Dashboard
            </button>
          </div>

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-xl overflow-hidden"
          >
            {/* Location Status Section */}
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold mb-3 text-yellow-400 flex items-center">
                <MapPin size={20} className="mr-2" /> Location Status
              </h2>
              <AnimatePresence mode="wait">
                {locationError ? (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center text-red-400 bg-red-900/30 p-2 rounded"
                  >
                    <AlertTriangle size={18} className="mr-2 flex-shrink-0" />
                    <p className="text-sm">{locationError}</p>
                  </motion.div>
                ) : loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center text-blue-400 p-2"
                  >
                    <Loader size={18} className="mr-2 animate-spin" />
                    <p className="text-sm">Fetching location...</p>
                  </motion.div>
                ) : currentLocation ? (
                  <motion.div
                    key="location"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-green-400 bg-green-900/20 p-2 rounded"
                  >
                    <div className="flex items-center mb-1">
                      <Check size={18} className="mr-2" />
                      <p className="text-sm font-medium">Location acquired</p>
                    </div>
                    <p className="text-gray-300 text-xs ml-6">
                      Coords: {formatCoordinates(currentLocation)}
                    </p>
                  </motion.div>
                ) : (
                  // Initial state before loading or if fails silently
                  <motion.div
                    key="no-location"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-yellow-400 p-2"
                  >
                    <p className="text-sm">Awaiting location data...</p>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Refresh Button */}
              <button
                onClick={() => setRefreshCounter((prev) => prev + 1)}
                className="text-xs text-blue-400 hover:text-blue-300 mt-2 flex items-center"
                disabled={loading}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`mr-1 ${loading ? "animate-spin" : ""}`}
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6" />
                  <path d="M22 11.5A10 10 0 0 1 3.5 22M2 12.5a10 10 0 0 1 18.5-10" />
                </svg>
                Refresh Location
              </button>
            </div>

            {/* Geofence & Actions Section */}
            <div className="p-4">
              {/* Face Recognition Step */}
              <AnimatePresence>
                {activeZone && proceedToFace && !faceVerified && (
                  <motion.div
                    key="face-rec"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 border border-yellow-600 rounded-lg p-4 bg-gray-700"
                  >
                    <h2 className="text-lg font-semibold mb-3 text-center text-yellow-400">
                      Face Verification
                    </h2>
                    <p className="text-sm text-center text-gray-300 mb-4">
                      Please look at the camera for check-in at{" "}
                      <span className="font-bold">{activeZone.name}</span>.
                    </p>
                    <FaceRecognition
                      onVerified={handleFaceVerified}
                      useCamera={true} // Ensure camera is enabled for this component instance
                    />
                    <button
                      onClick={() => setProceedToFace(false)}
                      className="mt-3 text-xs text-gray-400 hover:text-gray-200 w-full text-center"
                    >
                      Cancel
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Main Interaction UI (shown when not doing face recognition) */}
              {!proceedToFace && (
                <>
                  {/* Nearby Zones List */}
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold mb-2">Nearby Zones</h2>
                    {loading &&
                      (!currentLocation || nearbyZones.length === 0) && (
                        <p className="text-sm text-gray-400">
                          Checking for nearby zones...
                        </p>
                      )}
                    {!loading && nearbyZones.length > 0 ? (
                      <div className="space-y-2">
                        {nearbyZones.map((zone) => (
                          <motion.div
                            key={zone.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => selectZone(zone)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors duration-150 ease-in-out flex justify-between items-center ${
                              activeZone?.id === zone.id
                                ? "bg-blue-900/70 border border-blue-500 ring-2 ring-blue-500/50" // Enhanced active style
                                : "bg-gray-700 hover:bg-gray-600 border border-transparent"
                            }`}
                          >
                            <span className="font-medium text-sm">
                              {zone.name}
                            </span>
                            {activeZone?.id === zone.id && (
                              <Check
                                size={16}
                                className="text-green-400 ml-2"
                              />
                            )}
                          </motion.div>
                        ))}
                      </div>
                    ) : !loading && currentLocation ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-gray-700 p-3 rounded-lg text-yellow-400 flex items-center text-sm"
                      >
                        <AlertTriangle
                          size={18}
                          className="mr-2 flex-shrink-0"
                        />
                        <p>Not within any registered geofence zone.</p>
                      </motion.div>
                    ) : !loading && !currentLocation && !locationError ? (
                      <p className="text-sm text-gray-400">
                        Waiting for location to find zones...
                      </p>
                    ) : null}
                    {!loading && locationError && (
                      <p className="text-sm text-red-400 mt-2">
                        Cannot determine zones due to location error.
                      </p>
                    )}
                  </div>

                  {/* Check-in / Check-out Buttons */}
                  <motion.div
                    className="mt-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    {activeZone && faceVerified && checkedIn && (
                      <div className="mb-4 p-3 bg-green-900/30 rounded-lg text-center">
                        <p className="text-sm text-green-300 font-medium">
                          Checked in as{" "}
                          <span className="font-bold">{recognizedName}</span> at{" "}
                          <span className="font-bold">{activeZone.name}</span>.
                        </p>
                      </div>
                    )}
                    <div className="flex gap-3">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleInitiateCheckIn}
                        disabled={
                          !activeZone || checkedIn || loading || proceedToFace
                        }
                        className={`flex-1 py-3 rounded-lg flex items-center justify-center font-semibold text-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                          !activeZone || checkedIn || loading || proceedToFace
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-500 text-white focus:ring-green-500"
                        }`}
                      >
                        <LogIn size={18} className="mr-2" />
                        Check In
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleInitiateCheckOut} // Changed to initiate manual checkout
                        disabled={!checkedIn || loading || proceedToFace} // Can checkout manually even if zone changes, uses lastCheckedInZoneRef implicitly via handler
                        className={`flex-1 py-3 rounded-lg flex items-center justify-center font-semibold text-sm transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                          !checkedIn || loading || proceedToFace
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-500 text-white focus:ring-red-500"
                        }`}
                      >
                        <LogOut size={18} className="mr-2" />
                        Check Out
                      </motion.button>
                    </div>
                    {!activeZone && !loading && currentLocation && (
                      <p className="text-xs text-center text-yellow-500 mt-3">
                        You must be inside a geofence zone to check in.
                      </p>
                    )}
                    {checkedIn && activeZone && (
                      <p className="text-xs text-center text-green-400 mt-3">
                        Currently checked in at{" "}
                        {lastCheckedInZoneRef.current?.name}.
                      </p>
                    )}
                    {checkedIn && !activeZone && currentLocation && (
                      <p className="text-xs text-center text-yellow-500 mt-3">
                        Currently checked in, but outside registered zones.
                        Auto-checkout may occur.
                      </p>
                    )}
                  </motion.div>
                </>
              )}

              {/* Recent Activity (Only show if not doing face recognition) */}
              {!proceedToFace && attendanceRecords.length > 0 && (
                <motion.div
                  className="mt-6 pt-4 border-t border-gray-700"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-lg font-semibold mb-2">
                    Recent Activity
                  </h2>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {" "}
                    {/* Reduced max height */}
                    <AnimatePresence initial={false}>
                      {attendanceRecords
                        .slice(-3) // Show only last 3 records for brevity
                        .reverse()
                        .map((record) => (
                          <motion.div
                            key={record.id}
                            layout
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 30,
                            }}
                            className={`p-2.5 rounded-lg text-sm ${
                              record.action === "check-in"
                                ? "bg-green-900/40 border-l-4 border-green-600"
                                : "bg-blue-900/40 border-l-4 border-blue-600" // Changed checkout color
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium break-words mr-2">
                                {record.action === "check-in"
                                  ? `Checked In: ${record.locationName}`
                                  : `Checked Out: ${record.locationName}`}
                              </span>
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {record.timestamp.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  </div>
                  {attendanceRecords.length > 3 && (
                    <p className="text-xs text-center text-gray-500 mt-2">
                      View Dashboard for full history.
                    </p>
                  )}
                </motion.div>
              )}
            </div>

            {/* Footer Status */}
            <footer className="bg-gray-700/50 p-3 text-center text-sm text-gray-400 border-t border-gray-700">
              <p>
                Status:{" "}
                <span
                  className={
                    checkedIn
                      ? "text-green-400 font-semibold"
                      : "text-red-400 font-semibold"
                  }
                >
                  {checkedIn
                    ? `Checked In ${
                        lastCheckedInZoneRef.current
                          ? `at ${lastCheckedInZoneRef.current.name}`
                          : ""
                      }`
                    : "Checked Out"}
                </span>
              </p>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default GeolocationAttendanceSystem;
