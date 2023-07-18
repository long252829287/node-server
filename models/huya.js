var express = require('express');
var router = express.Router();
const { exec } = require('child_process');
const os = require('os');

router.post('/room', (req, res) => {
  const rid = req.body.rid;
  // nodejs检测为linux系统还是windows系统 
  if (os.type() === 'Linux') {
    exec('python3 /usr/local/server/script/huya.py ' + rid, (err, stdout, stderr) => {
      try {
        const str = stdout;
        const result = {
          fileUrl: str
        }
        res.json(result);
      } catch (error) {
        console.error(`Error: ${error}`);
        res.status(500).send('Internal Server Error');
      }
    });
  } else {
    exec('python script/huya.py ' + rid, (err, stdout, stderr) => {
      try {
        const str = stdout;
        const result = {
          fileUrl: str
        }
        res.json(result);
      } catch (error) {
        console.error(`Error: ${error}`);
        res.status(500).send('Internal Server Error');
      }
    });
  }
});


module.exports = router;
