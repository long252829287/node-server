var express = require('express');
var router = express.Router();
const { exec } = require('child_process');

router.post('/', (req, res) => {
  const rid = req.body.rid;


  exec('python ./script/douyu.py '+ rid, (err, stdout, stderr) => {
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
});
  

module.exports = router;
