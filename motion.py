import cv2
import numpy as np

def detect_motion(video_path, threshold=5000000, cooldown=3):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)

    motion_timestamps = []
    prev_frame = None
    cooldown_counter = 0
    frame_number = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if prev_frame is None:
            prev_frame = gray
            continue

        diff = cv2.absdiff(prev_frame, gray)
        motion_score = np.sum(diff)

        if motion_score > threshold and cooldown_counter == 0:
            seconds = frame_number / fps
            motion_timestamps.append(seconds)
            cooldown_counter = int(cooldown * fps)

        if cooldown_counter > 0:
            cooldown_counter -= 1

        prev_frame = gray
        frame_number += 1

    cap.release()
    return motion_timestamps
