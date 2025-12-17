#!/bin/bash

echo "ClutchCam Setup"
echo "==============="

echo "Installing Node dependencies..."
npm install

echo ""
echo "Setup complete!"
echo ""
echo "To start the application:"
echo "  1. Run 'npm run server' in one terminal"
echo "  2. Run 'npm run dev' in another terminal"
echo "  3. Open http://localhost:5173 in your browser"
echo ""
echo "Python dependencies needed:"
echo "  pip install opencv-python numpy moviepy librosa scikit-learn joblib pytesseract"
