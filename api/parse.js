const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ code: 400, msg: '请输入视频链接' });
    }

    const { data } = await axios.get(`https://api.shenke.love/api/douyin?url=${encodeURIComponent(url)}`, {
      timeout: 10000,
    });

    if (data.code === 200) {
      res.json({
        code: 200,
        msg: '解析成功',
        data: {
          title: data.title || '无标题',
          cover: data.cover,
          videoUrl: data.play || data.videoUrl,
          author: data.author || '未知',
          platform: data.platform || '未知平台',
        },
      });
    } else {
      res.json({ code: 500, msg: '解析失败' });
    }
  } catch (err) {
    res.json({ code: 500, msg: '服务异常' });
  }
};
