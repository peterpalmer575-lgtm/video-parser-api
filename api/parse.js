const axios = require('axios');
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const { url } = req.body;
    if(!url) return res.status(400).json({code:400,msg:'请粘贴视频链接'});
    const resData = await axios.get(`https://api.shenke.love/api/douyin?url=${encodeURIComponent(url)}`,{timeout:10000});
    const d = resData.data;
    if(d.code===200){
      return res.json({
        code:200,
        msg:'解析成功',
        data:{
          title:d.title||"无标题",
          cover:d.cover,
          videoUrl:d.play||d.videoUrl,
          author:d.author||"未知",
          platform:d.platform||"未知平台"
        }
      })
    }
    return res.json({code:500,msg:'解析失败'});
  }catch(e){
    return res.json({code:500,msg:'接口异常'});
  }
};
