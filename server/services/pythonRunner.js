import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function runPythonScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const fullPath = path.join(__dirname, '../../src', scriptPath);

    console.log(`Executing: ${pythonPath} ${fullPath} ${args.join(' ')}`);

    const python = spawn(pythonPath, [fullPath, ...args]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      if (stderr) {
        console.log('Python stderr output:', stderr.substring(0, 500));
      }

      if (code !== 0) {
        console.error('Python Error:', stderr);
        reject(new Error(`Python script exited with code ${code}: ${stderr}`));
      } else {
        console.log('Python stdout length:', stdout.length);
        try {
          const result = JSON.parse(stdout);
          console.log('Successfully parsed JSON, highlights:', result.highlights?.length || 0);
          resolve(result);
        } catch (e) {
          console.error('JSON parse error:', e.message);
          console.log('Stdout preview:', stdout.substring(0, 200));
          resolve({ output: stdout.trim() });
        }
      }
    });

    python.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

export { runPythonScript };
