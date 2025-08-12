var express = require('express');
var router = express.Router();
const { spawn } = require('child_process');
const os = require('os');

function isValidRid(rid) {
  return typeof rid === 'string' && rid.length > 0 && rid.length < 64 && /^[\w-]+$/.test(rid);
}

router.post('/room', (req, res) => {
  const rid = String(req.body.rid || '').trim();
  if (!isValidRid(rid)) {
    return res.status(400).json({ error: { status: 400, message: 'Invalid rid' } });
  }

  const isLinux = os.type() === 'Linux';
  const pythonCmd = isLinux ? 'python3' : 'python';
  const scriptPath = isLinux ? '/usr/local/server/script/huya.py' : 'script/huya.py';

  const child = spawn(pythonCmd, [scriptPath, rid], { stdio: ['ignore', 'pipe', 'pipe'] });
  const timer = setTimeout(() => child.kill('SIGKILL'), 15000);

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (data) => (stdout += data.toString()));
  child.stderr.on('data', (data) => (stderr += data.toString()));
  child.on('error', (err) => {
    clearTimeout(timer);
    console.error('spawn error:', err);
    res.status(500).json({ error: { status: 500, message: 'Script error' } });
  });
  child.on('close', (code) => {
    clearTimeout(timer);
    if (code !== 0) {
      console.error('script exit code', code, 'stderr:', stderr);
      return res.status(500).json({ error: { status: 500, message: 'Script failed' } });
    }
    try {
      const str = stdout.trim();
      return res.json({ fileUrl: str });
    } catch (error) {
      console.error('parse error', error);
      return res.status(500).json({ error: { status: 500, message: 'Parse error' } });
    }
  });
});


module.exports = router;
