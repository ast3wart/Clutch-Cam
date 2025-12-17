import os
import re
import sys
import librosa
import numpy as np
from moviepy import VideoFileClip
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import make_pipeline
from sklearn.multioutput import MultiOutputClassifier
from sklearn.model_selection import train_test_split
from joblib import dump, load
import cv2

# === CONFIG ===
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "../video_scraper/nba_clips")
TAGS = ['dunk', 'three_pointer', 'deep_three', 'buzzer_beater', 'clutch_shot', 'layup', 'mid_range']
MODEL_PATH = os.path.join(SCRIPT_DIR, "highlight_model.joblib")


# === FEATURE EXTRACTOR ===
def extract_features(video_path):
    clip = VideoFileClip(video_path)

    audio_path = "temp_audio.wav"
    clip.audio.write_audiofile(audio_path, logger=None)
    y, sr = librosa.load(audio_path, sr=None)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    audio_features = np.mean(mfcc.T, axis=0)

    cap = cv2.VideoCapture(video_path)
    frame_count = 0
    hist_features = []

    while True:
        ret, frame = cap.read()
        if not ret or frame_count > 10:
            break
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1, 2], None, [4, 4, 4], [0, 180, 0, 256, 0, 256])
        hist = cv2.normalize(hist, hist).flatten()
        hist_features.append(hist)
        frame_count += 1

    cap.release()
    visual_features = np.mean(hist_features, axis=0)

    return np.concatenate([audio_features, visual_features])


# === TAG PARSER ===
def parse_tags(filename):
    """
    Extract tags from filename and normalize by removing trailing numbers.
    Example: "dunk1-three_pointer2" → ["dunk", "three_pointer"]
    """
    base = os.path.splitext(filename)[0]
    tags_raw = base.lower().split('-')
    tags_clean = [re.sub(r'\d+$', '', tag) for tag in tags_raw]
    return [tag for tag in tags_clean if tag in TAGS]


# === TRAINING ===
def train_model():
    X, y = [], []
    mlb = MultiLabelBinarizer(classes=TAGS)

    for fname in os.listdir(DATA_DIR):
        if not fname.endswith(".mp4"):
            continue
        tag_list = parse_tags(fname)
        if not tag_list:
            continue
        path = os.path.join(DATA_DIR, fname)
        features = extract_features(path)
        X.append(features)
        y.append(tag_list)

    if not X:
        print("No training data found.")
        return

    Y = mlb.fit_transform(y)
    model = make_pipeline(MultiOutputClassifier(RandomForestClassifier(n_estimators=100)))
    model.fit(X, Y)
    dump((model, mlb), MODEL_PATH)
    print("Model trained and saved to", MODEL_PATH)


# === PREDICTION ===
def predict_tags(video_path):
    model, mlb = load(MODEL_PATH)
    features = extract_features(video_path).reshape(1, -1)
    preds = model.predict(features)
    tags = mlb.inverse_transform(preds)[0]
    print(f"Tags predicted for {video_path}: {tags}", file=sys.stderr)
    return tags


# === CLI ===
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--train", action="store_true", help="Train the model using labeled clips")
    parser.add_argument("--predict", type=str, help="Predict tags for a new video")

    args = parser.parse_args()
    if args.train:
        train_model()
    elif args.predict:
        predict_tags(args.predict)
    else:
        print("Usage:\n  --train to train\n  --predict <path> to tag a clip")
