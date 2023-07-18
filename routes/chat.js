var express = require('express');
var router = express.Router();
const chatgpt = require('../utils/chatgpt');


router.post('/', (req, res) => {
  if (req.body.clear) {
    chatgpt.clear();
    res.send('success');
    return;
  }
  let content = req.body.content;
  content = content && content.trim();
  if (!content) {
    res.send('');
    return;
  }
  try {
    chatgpt.sendMessage(content, {
      onData(chunk) {
        res.write(chunk);
      },
      onEnd() {
        res.end();
      },
      onError(err) {
        console.error(err);
        endError(res);
      },
    });
  } catch (err) {
    console.error(err);
    endError(res);
  }
});

function endError(res) {
  res
    .status(502)
    .send(
      '服务不可用！可能是词语总数已达到上限，或者是欠费，或者是网络被封，你可以尝试重启服务器试一试。'
    );
}

module.exports = router;
