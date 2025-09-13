import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Pie,
  PieChart,
} from "recharts";
import { PauseVisualization } from "../components/pause-visualization";

// Individual pause event
interface PauseEvent {
  start: number;
  stop: number;
  duration: number;
}

// Analysis object
interface Analysis {
  full_transcript: string;
  total_words: number;
  filler_word_counts: Record<string, number>; // e.g., { "uh": 5, "um": 3 }
  total_filler_words: number;
  filler_word_percentage: string; // formatted as percentage
}

// Silence analysis
interface SilenceAnalysis {
  total_silence_duration_seconds: number;
  number_of_long_pauses: number;
  longest_pause_seconds: number;
  pauses_over_2_seconds: PauseEvent[];
  all_pauses: PauseEvent[];
}

// AI Suggestions (parsed JSON structure)
interface AiSuggestionsContent {
  suggestions: string[];
  rewritten_transcript: string;
  summary: string;
}

// Main transcription entry
interface AudioTranscription {
  id: number;
  audio_name: string;
  audio_file_path: string;
  transcription: string;
  ai_suggestions: string;
  parsedAiSuggestions?: AiSuggestionsContent | null;
  analysis: Analysis;
  silence_analysis: SilenceAnalysis;
}

//array of transcriptions
type AudioTranscriptionList = AudioTranscription[];

