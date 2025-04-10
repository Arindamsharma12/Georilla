import React, { useEffect, useState } from 'react';

interface Coordinates {
  latitude: number;
  longitude: number;
}

const Geofence: React.FC = () => {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isInsideFence, setIsInsideFence] = useState<boolean | null>(null);

  // Example Geofence center and radius (in meters)
  const geofenceCenter: Coordinates = {
    latitude: 28.590080, // example: New Delhi lat
    longitude: 77.230899, // example: New Delhi lng
  };
  const geofenceRadius = 10000; // 100 meters

  // Haversine formula to calculate distance between two geo points
  const getDistance = (point1: Coordinates, point2: Coordinates): number => {
    const R = 6371e3; // metres
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const d = R * c;
    return d;
  };

  const checkIfInsideFence = (location: Coordinates) => {
    const distance = getDistance(location, geofenceCenter);
    console.log("Distance from center:", distance.toFixed(2), "meters");
    setIsInsideFence(distance <= geofenceRadius);
  };

  useEffect(() => {
    const getLocation = () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setUserLocation(coords);
          checkIfInsideFence(coords);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    };

    getLocation();

    const interval = setInterval(getLocation, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 border rounded shadow-md w-full max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold mb-4">Geofence Status</h2>
      {userLocation ? (
        <div>
          <p>
            Your Location: <br />
            Lat: {userLocation.latitude.toFixed(5)}, Lng: {userLocation.longitude.toFixed(5)}
          </p>
          <p className="mt-4 text-lg font-semibold">
            Status:{' '}
            <span className={isInsideFence ? 'text-green-600' : 'text-red-600'}>
              {isInsideFence === null ? 'Checking...' : isInsideFence ? 'Inside Geofence' : 'Outside Geofence'}
            </span>
          </p>
        </div>
      ) : (
        <p>Fetching location...</p>
      )}
    </div>
  );
};

export default Geofence;
