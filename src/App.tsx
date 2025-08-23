import { useState, useRef, useEffect } from "react";
import "./App.css";

// Add type for recordings
interface Recording {
  audioDataUrl: string;
  timestamp: number;
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const mediaStreamRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Load recordings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("recordings");
    if (saved) {
      const parsed: Recording[] = JSON.parse(saved);
      setRecordings(parsed);
    }

    // Cleanup: revoke object URLs on unmount
    return () => {
      recordings.forEach((rec) => URL.revokeObjectURL(rec.audioDataUrl));
    };
  }, []);

  // Save new recording and update state
  const saveRecording = (audioBlob: Blob) => {
    // Convert Blob to Data URL (base64 string)
    const reader = new FileReader();
    reader.onload = () => {
      const base64DataUrl = reader.result as string;
      const newRecording = {
        audioDataUrl: base64DataUrl,
        timestamp: Date.now(),
        mimeType: audioBlob.type, // Save type for correctness
      };

      const updated = [newRecording, ...recordings];

      // Update state
      setRecordings(updated);
    };
    reader.readAsDataURL(audioBlob);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          saveRecording(event.data); // Save blob as recording
          console.log("Audio recorded and saved");
        }
      };

      mediaRecorder.start();
      mediaStreamRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      intervalRef.current = window.setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);

      console.log("Recording started...");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert(
        "Could not access microphone. Please ensure it is connected and permissions are granted."
      );
    }
  };

  const stopRecording = () => {
    if (mediaStreamRecorderRef.current && mediaStreamRecorderRef.current.state !== "inactive") {
      mediaStreamRecorderRef.current.stop();
      setIsRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      console.log("Recording stopped.");
    }
  };

  const handleStartRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleGetAnalysis = async (rec: Recording) => {
    //convert data url to blob
    const response = await fetch(rec.audioDataUrl);
    const audioBlob = await response.blob();

    //create a form data and append the audio file
    const formData = new FormData();

    formData.append("audio_file", audioBlob, `recording_${rec.timestamp}.webm`);

    const apiResponse = await fetch("http://localhost:8000/analyze-audio", {
      method: "POST",
      body: formData,
    });

    if (apiResponse.ok) {
      const result = await apiResponse.json();

      console.log("Analysis successfull", result);
    } else {
      console.error("API Error:", apiResponse.statusText);
      alert("Failed to get filler word analysis.");
    }
  };

  return (
    <>
      <section>
        <div>
          <h2>Hi, welcome to Filler, your personal speech coach</h2>
          <p>We are going to help you become better in your future presentation</p>
          <p>Click on the button to make a voice record of yourself making a presentation</p>
        </div>

        <div>
          <button
            onClick={handleStartRecording}
            className="py-2 px-4 bg-slate-300 mt-6 rounded-3xl"
          >
            {isRecording ? "Stop Recording" : "Click to start recording"}
          </button>
          {isRecording && <span style={{ marginLeft: "10px" }}>Recording: {recordingTime}s</span>}
        </div>

        {/* Recordings List */}
        <div style={{ marginTop: "40px" }}>
          <h3>Your Recordings</h3>
          {recordings.length === 0 ? (
            <p>No recordings yet. Start speaking!</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {recordings.map((rec, index) => (
                <li
                  key={index}
                  style={{
                    margin: "10px 0",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                  }}
                >
                  <div>
                    <strong>Recording {recordings.length - index}</strong> -{" "}
                    {formatTime(rec.timestamp)}
                  </div>
                  <audio
                    src={rec.audioDataUrl}
                    controls
                    style={{ marginTop: "10px", width: "100%" }}
                  />
                  <div className="flex gap-4 mt-6 text-sm">
                    <button
                      onClick={() => handleGetAnalysis(rec)}
                      className="bg-blue-100 px-4 py-2 rounded-full"
                    >
                      <p className="text-blue-600">Get analysis for filler words</p>
                    </button>
                    <button>delete</button>
                    <button>export</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

export default App;
