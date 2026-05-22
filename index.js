const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 通用视频解析接口
app.post('/parse', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.json({ code: -1, msg: '链接不能为空' });

  try {
    // 公共解析中转接口，稳定可用
    const api = `https://api.douyin.wtf/api?url=${encodeURIComponent(url)}`;
    const result = await axios.get(api);
    res.json({
      code: 200,
      data: result.data
    });
  } catch (err) {
    res.json({ code: -2, msg: '解析失败，请更换链接重试' });
  }
});

app.get('/', (req, res) => {
  res.send('视频去水印后端服务运行正常');
});

- app.listen(port, () => {
-   console.log(`服务启动端口:${port}`);
- });
+ // Vercel Serverless 导出
+ module.exports = app;
