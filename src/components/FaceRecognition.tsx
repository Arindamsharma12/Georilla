import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

const FaceRecognition: React.FC = () => {
  const [isModelsLoaded, setModelsLoaded] = useState(false);
  const imageUploadRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      await Promise.all([
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
      ]);
      setModelsLoaded(true);
    };
    loadModels();
  }, []);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !isModelsLoaded) return;

    if (imageRef.current) {
      imageRef.current.remove();
      imageRef.current = null;
    }
    if (canvasRef.current) {
      canvasRef.current.remove();
      canvasRef.current = null;
    }

    const file = event.target.files[0];
    const image = await faceapi.bufferToImage(file);
    imageRef.current = image;

    if (containerRef.current) {
      containerRef.current.appendChild(image);
    }

    const canvas = faceapi.createCanvasFromMedia(image);
    canvasRef.current = canvas;

    if (containerRef.current) {
      containerRef.current.appendChild(canvas);
    }

    const displaySize = { width: image.width, height: image.height };
    faceapi.matchDimensions(canvas, displaySize);

    const labeledFaceDescriptors = await loadLabeledImages();
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

    const detections = await faceapi
      .detectAllFaces(image)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));

    results.forEach((result, i) => {
      console.log(`Detected: ${result.label}`);
      const box = resizedDetections[i].detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
      drawBox.draw(canvas);
    });
  };

  const loadLabeledImages = async (): Promise<faceapi.LabeledFaceDescriptors[]> => {
    const labels = ['Pranay', 'Pushkar','Arindam']; // Add more labels if needed
    return Promise.all(
      labels.map(async (label) => {
        const descriptions: Float32Array[] = [];
        for (let i = 1; i <= 2; i++) {
          const img = await faceapi.fetchImage(`/pictures/${label}/${i}.jpg`);
          const detection = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection && detection.descriptor) {
            descriptions.push(detection.descriptor);
          }
        }
        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
  };

  return (
    <div>
      <h2>Face Recognition</h2>
      <input
        type="file"
        ref={imageUploadRef}
        onChange={handleImageChange}
        accept="image/*"
      />
      <div ref={containerRef} style={{ position: 'relative' }} />
      {!isModelsLoaded && <p>Loading models...</p>}
    </div>
  );
};

export default FaceRecognition;