export default function Analysis() {
  const [audioAnalysisData, setAudioAnalysisData] = useState<AudioTranscriptionList>([]);
  const [currentAudioAnalysis, setCurrentAudioAnalysis] = useState<AudioTranscription | null>(null);
  console.log("audio", audioAnalysisData);

  const parseAiSuggestions = (raw: string): AiSuggestionsContent | null => {
    try {
      const jsonStr = raw.replace(/^```json\s*|\s*```$/g, "").trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse ai_suggestions", e);
      return null;
    }
  };

  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        const response = await fetch("http://localhost:8000/transcriptions", {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AudioTranscriptionList = await response.json();
        const enrichedData: AudioTranscriptionList = (data as AudioTranscription[]).map((item) => ({
          ...item,
          parsedAiSuggestions: parseAiSuggestions(item?.ai_suggestions),
        }));
        setAudioAnalysisData(enrichedData);
      } catch (error) {
        console.error("Failed to fetch transcriptions:", error);
      }
    };

    fetchAnalysisData();
  }, []);

  // if (audioAnalysisData.length === 0) {
  //   return <div className="container mx-auto p-4">Loading...</div>;
  // }

  const handleSetCurrentAudioAnalysis = (index: number) => {
    const audioTranscript = audioAnalysisData[index];
    setCurrentAudioAnalysis(audioTranscript);
  };

  const transcription = currentAudioAnalysis
    ? currentAudioAnalysis
    : audioAnalysisData[audioAnalysisData.length - 1];
  const ai = transcription?.parsedAiSuggestions;

  console.log(ai);

  const data = Object.entries(transcription?.analysis?.filler_word_counts || {}).map(
    ([word, count]) => ({
      word,
      count,
    })
  );

  const extractTimestampFromFilename = (filename: string) => {
    const match = filename.match(/recording_(\d+)\.webm$/);

    if (match) {
      const timestamp = parseInt(match[1], 10);
      const formattedTime = new Date(timestamp).toLocaleDateString();
      console.log(formattedTime);

      return formattedTime;
    }

    return null;
  };

  return (
    <section className="flex">
      {/* LEFT COLUMN */}
      <section className="w-[18rem] h-screen pl-4 pt-4">
        <h3 className="font-sembpld text-slate-400">Recording list</h3>
        <ul className="grid  w-full mt-4">
          {audioAnalysisData.length > 0 ? (
            audioAnalysisData.map((audioAnalysis, index) => (
              <li key={index} className="w-full flex">
                <a
                  role="button"
                  onClick={() => handleSetCurrentAudioAnalysis(index)}
                  className="cursor-pointer w-full py-2 hover:bg-slate-100 pl-4 hover:rounded-l-xl"
                >
                  {`recording ${extractTimestampFromFilename(audioAnalysis.audio_name)}`}
                </a>
              </li>
            ))
          ) : (
            <li>No list</li>
          )}
        </ul>
      </section>
      {/*  RIGHT COLUMN */}
      <section className="w-full bg-slate-100 rounded-xl p-4 ">
        <h2>Analysis</h2>
        {audioAnalysisData.length > 0 ? (
          <section className="grid grid-cols-5 grid-rows-6 gap-4 h-[calc(100%-2rem)]">
            <div className="bg-white row-span-2 p-4 col-span-2 text-sm max-h-[50vh] overflow-y-scroll rounded-xl">
              <h4 className="text-lg font-semibold mb-2 text-slate-400">
                Original audio transcription
              </h4>
              <p> {transcription.transcription}</p>
            </div>
            <div className="col-span-3 row-span-6  bg-white p-4 rounded-xl">
              <div className="">
                <div className=" bg-white grid-cols-2 grid gap-4">
                  <div className="p-4 bg-slate-100 rounded-xl">
                    <h4 className=" text-lg font-semibold mb-2 text-slate-400">
                      Filler words analysis
                    </h4>
                    <div className="grid-cols-3 grid  gap-2">
                      <div className="text-center">
                        <h4 className="text-xs">Total words</h4>
                        <p className="font-semibold">{transcription.analysis.total_words}</p>
                      </div>
                      <div className="text-center">
                        <h4 className="text-xs">Total fillers</h4>
                        <p className="font-semibold">{transcription.analysis.total_filler_words}</p>
                      </div>
                      <div className="text-center">
                        <h4 className="text-xs">Filler %</h4>
                        <p className="font-semibold">
                          {transcription.analysis.filler_word_percentage}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data}>
                          <XAxis dataKey="word" fontSize={14} />
                          <YAxis
                            fontSize={14}
                            label={{
                              value: "Frequency",
                              angle: -90,
                            }}
                          />
                          <Tooltip />
                          <Legend align="right" fontSize={12} />
                          <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                          <Bar
                            dataKey="count"
                            fill="#3b82f6"
                            name="Frequency"
                            barSize={20}
                            background={{ fill: "#e4e4e4" }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-100 ">
                    <h4 className="mb-2 font-semibold text-slate-400">Silence analysis</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <h5 className="text-xs">Total pauses</h5>
                        <p className="font-semibold">
                          {transcription.silence_analysis.total_silence_duration_seconds}
                        </p>
                      </div>
                      <div className="text-center">
                        <h5 className="text-xs">longest pause</h5>
                        <p className="font-semibold">
                          {transcription.silence_analysis.longest_pause_seconds}
                        </p>
                      </div>
                      <div className="text-center">
                        <h5 className="text-xs">Num of pauses</h5>
                        <p className="font-semibold">
                          {transcription.silence_analysis.number_of_long_pauses}
                        </p>
                      </div>
                    </div>
                    <div>
                      <PauseVisualization silence_analysis={transcription.silence_analysis} />
                      {/* <PieChart width={400} height={400}>
                      <Pie
                        activeShape={{
                          fill: "red",
                        }}
                        data={[
                          { name: "Page A", uv: 590 },
                          { name: "Page B", uv: 590 },
                          { name: "Page C", uv: 868 },
                        ]}
                        dataKey="uv"
                      />
                      <Tooltip defaultIndex={2} />
                    </PieChart> */}
                    </div>
                  </div>
                </div>
                <div className="border border-blue-100 p-4 mt-4 rounded-xl">
                  <h4 className="text-lg font-semibold mb-2 text-slate-400">Suggestions</h4>
                  <ul className="text-sm grid gap-4">
                    {ai?.suggestions.map((suggestion, index) => (
                      <li
                        key={index}
                        className="border border-blue-100 p-3 rounded-xl font-semibold"
                      >
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid col-span-2 row-span-4 p-4 bg-white gap-6 rounded-xl">
              <div className="bg-slate-100 p-4 rounded-xl">
                <h4 className="text-lg font-semibold mb-2 text-slate-400">
                  Re-written audio transcription
                </h4>
                <p className="text-sm">{ai?.rewritten_transcript}</p>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-2 text-slate-400">Summary</h4>
                <p className="text-sm">{ai?.summary}</p>
              </div>
            </div>
          </section>
        ) : (
          <>No transcription analysis yet!</>
        )}
      </section>
    </section>
  );
}
