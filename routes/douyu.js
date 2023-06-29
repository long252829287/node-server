var express = require('express');
var router = express.Router();
const { exec } = require('child_process');
const os = require('os');

router.post('/room', (req, res) => {
  const rid = req.body.rid;
  // nodejs检测为linux系统还是windows系统 
  console.log('os', os.type());
  if (os.type() === 'Linux') {
    exec('python3 /usr/local/server/script/douyu.py ' + rid, (err, stdout, stderr) => {
      try {
        const str = stdout.trim()
        const regex = /"m3u8":\s*"(.+?)"/;
        const match = str.match(regex);
        const extractedUrl = match ? match[1] : null;
        const result = { m3u8: extractedUrl };
        res.json(result);
      } catch (error) {
        console.error(`Error: ${error}`);
        res.status(500).send('Internal Server Error');
      }
    });
  } else {
    exec('python ./script/douyu.py ' + rid, (err, stdout, stderr) => {
      try {
        const str = stdout.trim()
        const regex = /"m3u8":\s*"(.+?)"/;
        const match = str.match(regex);
        const extractedUrl = match ? match[1] : null;
        const result = { m3u8: extractedUrl };
        res.json(result);
      } catch (error) {
        console.error(`Error: ${error}`);
        res.status(500).send('Internal Server Error');
      }
    });
  }
});


module.exports = router;
