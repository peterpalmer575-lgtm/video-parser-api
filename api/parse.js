const axios = require('axios');

module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只接受POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '请使用POST请求' });
  }

  // 获取URL参数
  let url = '';
  
  // 方式1: 从body获取
  if (req.body && req.body.url) {
    url = req.body.url;
  }
  
  // 方式2: 从query获取（兼容）
  if (!url && req.query && req.query.url) {
    url = req.query.url;
  }

  // 没有URL就返回错误
  if (!url || url.trim() === '') {
    return res.json({
      success: false,
      message: '请提供视频链接'
    });
  }

  // 开始解析
  try {
    const result = await parseVideo(url);
    
    if (result && result.videoUrl) {
      return res.json({
        success: true,
        data: result
      });
    } else {
      return res.json({
        success: false,
        message: '解析失败，未找到视频地址'
      });
    }
  } catch (error) {
    console.error('Parse error:', error);
    return res.json({
      success: false,
      message: '解析出错: ' + error.message
    });
  }
};

// 主解析函数 - 根据URL判断平台
async function parseVideo(url) {
  const lower = url.toLowerCase();
  
  if (lower.includes('douyin.com') || lower.includes('v.douyin.com')) {
    return await parseDouyin(url);
  } else if (lower.includes('kuaishou.com') || lower.includes('gifshow.com')) {
    return await parseKuaishou(url);
  } else if (lower.includes('xiaohongshu.com') || lower.includes('xhslink.com')) {
    return await parseXiaohongshu(url);
  } else if (lower.includes('bilibili.com') || lower.includes('b23.tv')) {
    return await parseBilibili(url);
  } else {
    throw new Error('不支持该平台: ' + url);
  }
}

// 抖音解析
async function parseDouyin(shareUrl) {
  // 第一步：访问分享链接，获取真实链接和视频ID
  const resp = await axios.get(shareUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
    },
    maxRedirects: 10,
    timeout: 10000,
    validateStatus: () => true
  });

  // 获取最终重定向的URL
  let finalUrl = shareUrl;
  if (resp.request && resp.request.res && resp.request.res.responseUrl) {
    finalUrl = resp.request.res.responseUrl;
  }

  // 提取视频ID
  let videoId = '';
  const idMatch = finalUrl.match(/\/video\/(\d+)/);
  if (idMatch) {
    videoId = idMatch[1];
  }

  if (!videoId) {
    throw new Error('无法从链接中提取抖音视频ID');
  }

  // 第二步：调用抖音API获取视频信息
  const apiResp = await axios.get(
    'https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/',
    {
      params: { item_ids: videoId },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://www.douyin.com/'
      },
      timeout: 10000
    }
  );

  const item = apiResp.data && apiResp.data.item_list && apiResp.data.item_list[0];
  
  if (!item) {
    throw new Error('抖音API返回数据为空');
  }

  // 提取无水印视频地址
  let videoUrl = '';
  if (item.video && item.video.play_addr && item.video.play_addr.url_list) {
    videoUrl = item.video.play_addr.url_list[0];
    // 去除水印参数
    videoUrl = videoUrl.replace('playwm', 'play');
  }

  return {
    title: (item.desc || '抖音视频').substring(0, 50),
    author: item.author ? item.author.nickname : '未知',
    cover: item.video && item.video.cover ? (item.video.cover.url_list ? item.video.cover.url_list[0] : '') : '',
    videoUrl: videoUrl
  };
}

