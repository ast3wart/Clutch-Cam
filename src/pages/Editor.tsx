import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

interface Highlight {
  timestamp: number;
  tags: string[];
  confidence: number;
  startWindow: number;
  endWindow: number;
}

interface Clip {
  id: number;
  startTime: number;
  endTime: number;
  highlight: Highlight;
  downloading: boolean;
}

export default function Editor() {
  const { videoId } = useParams();
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState("");
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [editingClip, setEditingClip] = useState<{ start: number; end: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const formatTag = (tag: string) => {
    return tag.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      'dunk': 'bg-red-500',
      'three_pointer': 'bg-blue-500',
      'deep_three': 'bg-purple-500',
      'buzzer_beater': 'bg-yellow-500',
      'clutch_shot': 'bg-orange-500',
      'layup': 'bg-green-500',
      'mid_range': 'bg-teal-500',
    };
    return colors[tag] || 'bg-gray-500';
  };

  useEffect(() => {
    loadVideo();
  }, [videoId]);

  const loadVideo = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/videos/${videoId}`);
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      setVideoUrl(data.video.url);
      setHighlights(data.video.highlights || []);

      const autoClips = (data.video.highlights || []).map((h: Highlight, i: number) => ({
        id: i,
        startTime: Math.max(0, h.timestamp - 5),
        endTime: h.timestamp + 5,
        highlight: h,
        downloading: false,
      }));

      setClips(autoClips);
      if (autoClips.length > 0) {
        setSelectedClip(autoClips[0]);
      }

      setLoading(false);
    } catch (error) {
      console.error(error);
      alert("Failed to load video: " + (error as Error).message);
    }
  };

  const playClip = (clip: Clip) => {
    if (!videoRef.current) return;
    setSelectedClip(clip);
    videoRef.current.currentTime = clip.startTime;
    videoRef.current.play();

    const checkTime = () => {
      if (videoRef.current && videoRef.current.currentTime >= clip.endTime) {
        videoRef.current.pause();
        videoRef.current.removeEventListener("timeupdate", checkTime);
      }
    };

    videoRef.current.addEventListener("timeupdate", checkTime);
  };

  const downloadClip = async (clip: Clip) => {
    try {
      setClips(clips.map(c => c.id === clip.id ? { ...c, downloading: true } : c));

      const res = await fetch("http://localhost:3001/api/trim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          startTime: clip.startTime,
          endTime: clip.endTime,
          outputName: `highlight_${clip.id + 1}`,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      window.open(`http://localhost:3001${data.outputVideo.downloadUrl}`, "_blank");

      setClips(clips.map(c => c.id === clip.id ? { ...c, downloading: false } : c));
    } catch (error) {
      console.error(error);
      alert("Download failed: " + (error as Error).message);
      setClips(clips.map(c => c.id === clip.id ? { ...c, downloading: false } : c));
    }
  };

  const updateClipTiming = (clipId: number, start: number, end: number) => {
    setClips(clips.map(c => c.id === clipId ? { ...c, startTime: start, endTime: end } : c));
    setEditingClip(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-2xl">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2">Highlight Editor</h1>
        <p className="text-gray-400 mb-8">Found {clips.length} highlights</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full"
              />
            </div>

            {selectedClip && (
              <div className="mt-4 bg-gray-900 p-6 rounded-lg">
                <h3 className="text-2xl font-semibold mb-4">Clip #{selectedClip.id + 1}</h3>
                <div className="mb-6">
                  <div className="text-sm text-gray-400 mb-2">Highlight Type{selectedClip.highlight.tags.length > 1 ? 's' : ''}:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedClip.highlight.tags.length > 0 ? (
                      selectedClip.highlight.tags.map((tag, i) => (
                        <span
                          key={i}
                          className={`${getTagColor(tag)} px-4 py-2 rounded-full text-white font-semibold text-lg`}
                        >
                          {formatTag(tag)}
                        </span>
                      ))
                    ) : (
                      <span className="bg-gray-700 px-4 py-2 rounded-full text-gray-300">No tags detected</span>
                    )}
                  </div>
                </div>

                {editingClip ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm mb-2">Start Time (seconds)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editingClip.start}
                        onChange={(e) => setEditingClip({ ...editingClip, start: parseFloat(e.target.value) })}
                        className="w-full bg-gray-800 px-4 py-2 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">End Time (seconds)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editingClip.end}
                        onChange={(e) => setEditingClip({ ...editingClip, end: parseFloat(e.target.value) })}
                        className="w-full bg-gray-800 px-4 py-2 rounded"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => updateClipTiming(selectedClip.id, editingClip.start, editingClip.end)}
                        className="bg-green-600 px-6 py-2 rounded hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingClip(null)}
                        className="bg-gray-700 px-6 py-2 rounded hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingClip({ start: selectedClip.startTime, end: selectedClip.endTime })}
                      className="bg-blue-600 px-6 py-2 rounded hover:bg-blue-700"
                    >
                      Edit Timing
                    </button>
                    <button
                      onClick={() => downloadClip(selectedClip)}
                      disabled={selectedClip.downloading}
                      className="bg-green-600 px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-600"
                    >
                      {selectedClip.downloading ? "Downloading..." : "Download Clip"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <h2 className="text-2xl font-semibold mb-4">Auto-Cropped Clips</h2>
            <div className="space-y-3">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  onClick={() => playClip(clip)}
                  className={`cursor-pointer p-4 rounded-lg transition-all ${
                    selectedClip?.id === clip.id
                      ? "bg-blue-600"
                      : "bg-gray-800 hover:bg-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-lg">Clip #{clip.id + 1}</div>
                    <div className="text-xs text-gray-300">
                      {clip.startTime.toFixed(1)}s - {clip.endTime.toFixed(1)}s
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {clip.highlight.tags.length > 0 ? (
                      clip.highlight.tags.map((tag, i) => (
                        <span
                          key={i}
                          className={`${getTagColor(tag)} px-2 py-1 rounded text-xs text-white font-medium`}
                        >
                          {formatTag(tag)}
                        </span>
                      ))
                    ) : (
                      <span className="bg-gray-700 px-2 py-1 rounded text-xs text-gray-300">
                        No tags
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                clips.forEach(clip => downloadClip(clip));
              }}
              className="w-full mt-4 bg-green-600 px-6 py-3 rounded-lg hover:bg-green-700 font-semibold"
            >
              Download All Clips
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
