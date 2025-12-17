#!/usr/bin/env python3

import argparse
import json
import sys
import os

sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from highlight_tagger import predict_tags, extract_features
from motion import detect_motion

def analyze_video(video_path, motion_threshold=5000000, cooldown=3):
    results = {
        "video_path": video_path,
        "highlights": []
    }

    try:
        print(f"[1/2] Detecting motion in video...", file=sys.stderr)
        motion_timestamps = detect_motion(video_path, threshold=motion_threshold, cooldown=cooldown)
        print(f"Found {len(motion_timestamps)} motion events", file=sys.stderr)

        print(f"[2/2] Classifying highlights...", file=sys.stderr)
        tags = predict_tags(video_path)
        tags_list = list(tags) if tags else []
        print(f"Detected tags: {tags_list}", file=sys.stderr)

        for timestamp in motion_timestamps:
            highlight = {
                "timestamp": round(timestamp, 2),
                "tags": tags_list,
                "confidence": 0.85,
                "startWindow": max(0, round(timestamp - 3, 2)),
                "endWindow": round(timestamp + 3, 2)
            }
            results["highlights"].append(highlight)

        print(f"Analysis complete: {len(results['highlights'])} highlights found", file=sys.stderr)

    except Exception as e:
        print(f"Error during analysis: {str(e)}", file=sys.stderr)
        results["error"] = str(e)

    return results


def main():
    parser = argparse.ArgumentParser(description='Analyze video for highlights with AI')
    parser.add_argument('--video', required=True, help='Path to video file')
    parser.add_argument('--output', choices=['json', 'pretty'], default='json',
                       help='Output format')
    parser.add_argument('--threshold', type=int, default=5000000,
                       help='Motion detection threshold')
    parser.add_argument('--cooldown', type=int, default=3,
                       help='Cooldown period between detections (seconds)')

    args = parser.parse_args()

    # Validate video file exists
    if not os.path.exists(args.video):
        print(json.dumps({"error": f"Video file not found: {args.video}"}))
        sys.exit(1)

    # Run analysis
    results = analyze_video(
        args.video,
        motion_threshold=args.threshold,
        cooldown=args.cooldown
    )

    # Output results
    if args.output == 'json':
        print(json.dumps(results, indent=2))
    else:
        print(f"\n{'='*60}")
        print(f"Video Analysis Results")
        print(f"{'='*60}")
        print(f"Video: {results['video_path']}")
        print(f"Highlights found: {len(results['highlights'])}")
        print()
        for i, h in enumerate(results['highlights'], 1):
            print(f"{i}. At {h['timestamp']}s - {', '.join(h['tags'])}")
            print(f"   Window: {h['startWindow']}s to {h['endWindow']}s")
        print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
