import { useState, useRef, useEffect } from "react";
import "./App.css";
import Waveform from "./Waveform";
import { Navbar } from "./components/navbar/navbar";
import { Cassette } from "./assets/svg/cassette";
import { DialogModal } from "./components/dialog";
import { getAudioDuration } from "./utils/get-duration";

// Add type for recordings
interface Recording {
  audioDataUrl: string;
  timestamp: number;
}

interface AnalyzedAudioResult {
  transcription: string;
  status: string;
  ai_suggestions: string;
  analysis: {
    filler_word_count: Object;
    filler_word_percentage: string;
    total_filler_words: number;
    full_transcript: string;
    total_word: number;
  };
  db_entry_id: number;
  silence_analysis: {
    all_pauses: [
      {
        start: number;
        stop: number;
        duration: number;
      }
    ];
    longest_pause_seconds: number;
    number_of_long_pauses: number;
    pauses_over_2_second: [
      {
        start: number;
        stop: number;
        duration: number;
      }
    ];
  };
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [microphoneError, setMicrophoneError] = useState<string | null>(null);
  const [cassetteSpin, setCassetteSpin] = useState(false);
  const [fileUpload, setFileUpload] = useState<File | null>(null);
  const mediaStreamRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<number | null>(null);
  const analysisRefModal = useRef<HTMLDialogElement | null>(null);
  const [analyzeAudioResult, setAnalyzeAudioResult] = useState<AnalyzedAudioResult | null>(null);
  const [isloading, setIsLoading] = useState(false);

