import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Upload() {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState("");
  const navigate = useNavigate();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setProgress("Uploading video...");

      const formData = new FormData();
      formData.append("video", file);

      const uploadRes = await fetch("http://localhost:3001/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error);

      const videoId = uploadData.video.id;
      setUploading(false);
      setAnalyzing(true);
      setProgress("Analyzing highlights...");

      const analyzeRes = await fetch(`http://localhost:3001/api/analyze/${videoId}`, {
        method: "POST",
      });

      const analyzeData = await analyzeRes.json();
      if (!analyzeData.success) throw new Error(analyzeData.error);

      const jobId = analyzeData.jobId;

      const pollStatus = setInterval(async () => {
        const statusRes = await fetch(`http://localhost:3001/api/analyze/status/${jobId}`);
        const statusData = await statusRes.json();

        if (statusData.status === "complete") {
          clearInterval(pollStatus);
          navigate(`/editor/${videoId}`);
        } else if (statusData.status === "failed") {
          clearInterval(pollStatus);
          alert("Analysis failed: " + statusData.error);
          setAnalyzing(false);
          setProgress("");
        }
      }, 1000);
    } catch (error) {
      console.error(error);
      alert("Upload failed: " + (error as Error).message);
      setUploading(false);
      setAnalyzing(false);
      setProgress("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-8">ClutchCam</h1>
        <p className="text-xl text-gray-400 mb-12">AI-Powered Sports Highlight Editor</p>

        {!uploading && !analyzing && (
          <label className="cursor-pointer inline-block">
            <input
              type="file"
              accept="video/*"
              onChange={handleUpload}
              className="hidden"
            />
            <div className="bg-white text-black px-12 py-6 rounded-lg text-2xl font-semibold hover:bg-gray-100 transition-all transform hover:scale-105">
              Upload Video
            </div>
          </label>
        )}

        {(uploading || analyzing) && (
          <div className="bg-white/10 backdrop-blur-sm px-12 py-6 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="text-white text-xl">{progress}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
