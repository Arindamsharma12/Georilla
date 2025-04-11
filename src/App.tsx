import React from 'react';
import FaceRecognition from './components/FaceRecognition.tsx';
import { Routes,Route } from 'react-router-dom';
import Geofence from './components/Geofence.tsx';
import GeolocationAttendanceSystem from './components/UI.tsx';


const App: React.FC = () => {
  return (
    <Routes>
      <Route path='/face-api' element={<div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Face Recognition App</h1>
      <FaceRecognition />
    </div>}/>
      <Route path='/' element={<GeolocationAttendanceSystem/>}/>
    </Routes>
  );
};

export default App;