  // Save new recording and update state
  const saveRecording = async (audioBlob: Blob): Promise<Recording> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64DataUrl = reader.result as string;
        const newRecording: Recording = {
          audioDataUrl: base64DataUrl,
          timestamp: Date.now(),
        };
        resolve(newRecording);
      };
      reader.readAsDataURL(audioBlob);
    });
  };

  const startRecording = async () => {
    setMicrophoneError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = "audio/webm;codecs=opus";

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback to MP4/AAC which is better supported on Safari
        mimeType = "audio/mp4";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          // If all else fails, default to a generic audio/webm
          mimeType = "audio/webm";
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });

      mediaRecorder.ondataavailable = async (event: BlobEvent) => {
        if (event.data.size > 0) {
          const newRecording = await saveRecording(event.data);
          setRecordings((prevRecordings) => [newRecording, ...prevRecordings]);
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
      setMicrophoneError(error.message);
    }
  };

  const stopRecording = () => {
    if (mediaStreamRecorderRef.current && mediaStreamRecorderRef.current.state !== "inactive") {
      mediaStreamRecorderRef.current.stop();

      //stop all stream track
      const stream = mediaStreamRecorderRef.current.stream;
      stream.getTracks().forEach((track) => track.stop());
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
    console.log("handleStartRecording called");
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const files = e.currentTarget.files;

    if (files && files.length > 0) {
      setFileUpload(files[0]);

      try {
        const duration = await getAudioDuration(files[0]);
        console.log("Uploaded audio duration:", duration.toFixed(2), "seconds");
        // setUploadedFileDuration(duration);
      } catch (err) {
        console.error("Failed to get uploaded file duration", err);
      }
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
    setIsLoading(true);
    setTimeout(() => {
      analysisRefModal.current?.showModal();
    }, 100);
    try {
      const formData = await prepareAudioFormData(rec, fileUpload);

      const apiResponse = await fetch("http://localhost:8000/analyze-audio", {
        method: "POST",
        body: formData,
      });

      if (apiResponse.ok) {
        const result = await apiResponse.json();
        setIsLoading(false);
        setAnalyzeAudioResult(result);

        console.log("Analysis successfull", result);
      } else {
        console.error("API Error:", apiResponse.statusText);

        setIsLoading(false);
        throw new Error(`API Error: ${apiResponse.statusText}`);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      setIsLoading(false);
      analysisRefModal.current?.close();
      throw error;
    }
  };

  const handleOpenDialog = () => {
    if (analysisRefModal.current) {
      analysisRefModal.current.showModal();
    }
  };

  const handleCloseAudioAnalyisModal = () => {
    if (analysisRefModal.current) {
      analysisRefModal.current.close();
    }
  };

  return (
    <section className="relative w-full h-full">
      <div className="wrapper">
        <span className="stripe"></span>
        <span className="stripe"></span>
        <section className="container mx-auto h-screen">
          <Navbar />
          <div className="flex    ">
            <section className="w-1/2 flex flex-col gap-6">
              <div className="grid gap-4 w-full text-white">
                <p className="text-6xl font-bold ">
                  Lose the{" "}
                  <span className="relative  slide-text ">
                    {["'ums'", "'erms'", "'uh'"].map((word, index) => (
                      <span
                        key={index}
                        className={`absolute top-0 left-0 w-full bg-[#333]  ${
                          index === 0
                            ? "text-title-red"
                            : index === 1
                            ? "text-title-green"
                            : "text-blue-400"
                        }`}
                        style={{ animationDelay: `calc(${index}s * 2)` }}
                      >
                        {word}
                      </span>
                    ))}
                  </span>{" "}
                  <br />
                  and <span className="">present</span> like a pro!
                </p>
                <p>Practice your presentations without using filler word</p>
              </div>

              <DialogModal
                ref={analysisRefModal}
                handleCloseModal={handleCloseAudioAnalyisModal}
                isloading={isloading}
              >
                <div className="">
                  {isloading && <div className="">loading my add off</div>}
                  {analyzeAudioResult && (
                    <div className="">
                      <h3>Analysis Result</h3>
                      <p>AI Suggestions: {analyzeAudioResult.ai_suggestions}</p>
                      <p>Full Transcript: {analyzeAudioResult.analysis.full_transcript}</p>
                      <p>Total Filler Words: {analyzeAudioResult.analysis.total_filler_words}</p>
                      <p>
                        Filler Word Percentage: {analyzeAudioResult.analysis.filler_word_percentage}
                      </p>
                      <p>
                        Number of Long Pauses:{" "}
                        {analyzeAudioResult.silence_analysis.number_of_long_pauses}
                      </p>
                    </div>
                  )}
                </div>
              </DialogModal>

              <div className=" w-[30vw]">
                <Cassette cassetteSpin={cassetteSpin} />
              </div>

              <div className="flex gap-6  ">
                <div
                  className={`flex flex-row items-center   ${
                    isRecording ? "bg-blue-100" : "bg-blue-500  text-white"
                  }  w-fit rounded-full p-2 gap-4 border-2 border-blue-200`}
                >
                  {isRecording && (
                    <div className="flex gap-4 items-center">
                      <Waveform recordingTime={recordingTime} />
                      <span>{formatRecordingTime(recordingTime)}</span>
                    </div>
                  )}
                  <button onClick={handleStartRecording} className="flex relative z-20">
                    {isRecording ? (
                      <div className="flex bg-blue-600 p-2.5 rounded-full gap-2">
                        <div className="flex item-center justify-center">
                          <span className="recording-icon bg-white w-4 h-4 rounded-full flex justify-center items-center [transform:translate(0px,2px)] "></span>
                        </div>
                        <p className=" w-full flex text-white font-semibold text-sm">
                          Stop Recording
                        </p>
                      </div>
                    ) : (
                      <p className="p-2 font-semibold">Click to start recording</p>
                    )}
                  </button>

                  {microphoneError && <p style={{ color: "red" }}>{microphoneError}</p>}
                </div>
                <div className="upload-wrapper  relative">
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
                    <div className="default border-2 p-2 rounded-full border-white bg-[#333]">
                      <button type="button" className=" font-semibold p-2 text-white">
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

            <section className="w-1/2 h-auto absolute top-0 right-20 mt-6  ">
              {recordings.length > 0 && (
                <div
                  className="absolute inset-0 backdrop-blur rounded-2xl bg-slate-100/20 border border-slate-100/30"
                  aria-hidden="true"
                ></div>
              )}
              {/* Recordings List */}
              {recordings.length > 0 && (
                <div className="h-full z-10  rounded-2xl p-6 text-black relative border border-slate-100">
                  <h3 className="mb-4">Your Recordings</h3>

                  <ul className="list-none h-[80vh] overflow-y-scroll flex flex-col gap-4 scroll-box">
                    {recordings.map((rec, index) => (
                      <li
                        key={index}
                        className="bg-white opacity-95 backdrop-blur p-4 rounded-2xl "
                      >
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
                </div>
              )}
            </section>
          </div>

          {/* <button onClick={handleOpenDialog}>open sesame</button> */}
        </section>
      </div>
    </section>
  );
}

export default App;
