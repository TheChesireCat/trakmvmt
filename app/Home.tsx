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
        new Blob([data.buffer], { type: "video/mp4" })
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

// "use client";

// import { FFmpeg } from "@ffmpeg/ffmpeg";
// import { fetchFile, toBlobURL } from "@ffmpeg/util";
// import { useRef, useState } from "react";

// export default function Home() {
//   const [loaded, setLoaded] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const ffmpegRef = useRef(new FFmpeg());
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const messageRef = useRef<HTMLParagraphElement | null>(null);

//   const load = async () => {
//     setIsLoading(true);
//     const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
//     const ffmpeg = ffmpegRef.current;
//     ffmpeg.on("log", ({ message }) => {
//       if (messageRef.current) messageRef.current.innerHTML = message;
//     });
//     // toBlobURL is used to bypass CORS issue, urls with the same
//     // domain can be used directly.
//     await ffmpeg.load({
//       coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
//       wasmURL: await toBlobURL(
//         `${baseURL}/ffmpeg-core.wasm`,
//         "application/wasm"
//       ),
//     });
//     setLoaded(true);
//     setIsLoading(false);
//   };

//   const transcode = async () => {
//     const ffmpeg = ffmpegRef.current;
//     // u can use 'https://ffmpegwasm.netlify.app/video/video-15s.avi' to download the video to public folder for testing
//     await ffmpeg.writeFile(
//       "input.avi",
//       await fetchFile(
//         "https://raw.githubusercontent.com/ffmpegwasm/testdata/master/video-15s.avi"
//       )
//     );
//     await ffmpeg.exec(["-i", "input.avi", "output.mp4"]);
//     const data = (await ffmpeg.readFile("output.mp4")) as any;
//     if (videoRef.current)
//       videoRef.current.src = URL.createObjectURL(
//         new Blob([data.buffer], { type: "video/mp4" })
//       );
//   };

//   return loaded ? (
//     <div className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
//       <video ref={videoRef} controls></video>
//       <br />
//       <button
//         onClick={transcode}
//         className="bg-green-500 hover:bg-green-700 text-white py-3 px-6 rounded"
//       >
//         Transcode avi to mp4
//       </button>
//       <p ref={messageRef}></p>
//     </div>
//   ) : (
//     <button
//       className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] flex items-center bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded"
//       onClick={load}
//     >
//       Load ffmpeg-core
//       {isLoading && (
//         <span className="animate-spin ml-3">
//           <svg
//             viewBox="0 0 1024 1024"
//             focusable="false"
//             data-icon="loading"
//             width="1em"
//             height="1em"
//             fill="currentColor"
//             aria-hidden="true"
//           >
//             <path d="M988 548c-19.9 0-36-16.1-36-36 0-59.4-11.6-117-34.6-171.3a440.45 440.45 0 00-94.3-139.9 437.71 437.71 0 00-139.9-94.3C629 83.6 571.4 72 512 72c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.3C772.3 66 827 103 874 150c47 47 83.9 101.8 109.7 162.7 26.7 63.1 40.2 130.2 40.2 199.3.1 19.9-16 36-35.9 36z"></path>
//           </svg>
//         </span>
//       )}
//     </button>
//   );
// }


// "use client";

// import React, { useState, useRef } from "react";
// import { FFmpeg } from "@ffmpeg/ffmpeg";
// import { fetchFile, toBlobURL } from "@ffmpeg/util";

// export default function Home() {
//   const [loaded, setLoaded] = useState(false);
//   const [processing, setProcessing] = useState(false);
//   const [frameShift, setFrameShift] = useState(5);
//   const [message, setMessage] = useState("");
//   const ffmpegRef = useRef(new FFmpeg());
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const inputVideoRef = useRef<HTMLVideoElement>(null);

//   const load = async () => {
//     try {
//       setMessage("Loading FFmpeg...");
//       const ffmpeg = ffmpegRef.current;
//       ffmpeg.on("log", ({ message }) => {
//         setMessage(message);
//         console.log(message);
//       });
//       await ffmpeg.load({
//         coreURL: await toBlobURL(
//           "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js",
//           "text/javascript"
//         ),
//         wasmURL: await toBlobURL(
//           "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm",
//           "application/wasm"
//         ),
//       });
//       setLoaded(true);
//       setMessage("FFmpeg loaded successfully!");
//     } catch (error) {
//       console.error("Error loading FFmpeg:", error);
//       setMessage(`Error loading FFmpeg: ${error}`);
//     }
//   };

