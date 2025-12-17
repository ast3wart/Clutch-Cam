#!/usr/bin/env python3

import argparse
import sys
import os
import json
from moviepy import VideoFileClip

def trim_video(input_path, output_path, start_time, end_time):
    try:
        print(f"Loading video: {input_path}", file=sys.stderr)
        clip = VideoFileClip(input_path)

        duration = clip.duration
        start_time = max(0, float(start_time))
        end_time = min(float(end_time), duration)

        if start_time >= end_time:
            raise ValueError(f"Invalid time range: {start_time}s to {end_time}s")

        print(f"Trimming from {start_time}s to {end_time}s (duration: {end_time - start_time}s)", file=sys.stderr)

        trimmed = clip.subclip(start_time, end_time)

        print(f"Writing output to: {output_path}", file=sys.stderr)
        trimmed.write_videofile(
            output_path,
            codec='libx264',
            audio_codec='aac',
            temp_audiofile='temp-audio.m4a',
            remove_temp=True,
            logger=None
        )

        trimmed.close()
        clip.close()

        output_size = os.path.getsize(output_path)

        result = {
            "success": True,
            "input": input_path,
            "output": output_path,
            "start_time": start_time,
            "end_time": end_time,
            "duration": round(end_time - start_time, 2),
            "size": output_size
        }

        print(f"Trim complete: {output_path} ({output_size} bytes)", file=sys.stderr)
        return result

    except Exception as e:
        print(f"Error trimming video: {str(e)}", file=sys.stderr)
        return {
            "success": False,
            "error": str(e)
        }


def main():
    parser = argparse.ArgumentParser(description='Trim video to time range')
    parser.add_argument('--input', required=True, help='Input video file')
    parser.add_argument('--output', required=True, help='Output video file')
    parser.add_argument('--start', required=True, type=float, help='Start time (seconds)')
    parser.add_argument('--end', required=True, type=float, help='End time (seconds)')

    args = parser.parse_args()

    # Validate input file exists
    if not os.path.exists(args.input):
        print(json.dumps({"success": False, "error": f"Input file not found: {args.input}"}))
        sys.exit(1)

    # Ensure output directory exists
    output_dir = os.path.dirname(args.output)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    # Run trimming
    result = trim_video(args.input, args.output, args.start, args.end)

    # Output JSON result
    print(json.dumps(result, indent=2))

    if not result.get("success"):
        sys.exit(1)


if __name__ == "__main__":
    main()
