const { default: axios } = require('axios');
var express = require('express');
var router = express.Router();



router.post('/', (req, res) => {
  let content = req.body.content;
  content = content && content.trim();
  if (!content || content == '123') {
    res.send('你真牛!');
    return;
  }
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer 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`
  };

  const data = {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Say this is a test!' }],
    temperature: 0.7
  };
  try {
    axios.post('https://api.openai.com/v1/chat/completions', data, { headers })
    .then(response => {
        console.log(response.data);
    })
    .catch(error => {
        console.error(error);
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
