import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Check,
  MapPin,
  AlertTriangle,
  Loader,
  LogIn,
  LogOut,
  User,
  Camera,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import FaceRecognition from "./FaceRecognition";

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
  const distance = calculateDistance(
    coords.latitude,
    coords.longitude,
    zone.latitude,
    zone.longitude
  );
  return distance <= zone.radiusInMeters;
};

const GeolocationAttendanceSystem: React.FC = () => {
  const { signOut } = useClerk();
  const { user } = useUser();
  const navigate = useNavigate();
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
  const [refreshCounter, setRefreshCounter] = useState<number>(0);
  const [showDashboard, setShowDashboard] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [recognizedName, setRecognizedName] = useState<string | null>(null);
  const [proceedToFace, setProceedToFace] = useState(false);
  const [earlyCheckouts, setEarlyCheckouts] = useState<number>(0);
  const lastZoneRef = useRef<GeofenceZone | null>(null);

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
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Check for nearby geofence zones when location updates
  useEffect(() => {
    if (!currentLocation) return;

    const zones = GEOFENCE_ZONES.filter((zone) =>
      isWithinGeofence(currentLocation, zone)
    );

    setNearbyZones(zones);

    // Set active zone to the first nearby zone if available
    if (zones.length > 0 && !activeZone) {
      setActiveZone(zones[0]);
    } else if (zones.length === 0) {
      setActiveZone(null);
    }
  }, [currentLocation, activeZone]);

  // Initial location fetch
  useEffect(() => {
    fetchLocation();
  }, [fetchLocation, refreshCounter]);

  // Auto-checkout when user leaves geofence or at 8pm
  useEffect(() => {
    if (!checkedIn || !activeZone) return;
    // Listen for geofence exit
    if (lastZoneRef.current && lastZoneRef.current.id !== activeZone.id) {
      handleAutoCheckout();
    }
    lastZoneRef.current = activeZone;
    // Listen for 8pm auto-checkout
    const now = new Date();
    const eightPM = new Date(now);
    eightPM.setHours(20, 0, 0, 0);
    const msTo8pm = eightPM.getTime() - now.getTime();
    let timer: NodeJS.Timeout | null = null;
    if (msTo8pm > 0) {
      timer = setTimeout(() => {
        if (checkedIn) handleAutoCheckout(true);
      }, msTo8pm);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [checkedIn, activeZone]);

  const handleAutoCheckout = (is8pm = false) => {
    if (!activeZone) return;
    const now = new Date();
    const isEarly = now.getHours() < 20;
    if (isEarly && !is8pm) setEarlyCheckouts((prev) => prev + 1);
    const record: AttendanceRecord = {
      id: Date.now().toString(),
      timestamp: now,
      action: "check-out",
      locationName:
        activeZone.name + (is8pm ? " (Auto 8pm)" : isEarly ? " (Early)" : ""),
    };
    setAttendanceRecords((prev) => [...prev, record]);
    setCheckedIn(false);
  };

  // Handle check-in
  const handleCheckIn = () => {
    if (!activeZone) return;

    const record: AttendanceRecord = {
      id: Date.now().toString(),
      timestamp: new Date(),
      action: "check-in",
      locationName: activeZone.name,
    };

    setAttendanceRecords((prev) => [...prev, record]);
    setCheckedIn(true);
  };

  // Handle check-out
  const handleCheckOut = () => {
    if (!activeZone) return;

    const record: AttendanceRecord = {
      id: Date.now().toString(),
      timestamp: new Date(),
      action: "check-out",
      locationName: activeZone.name,
    };

    setAttendanceRecords((prev) => [...prev, record]);
    setCheckedIn(false);
  };

  // Format coordinates for display
  const formatCoordinates = (coords: Coordinates): string => {
    return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
  };

  // Refresh location data
  const refreshLocation = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  // Select a specific zone
  const selectZone = (zone: GeofenceZone) => {
    setActiveZone(zone);
  };

  // Handle face verification navigation
  const handleFaceVerify = () => {
    navigate("/face-api");
  };

  // Handler for successful face verification
  const handleFaceVerified = (name: string) => {
    setFaceVerified(true);
    setRecognizedName(name);
    // Automatically check in with recognized name
    if (activeZone) {
      const record: AttendanceRecord = {
        id: Date.now().toString(),
        timestamp: new Date(),
        action: "check-in",
        locationName: `${activeZone.name} (${name})`,
      };
      setAttendanceRecords((prev) => [...prev, record]);
      setCheckedIn(true);
      setShowDashboard(true);
    }
  };

  // Enhanced Dashboard UI
  const Dashboard = () => {
    const totalCheckIns = attendanceRecords.filter(
      (r) => r.action === "check-in"
    ).length;
    const totalCheckOuts = attendanceRecords.filter(
      (r) => r.action === "check-out"
    ).length;
    const lastCheckIn = attendanceRecords
      .filter((r) => r.action === "check-in")
      .slice(-1)[0];
    const lastCheckOut = attendanceRecords
      .filter((r) => r.action === "check-out")
      .slice(-1)[0];
    return (
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl mx-auto mt-10">
        <h2 className="text-2xl font-bold mb-6 text-center text-yellow-400 flex items-center justify-center gap-2">
          <MapPin className="inline-block" /> User Dashboard
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-400">Total Check-ins</div>
            <div className="text-2xl font-bold text-green-400">
              {totalCheckIns}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-400">Total Check-outs</div>
            <div className="text-2xl font-bold text-blue-400">
              {totalCheckOuts}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-400">Early Check-outs</div>
            <div className="text-2xl font-bold text-yellow-400">
              {earlyCheckouts}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-xs text-gray-400">Last Check-in</div>
            <div className="text-lg font-semibold text-gray-200">
              {lastCheckIn ? lastCheckIn.timestamp.toLocaleString() : "-"}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 text-center col-span-2 md:col-span-4">
            <div className="text-xs text-gray-400">Last Check-out</div>
            <div className="text-lg font-semibold text-gray-200">
              {lastCheckOut ? lastCheckOut.timestamp.toLocaleString() : "-"}
            </div>
          </div>
        </div>
        <h3 className="text-lg font-bold mb-2 text-yellow-300">
          Attendance History
        </h3>
        <ul className="divide-y divide-gray-700 max-h-64 overflow-y-auto">
          {attendanceRecords
            .slice()
            .reverse()
            .map((record) => (
              <li
                key={record.id}
                className="py-3 flex items-center justify-between"
              >
                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mr-2 ${
                      record.action === "check-in"
                        ? "bg-green-700 text-green-200"
                        : "bg-blue-700 text-blue-200"
                    }`}
                  >
                    {record.action.toUpperCase()}
                  </span>
                  <span className="text-gray-200 font-medium">
                    {record.locationName}
                  </span>
                </div>
                <div className="text-gray-400 text-sm">
                  {record.timestamp.toLocaleString()}
                </div>
              </li>
            ))}
        </ul>
        <button
          className="mt-6 w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 px-4 rounded transition"
          onClick={() => setShowDashboard(false)}
        >
          Back to Attendance
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      {showDashboard ? (
        <Dashboard />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex justify-between items-center mb-6">
            <img
              src="/logo.png"
              alt="Georilla Logo"
              className="h-15 w-70 mr-2 inline-block align-middle"
            />
            <button
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 px-4 rounded transition"
              onClick={() => setShowDashboard(true)}
            >
              View Dashboard
            </button>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-lg overflow-hidden"
          >
            {/* Show geofence UI if not in office */}
            {!activeZone && (
              <div className="p-4">
                <motion.div
                  className="mb-6 rounded-lg bg-gray-700 p-4"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-lg font-semibold mb-2">
                    Current Location
                  </h2>

                  <AnimatePresence mode="wait">
                    {locationError ? (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center text-red-400 mb-2"
                      >
                        <AlertTriangle size={18} className="mr-2" />
                        <p>{locationError}</p>
                      </motion.div>
                    ) : loading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center text-blue-400 mb-2"
                      >
                        <Loader size={18} className="mr-2 animate-spin" />
                        <p>Fetching location...</p>
                      </motion.div>
                    ) : currentLocation ? (
                      <motion.div
                        key="location"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="text-green-400 flex items-center mb-2">
                          <Check size={18} className="mr-2" />
                          <p>Location acquired</p>
                        </div>
                        <p className="text-gray-300 text-sm">
                          Coordinates: {formatCoordinates(currentLocation)}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="no-location"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-yellow-400"
                      >
                        <p>No location data</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  className="mb-6"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-lg font-semibold mb-2">Geofence Zones</h2>

                  {nearbyZones.length > 0 ? (
                    <div className="space-y-2">
                      {nearbyZones.map((zone) => (
                        <motion.div
                          key={zone.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => selectZone(zone)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            activeZone?.id === zone.id
                              ? "bg-blue-900 border border-blue-500"
                              : "bg-gray-700 hover:bg-gray-600"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{zone.name}</span>
                            <span className="text-xs bg-gray-800 px-2 py-1 rounded-full">
                              {zone.radiusInMeters}m
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : currentLocation ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-gray-700 p-3 rounded-lg text-yellow-400 flex items-center"
                    >
                      <AlertTriangle size={18} className="mr-2" />
                      <p>Not within any geofence zone</p>
                    </motion.div>
                  ) : null}
                </motion.div>

                <motion.div
                  className="mb-6"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCheckIn}
                      disabled={!activeZone || checkedIn}
                      className={`flex-1 py-3 rounded-lg flex items-center justify-center font-medium ${
                        !activeZone || checkedIn
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-500 text-white"
                      }`}
                    >
                      <LogIn size={18} className="mr-2" />
                      Check In
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCheckOut}
                      disabled={!activeZone || !checkedIn}
                      className={`flex-1 py-3 rounded-lg flex items-center justify-center font-medium ${
                        !activeZone || !checkedIn
                          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                          : "bg-red-600 hover:bg-red-500 text-white"
                      }`}
                    >
                      <LogOut size={18} className="mr-2" />
                      Check Out
                    </motion.button>
                  </div>
                </motion.div>

                {attendanceRecords.length > 0 && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h2 className="text-lg font-semibold mb-2">
                      Recent Activity
                    </h2>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      <AnimatePresence>
                        {attendanceRecords
                          .slice()
                          .reverse()
                          .map((record) => (
                            <motion.div
                              key={record.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className={`p-3 rounded-lg ${
                                record.action === "check-in"
                                  ? "bg-green-900/30 border-l-4 border-green-500"
                                  : "bg-red-900/30 border-l-4 border-red-500"
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">
                                  {record.action === "check-in"
                                    ? "Checked In"
                                    : "Checked Out"}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {record.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-300">
                                {record.locationName}
                              </p>
                            </motion.div>
                          ))}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
            {/* If in office, show office info and proceed button, then face recognition */}
            {activeZone && !proceedToFace && !faceVerified && (
              <div className="p-4 text-center">
                <h2 className="text-lg font-semibold mb-2 text-green-400">
                  You are within: {activeZone.name}
                </h2>
                <button
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
                  onClick={() => setProceedToFace(true)}
                >
                  Proceed to Face Recognition
                </button>
              </div>
            )}
            {activeZone && proceedToFace && !faceVerified && (
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-2 text-center">
                  Face Verification Required
                </h2>
                <FaceRecognition
                  onVerified={handleFaceVerified}
                  useCamera={true}
                />
              </div>
            )}
            {/* Show rest of the UI only if face is verified */}
            {activeZone && faceVerified && (
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-2 text-green-400 text-center">
                  Face Verified: {recognizedName}
                </h2>
              </div>
            )}
            <footer className="bg-gray-700 p-3 text-center text-sm text-gray-400">
              <p>Status: {checkedIn ? "Checked In" : "Checked Out"}</p>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default GeolocationAttendanceSystem;