// 快手解析
async function parseKuaishou(shareUrl) {
  // 访问分享链接
  const resp = await axios.get(shareUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)' },
    maxRedirects: 10,
    timeout: 10000,
    validateStatus: () => true
  });

  let finalUrl = shareUrl;
  if (resp.request && resp.request.res && resp.request.res.responseUrl) {
    finalUrl = resp.request.res.responseUrl;
  }

  // 提取photoId
  const photoIdMatch = finalUrl.match(/\/short-video\/([A-Za-z0-9_-]+)/);
  const photoId = photoIdMatch ? photoIdMatch[1] : '';

  if (!photoId) {
    throw new Error('无法提取快手视频ID');
  }

  // 调用快手GraphQL API
  const apiResp = await axios.get('https://www.kuaishou.com/graphql', {
    params: {
      operationName: 'visionVideoDetail',
      variables: JSON.stringify({ photoId: photoId, shootIndex: -1 }),
      query: 'query visionVideoDetail($photoId: String) { visionVideoDetail(photoId: $photoId) { photo { caption userName coverUrl playUrl } } }'
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'https://www.kuaishou.com/'
    },
    timeout: 10000
  });

  const data = apiResp.data;
  const photo = data && data.data && data.data.visionVideoDetail && data.data.visionVideoDetail.photo;

  if (!photo) {
    throw new Error('快手API返回数据为空');
  }

  return {
    title: (photo.caption || '快手视频').substring(0, 50),
    author: photo.userName || '未知',
    cover: photo.coverUrl || '',
    videoUrl: photo.playUrl || ''
  };
}

// 小红书解析
async function parseXiaohongshu(shareUrl) {
  const resp = await axios.get(shareUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS_16_0)' },
    maxRedirects: 10,
    timeout: 15000,
    validateStatus: () => true
  });

  const html = typeof resp.data === 'string' ? resp.data : '';

  // 从页面中提取初始状态数据
  const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);

  if (!stateMatch) {
    throw new Error('无法解析小红书页面内容');
  }

  let stateData;
  try {
    stateData = JSON.parse(stateMatch[1]);
  } catch (e) {
    throw new Error('小红书数据解析失败');
  }

  // 获取笔记详情
  const noteMap = stateData.note && stateData.note.noteDetailMap;
  if (!noteMap) {
    throw new Error('无法获取小红书笔记数据');
  }

  const noteIds = Object.keys(noteMap);
  if (noteIds.length === 0) {
    throw new Error('小红书笔记ID为空');
  }

  const note = noteMap[noteIds[0]] && noteMap[noteIds[0]].note;
  if (!note) {
    throw new Error('小红书笔记详情为空');
  }

  const isVideo = note.type === 'video';
  const videoInfo = note.video || {};
  const imageList = note.imageList || [];

  return {
    title: (note.title || '小红书笔记').substring(0, 50),
    author: note.user ? note.user.nickname : '未知',
    cover: isVideo ? (videoInfo.cover ? videoInfo.cover.url : '') : (imageList[0] ? imageList[0].url : ''),
    videoUrl: isVideo ? (videoInfo.media && videoInfo.media.stream && videoInfo.media.stream.h264 && videoInfo.media.stream.h264[0] ? videoInfo.media.stream.h264[0].masterUrl : '') : '',
    images: !isVideo ? imageList.map(function(img) { return img.url || ''; }).filter(Boolean) : []
  };
}

// B站解析
async function parseBilibili(shareUrl) {
  // 提取BV号
  const bvMatch = shareUrl.match(/\/(BV[\w]+)/);
  const bvid = bvMatch ? bvMatch[1] : '';

  if (!bvid) {
    throw new Error('无法提取B站视频BV号');
  }

  // 获取视频信息
  const resp = await axios.get('https://api.bilibili.com/x/web-interface/view', {
    params: { bvid: bvid },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'https://www.bilibili.com/'
    },
    timeout: 10000
  });

  const data = resp.data;

  if (data.code !== 0) {
    throw new Error(data.message || 'B站API返回错误');
  }

  const info = data.data;

  // 获取播放地址
  let videoUrl = '';
  try {
    const playResp = await axios.get('https://api.bilibili.com/x/player/playurl', {
      params: { bvid: bvid, cid: info.cid, qn: 80, fnval: 1 },
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.bilibili.com/'
      },
      timeout: 10000
    });

    if (playResp.data && playResp.data.data && playResp.data.data.durl && playResp.data.data.durl[0]) {
      videoUrl = playResp.data.data.durl[0].url;
    }
  } catch (e) {
    // 获取播放地址失败，继续返回基本信息
    console.error('Get playurl failed:', e.message);
  }

  return {
    title: (info.title || 'B站视频').substring(0, 50),
    author: info.owner ? info.owner.name : '未知',
    cover: info.pic || '',
    videoUrl: videoUrl
  };
}
