const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: '테스트 서버가 정상 작동 중입니다.',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`테스트 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`테스트 URL: http://localhost:${PORT}/api/test`);
});