//   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file && inputVideoRef.current) {
//       const url = URL.createObjectURL(file);
//       inputVideoRef.current.src = url;
//       setMessage("Video uploaded successfully!");
//     }
//   };

//   const processVideo = async () => {
//     if (!inputVideoRef.current?.src) {
//       alert("Please upload a video first");
//       return;
//     }
//     try {
//       setProcessing(true);
//       const ffmpeg = ffmpegRef.current;
//       const inputVideoSrc = inputVideoRef.current.src;
//       setMessage("Loading video...");
//       await ffmpeg.writeFile("input.mp4", await fetchFile(inputVideoSrc));
//       setMessage("Creating inverted copy...");
//       await ffmpeg.exec(["-i", "input.mp4", "-vf", "negate", "inverted.mp4"]);
//       setMessage("Processing video effect...");
//       await ffmpeg.exec([
//         "-i",
//         "input.mp4",
//         "-i",
//         "inverted.mp4",
//         "-filter_complex",
//         `[1:v]setpts=PTS+${frameShift}/30[shifted];[0:v][shifted]blend=all_mode=overlay:all_opacity=0.5`,
//         "-c:v",
//         "libx264",
//         "-preset",
//         "fast",
//         "output.mp4",
//       ]);
//       setMessage("Finalizing...");
//       const data = await ffmpeg.readFile("output.mp4");
//       if (videoRef.current) {
//         videoRef.current.src = URL.createObjectURL(
//           new Blob([data.buffer], { type: "video/mp4" })
//         );
//       }
//       setMessage("Processing complete!");
//     } catch (error) {
//       console.error("Error processing video:", error);
//       setMessage(`Error processing video: ${error}`);
//     } finally {
//       setProcessing(false);
//     }
//   };

//   return (
//     <main className="container mx-auto py-8 px-4 max-w-4xl">
//       <h1 className="text-2xl font-bold mb-6 text-center">
//         Video Effect Processor
//       </h1>
//       <div className="mb-8 p-4 border rounded-md">
//         <h2 className="text-xl font-semibold mb-4">Input Video</h2>
//         <video
//           ref={inputVideoRef}
//           controls
//           className="w-full mb-4 bg-black"
//           style={{ maxHeight: "300px" }}
//         ></video>
//         <div className="flex gap-4">
//           <input
//             type="file"
//             accept="video/*"
//             onChange={handleFileUpload}
//             className="flex-1"
//             id="video-upload"
//           />
//           <label htmlFor="video-upload" className="sr-only">
//             Upload video
//           </label>
//         </div>
//       </div>
//       <div className="mb-8 p-4 border rounded-md">
//         <h2 className="text-xl font-semibold mb-4">Frame Shift Control</h2>
//         <div className="flex items-center gap-4">
//           <label htmlFor="frame-shift" className="min-w-24">
//             Frame Shift: {frameShift}
//           </label>
//           <input
//             id="frame-shift"
//             type="range"
//             min="0"
//             max="30"
//             value={frameShift}
//             onChange={(e) => setFrameShift(Number.parseInt(e.target.value))}
//             className="flex-1"
//             disabled={processing}
//           />
//         </div>
//       </div>
//       <div className="mb-8 p-4 border rounded-md">
//         <h2 className="text-xl font-semibold mb-4">Output Video</h2>
//         <video
//           ref={videoRef}
//           controls
//           className="w-full mb-4 bg-black"
//           style={{ maxHeight: "300px" }}
//         ></video>
//       </div>
//       <div className="flex justify-center mb-4">
//         {!loaded ? (
//           <button
//             onClick={load}
//             className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
//             disabled={processing}
//           >
//             Load FFmpeg-core (~31 MB)
//           </button>
//         ) : (
//           <button
//             onClick={processVideo}
//             className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
//             disabled={processing || !inputVideoRef.current?.src}
//           >
//             {processing ? "Processing..." : "Process Video"}
//           </button>
//         )}
//       </div>
//       <p className="text-center mb-2 min-h-6">{message}</p>
//       <p className="text-center text-sm text-gray-500">
//         Open Developer Tools (Ctrl+Shift+I) to View Logs
//       </p>
//     </main>
//   );
// }