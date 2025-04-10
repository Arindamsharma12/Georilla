import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Geofence from './components/Geofence';

import GeolocationAttendanceSystem from './components/UI';

function App() {
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (loggedIn) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        {
          enableHighAccuracy:true,
          timeout:10000,
          maximumAge:0
        }
      );
    }
  }, [loggedIn]);

  return (
    // <div className="App" style={{ textAlign: 'center', color: '#fff', backgroundColor: '#1a1a1a', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
    //   {!loggedIn ? (
    //     <Login onLogin={() => setLoggedIn(true)} />
    //   ) : (
    //     <div style={{ padding: '40px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)', backgroundColor: '#1a1a1a' }}>
    //       <h1>Georilla 🦍</h1>
    //       <p>Latitude: {latitude}</p>
    //       <p>Longitude: {longitude}</p>
    //     </div>
    //   )}
    // </div>
    // <Geofence/>
    <GeolocationAttendanceSystem/>
  );
}

export default App;
