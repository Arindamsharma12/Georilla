import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // Keep toastify CSS

interface FaceRecognitionProps {
  onVerified?: (name: string) => void;
  useCamera?: boolean;
}

const FaceRecognition: React.FC<FaceRecognitionProps> = ({
  onVerified,
  useCamera,
}) => {
  const [isModelsLoaded, setModelsLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageUploadRef = useRef<HTMLInputElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (useCamera && cameraActive && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      });
    } else if (videoRef.current && videoRef.current.srcObject) {
      // Stop the camera if not using
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [useCamera, cameraActive]);

  useEffect(() => {
    setVideoReady(false); // Reset video ready state when camera is toggled
  }, [cameraActive]);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      try {
        console.log("Loading face-api models...");
        setModelsLoaded(false); // Set loading state
        await Promise.all([
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        console.log("Models loaded successfully!");
        toast.info("Face recognition models loaded.", { autoClose: 2000 });
      } catch (error) {
        console.error("Error loading face-api models:", error);
        toast.error("Failed to load face recognition models.");
        setModelsLoaded(false); // Ensure state reflects failure
      }
    };
    loadModels();
  }, []);

  const loadLabeledImages = async (): Promise<
    faceapi.LabeledFaceDescriptors[]
  > => {
    const labels = ["Pranay", "Pushkar", "Arindam"]; // Add more labels as needed
    console.log("Loading labeled images...");
    return Promise.all(
      labels.map(async (label) => {
        const descriptions: Float32Array[] = [];
        for (let i = 1; i <= 2; i++) {
          try {
            const imgUrl = `/pictures/${label}/${i}.jpg`;
            const img = await faceapi.fetchImage(imgUrl);
            console.log(`Workspaceing descriptor for ${label} (${i}.jpg)...`);
            const detection = await faceapi
              .detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (detection?.descriptor) {
              descriptions.push(detection.descriptor);
              console.log(`Descriptor found for ${label} (${i}.jpg)`);
            } else {
              console.warn(
                `No face detected or descriptor computed for ${label} (${i}.jpg). Check the image.`
              );
            }
          } catch (error) {
            console.error(
              `Error loading or processing image for ${label} (${i}.jpg):`,
              error
            );
            toast.warn(`Could not load/process image ${i}.jpg for ${label}.`);
          }
        }
        if (descriptions.length === 0) {
          console.warn(
            `No descriptors loaded for label: ${label}. This label will not be effective.`
          );
          toast.warn(
            `No reference images loaded successfully for ${label}. Recognition might fail.`
          );
        }
        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!event.target.files || event.target.files.length === 0) {
      toast.warn("No image file selected.");
      return;
    }
    if (!isModelsLoaded) {
      toast.error("Models are not loaded yet. Please wait.");
      return;
    }
    if (isProcessing) {
      toast.info("Already processing an image.");
      return;
    }

    setIsProcessing(true);
    toast.info("Processing image...", { autoClose: 1500 });

    // Cleanup previous results
    setImageUrl(null);
    if (canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      context?.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
      // Optionally remove canvas if you prefer recreating it fully
      // canvasRef.current.remove();
      // canvasRef.current = null;
    }
    if (imageRef.current) {
      imageRef.current.src = "";
    }

    const file = event.target.files[0];
    const imageBlobUrl = URL.createObjectURL(file);
    setImageUrl(imageBlobUrl); // Set URL for display in <img> tag

    const imageElement = new Image();
    imageElement.src = imageBlobUrl;

    // Use a Promise to handle image loading cleanly
    await new Promise((resolve, reject) => {
      imageElement.onload = resolve;
      imageElement.onerror = reject;
    }).catch((e) => {
      console.error("Error loading image element", e);
      toast.error("Could not load the selected image file.");
      setIsProcessing(false);
      setImageUrl(null);
      URL.revokeObjectURL(imageBlobUrl);
      throw new Error("Image load failed"); // Prevent further execution
    });

    imageRef.current = imageElement; // Assign ref after load

    // --- Setup Canvas ---
    if (!canvasRef.current && containerRef.current) {
      canvasRef.current = faceapi.createCanvasFromMedia(imageElement);
      containerRef.current.appendChild(canvasRef.current);
      // Apply Tailwind classes for absolute positioning directly or use inline styles
      // Using inline styles here for clarity as it's dynamically added
      canvasRef.current.style.position = "absolute";
      canvasRef.current.style.top = "0";
      canvasRef.current.style.left = "0";
      // Add Tailwind classes for sizing if needed, although matchDimensions handles it
      // canvasRef.current.classList.add('max-w-full', 'max-h-full');
    }

    const displaySize = {
      width: imageElement.width,
      height: imageElement.height,
    };
    if (canvasRef.current) {
      faceapi.matchDimensions(canvasRef.current, displaySize);
    } else {
      console.error("Canvas ref not available for matching dimensions.");
      toast.error("Error setting up drawing canvas.");
      setIsProcessing(false);
      URL.revokeObjectURL(imageBlobUrl); // Clean up blob URL
      return;
    }

    try {
      // --- Load Known Faces ---
      const labeledFaceDescriptors = await loadLabeledImages();
      if (labeledFaceDescriptors.every((ld) => ld.descriptors.length === 0)) {
        toast.error(
          "No known face descriptors loaded. Cannot perform recognition."
        );
        setIsProcessing(false);
        URL.revokeObjectURL(imageBlobUrl); // Clean up blob URL
        return;
      }
      const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);

      // --- Detect Faces ---
      console.log("Detecting faces in uploaded image...");
      const detections = await faceapi
        .detectAllFaces(imageElement, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detections.length) {
        toast.info("No faces detected in the uploaded image.");
        setIsProcessing(false);
        URL.revokeObjectURL(imageBlobUrl); // Clean up blob URL
        return;
      }
      console.log(`Detected ${detections.length} faces.`);

      // --- Match Faces ---
      const results = detections.map((d) =>
        faceMatcher.findBestMatch(d.descriptor)
      );
      let recognizedName: string | null = null;
      results.forEach((result) => {
        if (result.label !== "unknown") {
          recognizedName = result.label;
        }
      });
      if (recognizedName && onVerified) {
        onVerified(recognizedName);
      }

      // --- Match and Draw ---
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const context = canvasRef.current.getContext("2d");
      if (!context) {
        throw new Error("Could not get canvas context");
      }
      context.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );

      let foundKnownFace = false;
      results.forEach((result, i) => {
        const box = resizedDetections[i].detection.box;
        const drawBox = new faceapi.draw.DrawBox(box, {
          label: result.toString(),
          boxColor: result.label === "unknown" ? "red" : "aqua",
          drawLabelOptions: {
            // Style label text
            fontColor: "white",
            fontSize: 14,
            padding: 2,
            backgroundColor: result.label === "unknown" ? "red" : "blue",
          },
        });
        drawBox.draw(canvasRef.current as HTMLCanvasElement);

        // Trigger Toast Notification
        if (result.label === "unknown") {
          toast.warn(`Detected an unknown face.`);
          console.log(
            `Unknown face detected near [x: ${Math.round(
              box.x
            )}, y: ${Math.round(box.y)}]`
          );
        } else {
          toast.success(`Verified: ${result.label}!`);
          console.log(
            `Verified: ${result.label} (Distance: ${result.distance.toFixed(
              2
            )})`
          );
          foundKnownFace = true;
        }
      });

      if (!foundKnownFace && detections.length > 0) {
        toast.info("Detected faces, but none matched known individuals.");
      }
    } catch (error) {
      console.error("Error during face detection/recognition:", error);
      toast.error("An error occurred during face recognition.");
    } finally {
      setIsProcessing(false);
      URL.revokeObjectURL(imageBlobUrl); // Clean up blob URL after processing
    }
  };

  const handleUploadClick = () => {
    if (!isModelsLoaded) {
      toast.warn("Models are still loading, please wait.");
      return;
    }
    if (isProcessing) {
      toast.info("Already processing an image.");
      return;
    }
    imageUploadRef.current?.click();
  };

  // Camera capture handler
  const handleCapture = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Camera not ready. Please wait a moment and try again.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      setImageUrl(dataUrl);
      await processImageElement(canvas);
    }
  };

  // Helper to process an image/canvas element for face recognition
  const processImageElement = async (
    imgElement: HTMLImageElement | HTMLCanvasElement
  ) => {
    if (!isModelsLoaded) {
      toast.error("Models are not loaded yet. Please wait.");
      return;
    }
    setIsProcessing(true);
    try {
      const labeledFaceDescriptors = await loadLabeledImages();
      if (labeledFaceDescriptors.every((ld) => ld.descriptors.length === 0)) {
        toast.error(
          "No known face descriptors loaded. Cannot perform recognition."
        );
        setIsProcessing(false);
        return;
      }
      const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
      const detections = await faceapi
        .detectAllFaces(imgElement, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptors();
      if (!detections.length) {
        toast.info("No faces detected in the captured image.");
        setIsProcessing(false);
        return;
      }
      const results = detections.map((d) =>
        faceMatcher.findBestMatch(d.descriptor)
      );
      let recognizedName: string | null = null;
      results.forEach((result) => {
        if (result.label !== "unknown") {
          recognizedName = result.label;
        }
      });
      if (recognizedName && onVerified) {
        onVerified(recognizedName);
      }
      // Draw results (optional, similar to file upload)
      if (containerRef.current) {
        if (canvasRef.current) {
          containerRef.current.removeChild(canvasRef.current);
        }
        if (
          imgElement instanceof HTMLImageElement ||
          imgElement instanceof HTMLVideoElement
        ) {
          canvasRef.current = faceapi.createCanvasFromMedia(imgElement);
          containerRef.current.appendChild(canvasRef.current);
        }
        const displaySize = {
          width: imgElement.width,
          height: imgElement.height,
        };
        if (canvasRef.current) {
          faceapi.matchDimensions(canvasRef.current, displaySize);
        }
        const resizedDetections = faceapi.resizeResults(
          detections,
          displaySize
        );
        results.forEach((result, i) => {
          const box = resizedDetections[i].detection.box;
          const drawBox = new faceapi.draw.DrawBox(box, {
            label: result.toString(),
            boxColor: result.label === "unknown" ? "red" : "aqua",
            drawLabelOptions: {
              fontColor: "white",
              fontSize: 14,
              padding: 2,
              backgroundColor: result.label === "unknown" ? "red" : "blue",
            },
          });
          drawBox.draw(canvasRef.current as HTMLCanvasElement);
        });
      }
    } catch (error) {
      toast.error("An error occurred during face recognition.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-5 my-5 mx-auto max-w-2xl border border-gray-300 rounded-lg bg-gray-50 shadow-md">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        Face Recognition
      </h2>
      {useCamera ? (
        <div className="flex flex-col items-center mb-6 w-full">
          <video
            ref={videoRef}
            className="rounded-lg border mb-4 w-full max-w-md"
            autoPlay
            playsInline
            onCanPlay={() => setVideoReady(true)}
          />
          <button
            className="py-2 px-5 text-base text-white font-medium bg-blue-600 rounded-md cursor-pointer transition-colors duration-200 ease-in-out hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={handleCapture}
            disabled={isProcessing || !isModelsLoaded || !videoReady}
          >
            {isProcessing ? "Processing..." : "Capture & Verify"}
          </button>
          <button
            className="mt-2 py-1 px-3 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
            onClick={() => setCameraActive((prev) => !prev)}
          >
            {cameraActive ? "Stop Camera" : "Start Camera"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center mb-6">
          <input
            type="file"
            ref={imageUploadRef}
            onChange={handleImageChange}
            accept="image/jpeg, image/png, image/webp"
            className="hidden"
            disabled={isProcessing || !isModelsLoaded}
          />
          <button
            className="py-2 px-5 mb-3 text-base text-white font-medium bg-blue-600 rounded-md cursor-pointer transition-colors duration-200 ease-in-out hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={handleUploadClick}
            disabled={isProcessing || !isModelsLoaded}
          >
            {isProcessing ? "Processing..." : "Upload Image"}
          </button>
          {!isModelsLoaded && (
            <p className="text-sm text-gray-600 animate-pulse">
              Loading models...
            </p>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        className="relative w-full max-w-full min-h-[150px] max-h-[65vh] overflow-hidden mt-3 border border-gray-200 bg-white flex justify-center items-center shadow-inner"
      >
        {imageUrl ? (
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Uploaded for face recognition"
            className="block max-w-full max-h-[65vh] h-auto object-contain"
          />
        ) : (
          <span className="text-gray-400">Image will appear here</span>
        )}
      </div>
    </div>
  );
};

export default FaceRecognition;
