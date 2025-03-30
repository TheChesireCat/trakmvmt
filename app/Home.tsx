"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { useRef, useState } from "react";

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [frameShift, setFrameShift] = useState(5);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const ffmpegRef = useRef(new FFmpeg());
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const outputVideoRef = useRef<HTMLVideoElement | null>(null);
  const messageRef = useRef<HTMLParagraphElement | null>(null);

  const load = async () => {
    setIsLoading(true);
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
    const ffmpeg = ffmpegRef.current;
    ffmpeg.on("log", ({ message }) => {
      if (messageRef.current) messageRef.current.innerHTML = message;
    });
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    setLoaded(true);
    setIsLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSourceFile(file);
      const url = URL.createObjectURL(file);
      if (sourceVideoRef.current) {
        sourceVideoRef.current.src = url;
      }
      if (messageRef.current) {
        messageRef.current.innerHTML = "Video uploaded successfully!";
      }
    }
  };

  const processVideo = async () => {
    if (!sourceFile) {
      alert("Please upload a video first");
      return;
    }
    setProcessing(true);
    const ffmpeg = ffmpegRef.current;
    if (messageRef.current) {
      messageRef.current.innerHTML = "Processing video...";
    }
    // Write the uploaded file as input.mp4
    await ffmpeg.writeFile("input.mp4", await fetchFile(sourceFile));
    // Create an inverted copy of the video
    await ffmpeg.exec(["-i", "input.mp4", "-vf", "negate", "inverted.mp4"]);
    // Overlay the inverted copy (shifted by frameShift frames) over the original with 50% opacity
    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-i",
      "inverted.mp4",
      "-filter_complex",
      // `[1:v]setpts=PTS+${frameShift}/30[shifted];[0:v][shifted]blend=all_mode=overlay:all_opacity=0.5`,
      // "[1]format=yuva444p,colorchannelmixer=aa=0.5[in2];[0][in2]overlay",
      "[1]format=yuva444p,colorchannelmixer=aa=0.5,setpts=PTS+0.0333/TB[in2];[0][in2]overlay",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "output.mp4",
    ]);
    const data = await ffmpeg.readFile("output.mp4");
    if (outputVideoRef.current) {
      outputVideoRef.current.src = URL.createObjectURL(
        new Blob([data], { type: "video/mp4" })
      );
    }
    if (messageRef.current) {
      messageRef.current.innerHTML = "Processing complete!";
    }
    setProcessing(false);
  };

  return loaded ? (
    <div className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Source Video</h2>
        <video ref={sourceVideoRef} controls className="w-full max-w-md border" />
        <input type="file" accept="video/*" onChange={handleFileUpload} className="mt-2" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Processed Video</h2>
        <video ref={outputVideoRef} controls className="w-full max-w-md border" />
      </div>
      <div className="space-y-2">
        <label htmlFor="frameShift" className="block font-semibold">
          Frame Shift: {frameShift}
        </label>
        <input
          id="frameShift"
          type="range"
          min="0"
          max="30"
          value={frameShift}
          onChange={(e) => setFrameShift(Number(e.target.value))}
          className="w-full"
          disabled={processing}
        />
      </div>
      <div className="space-y-2">
        <button
          onClick={processVideo}
          className="bg-green-500 hover:bg-green-700 text-white py-3 px-6 rounded"
          disabled={processing || !sourceFile}
        >
          {processing ? "Processing..." : "Process Video"}
        </button>
      </div>
      <p ref={messageRef} className="text-center"></p>
    </div>
  ) : (
    <button
      onClick={load}
      className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] flex items-center bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded"
      disabled={isLoading}
    >
      Load ffmpeg-core
      {isLoading && (
        <span className="animate-spin ml-3">
          <svg
            viewBox="0 0 1024 1024"
            focusable="false"
            data-icon="loading"
            width="1em"
            height="1em"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M988 548c-19.9 0-36-16.1-36-36 0-59.4-11.6-117-34.6-171.3a440.45 440.45 0 00-94.3-139.9 437.71 437.71 0 00-139.9-94.3C629 83.6 571.4 72 512 72c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.3C772.3 66 827 103 874 150c47 47 83.9 101.8 109.7 162.7 26.7 63.1 40.2 130.2 40.2 199.3.1 19.9-16 36-35.9 36z"></path>
          </svg>
        </span>
      )}
    </button>
  );
}
