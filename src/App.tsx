import { useState, useRef, useEffect } from "react";
import "./App.css";
import Waveform from "./Waveform";
import { Navbar } from "./components/navbar/navbar";
import { Cassette } from "./assets/svg/cassette";

// Add type for recordings
interface Recording {
  audioDataUrl: string;
  timestamp: number;
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const [cassetteSpin, setCassetteSpin] = useState<boolean>(false);
  const [fileUpload, setFileUpload] = useState<File | null>(null);
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
    setMicrophoneError(null); // Clear previous errors
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
      setCassetteSpin(true);

      intervalRef.current = window.setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);

      console.log("Recording started...");
    } catch (error: any) {
      console.error("Error accessing microphone:", error);
      setMicrophoneError(error.message); // Set error message
    }
  };

  const stopRecording = () => {
    if (mediaStreamRecorderRef.current && mediaStreamRecorderRef.current.state !== "inactive") {
      mediaStreamRecorderRef.current.stop();
      setIsRecording(false);
      setCassetteSpin(false);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const files = e.currentTarget.files;

    if (files && files.length > 0) {
      setFileUpload(files[0]);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatRecordingTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => num.toString().padStart(2, "0");

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const prepareAudioFormData = async (
    rec: Recording | null,
    uploadedFile: File | null
  ): Promise<FormData> => {
    const formData = new FormData();

    if (uploadedFile) {
      formData.append("audio_file", uploadedFile);
      console.log({ uploadedFile });
    } else if (rec) {
      //convert data url to blob
      const response = await fetch(rec.audioDataUrl);
      const audioBlob = await response.blob();
      formData.append("audio_file", audioBlob, `recording_${rec.timestamp}.webm`);
    } else {
      throw new Error("No audio source provided");
    }

    return formData;
  };

  const handleGetAnalysis = async (rec: Recording | null) => {
    try {
      const formData = await prepareAudioFormData(rec, fileUpload);

      const apiResponse = await fetch("http://localhost:8000/analyze-audio", {
        method: "POST",
        body: formData,
      });

      if (apiResponse.ok) {
        const result = await apiResponse.json();

        console.log("Analysis successfull", result);
      } else {
        console.error("API Error:", apiResponse.statusText);
        throw new Error(`API Error: ${apiResponse.statusText}`);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Failed to get filler word analysis.");
      throw error;
    }
  };

  return (
    <div className="wrapper">
      <section className="container mx-auto h-screen">
        <Navbar />
        <div className="flex gap-40 w-full max-h-[90vh] ">
          {/* right section */}
          <section className="mt-6 w-1/2 min-h-full flex flex-col justify-center">
            <div className="flex flex-col gap-6">
              <div className="grid gap-4">
                <p className="text-6xl font-bold">
                  Lose the <span className="text-title-red">“ums”</span> and{" "}
                  <span className="text-title-green">Present</span> like a pro!
                </p>
                <p>Make smooth presentations without using filler word</p>
                <p>
                  Record or upload a presentation and let us analyse and make suggestions on how you
                  can improve and make presentations like a pro
                </p>
              </div>

              <div className="flex justify-center w-2/3">
                {/* <img
                  src="../record.jpg"
                  width={300}
                  height={300}
                  alt="sketch of a cassette player"
                  className="object-contain legwork"
                /> */}
                <Cassette cassetteSpin={cassetteSpin} />
              </div>
            </div>

            <div className="flex  gap-6 mt-6">
              <div
                className={`flex flex-row   ${
                  isRecording ? "bg-blue-100" : "bg-blue-600 text-white"
                }  w-fit rounded-full p-2 gap-4 border border-blue-200`}
              >
                {isRecording && (
                  <div className="flex gap-4 items-center">
                    <Waveform recordingTime={recordingTime} />
                    <span>{formatRecordingTime(recordingTime)}</span>
                  </div>
                )}
                <button onClick={handleStartRecording} className=" flex ">
                  {isRecording ? (
                    <div className="flex bg-blue-600 p-2 rounded-full gap-2">
                      <div className="flex item-center justify-center">
                        <span className="recording-icon bg-white w-4 h-4 rounded-full flex justify-center items-center [transform:translate(0px,2px)] "></span>
                      </div>
                      <p className=" w-full flex text-white font-semibold text-sm">
                        Stop Recording
                      </p>
                    </div>
                  ) : (
                    <p className="p-2 font-semibold "> Click to start recording</p>
                  )}
                </button>

                {microphoneError && <p style={{ color: "red" }}>{microphoneError}</p>}
              </div>
              <div className=" upload-wrapper  relative">
                <label className="sr-only">Upload file</label>
                <input
                  required
                  onChange={(e) => handleFileUpload(e)}
                  type="file"
                  accept="audio/*, video/*"
                  name="uploadfile"
                  id="uploadfile"
                  className=" absolute top-0 left-0 right-0 bottom-0 opacity-0 cursor-pointer"
                />
                <div className="uploadzone ">
                  <div className="default border p-2 rounded-full border-orange-400 bg-orange-100">
                    <button type="button" className=" font-semibold p-2 text-orange-500">
                      Browse Files
                    </button>
                  </div>
                  <div className="success text-buttongray text-sm  gap-4 flex flex-row bg-orange-100 items-center p-2 rounded-full ">
                    <p className="text-orange-600 italic">{`${fileUpload?.name?.slice(
                      0,
                      14
                    )}...`}</p>
                    <button
                      onClick={() => handleGetAnalysis(null)}
                      className="p-3 z-20 cursor-pointer bg-orange-500 text-white font-semibold rounded-full"
                    >
                      Analyze upload
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className="w-1/2 min-h-full">
            {/* Recordings List */}
            <div className="mt-6 bg-slate-100 h-full  rounded-2xl p-6">
              <h3 className="mb-4">Your Recordings</h3>
              {recordings.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-full gap-6">
                  <p>No recordings yet!</p>
                  <p className="w-2/3 text-center">
                    Click on the “Start recording” button ot upload a pre-recorded presentation to
                    get started
                  </p>
                </div>
              ) : (
                <ul className="list-none  h-[95%] overflow-y-scroll flex flex-col gap-4">
                  {recordings.map((rec, index) => (
                    <li key={index} className="bg-white p-4 rounded-2xl ">
                      <div>
                        <strong>Recording {recordings.length - index}</strong> -{" "}
                        {formatTime(rec.timestamp)}
                      </div>
                      <div className="flex items-center gap-4 mt-4">
                        <audio src={rec.audioDataUrl} controls />

                        <div className="flex gap-4 text-sm">
                          <button
                            onClick={() => handleGetAnalysis(rec)}
                            className=" bg-blue-50 px-4 py-2 rounded-full outline-2 outline-blue-400"
                          >
                            <p className="text-blue-600 font-semibold">Analyze</p>
                          </button>
                          <button>delete</button>
                          <button>export</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

export default App;
