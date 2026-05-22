const axios = require('axios');

// 主处理函数 - Vercel Serverless格式
module.exports = async (req, res) => {
  // 设置CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只接受POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '只支持POST请求' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: '请提供视频链接' });
  }

  try {
    let videoInfo = null;

    // 判断平台并解析
    if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('v.douyin.com')) {
      videoInfo = await parseDouyin(url);
    } else if (url.includes('kuaishou.com') || url.includes('gifshow.com') || url.includes('v.kuaishou.com')) {
      videoInfo = await parseKuaishou(url);
    } else if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) {
      videoInfo = await parseXiaohongshu(url);
    } else if (url.includes('bilibili.com') || url.includes('b23.tv')) {
      videoInfo = await parseBilibili(url);
    } else if (url.includes('weibo.com') || url.includes('weibo.cn')) {
      videoInfo = await parseWeibo(url);
    } else {
      return res.status(400).json({ success: false, message: '不支持该平台' });
    }

    if (videoInfo && videoInfo.videoUrl) {
      res.json({
        success: true,
        data: videoInfo
      });
    } else {
      res.status(400).json({ success: false, message: '解析失败，请检查链接是否正确' });
    }
  } catch (error) {
    console.error('解析错误:', error.message);
    res.status(500).json({ success: false, message: '服务器错误：' + error.message });
  }
};

// 抖音解析
async function parseDouyin(url) {
  try {
    // 获取分享链接的重定向地址
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      maxRedirects: 10,
      validateStatus: () => true,
      timeout: 10000
    });

    const finalUrl = response.request?.res?.responseUrl || response.request?.redirects?.pop()?.href || url;

    // 从URL中提取视频ID
    let videoId = '';
    const idMatch = finalUrl.match(/video\/(\d+)/);
    if (idMatch) {
      videoId = idMatch[1];
    } else {
      // 尝试从modal链接中提取
      const modalMatch = finalUrl.match(/modal_id=(\d+)/);
      if (modalMatch) videoId = modalMatch[1];
    }

    if (!videoId) {
      // 尝试从原始URL中提取长数字ID
      const shareMatch = url.match(/(\d{10,})/);
      if (shareMatch) videoId = shareMatch[1];
    }

    if (!videoId) {
      throw new Error('无法提取视频ID，请确认链接正确');
    }

    // 调用抖音API获取视频信息
    const apiResponse = await axios.get(`https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.douyin.com/'
      },
      timeout: 10000
    });

    const itemData = apiResponse.data.item_list?.[0];
    if (!itemData) {
      throw new Error('获取视频信息失败，该视频可能不存在或已删除');
    }

    // 获取无水印视频地址
    let videoUrl = itemData.video?.play_addr?.url_list?.[0] || '';
    // 去除水印参数
    videoUrl = videoUrl.replace('playwm', 'play');

    return {
      title: itemData.desc || '抖音视频',
      author: itemData.author?.nickname || '未知作者',
      cover: itemData.video?.cover?.url_list?.[0] || '',
      videoUrl: videoUrl
    };
  } catch (error) {
    console.error('抖音解析失败:', error.message);
    throw error;
  }
}

// 快手解析
async function parseKuaishou(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      maxRedirects: 10,
      validateStatus: () => true,
      timeout: 10000
    });

    const finalUrl = response.request?.res?.responseUrl || url;

    // 提取视频ID
    const idMatch = finalUrl.match(/short-video\/([\w-]+)/) || finalUrl.match(/photo\/([\w-]+)/);
    const photoId = idMatch ? idMatch[1] : '';

    if (!photoId) {
      throw new Error('无法提取快手视频ID');
    }

    // 快手GraphQL API
    const apiResponse = await axios.get('https://www.kuaishou.com/graphql', {
      params: {
        operationName: 'visionVideoDetail',
        variables: JSON.stringify({ photoId, shootIndex: -1 }),
        query: `query visionVideoDetail($photoId: String!) { visionVideoDetail(photoId: $photoId) { photo { caption userName coverUrl playUrl } } }`
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/json',
        'Referer': 'https://www.kuaishou.com/'
      },
      timeout: 10000
    });

    const data = apiResponse.data?.data?.visionVideoDetail?.photo;
    if (!data) {
      throw new Error('获取快手视频信息失败');
    }

    return {
      title: data.caption || '快手视频',
      author: data.userName || '未知作者',
      cover: data.coverUrl || '',
      videoUrl: data.playUrl || ''
    };
  } catch (error) {
    console.error('快手解析失败:', error.message);
    throw error;
  }
}

// 小红书解析
async function parseXiaohongshu(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      maxRedirects: 10,
      validateStatus: () => true,
      timeout: 15000
    });

    const html = response.data;

    // 从HTML中提取数据
    const dataMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.*?})\s*</s);
    if (!dataMatch) {
      throw new Error('无法解析小红书页面数据');
    }

    const rawData = JSON.parse(dataMatch[1]);
    const note = rawData.note?.noteDetailMap;
    if (!note) {
      throw new Error('获取小红书笔记信息失败');
    }

    const noteKey = Object.keys(note)[0];
    const noteData = note[noteKey]?.note;

    if (!noteData) {
      throw new Error('笔记数据为空');
    }

    const isVideo = noteData.type === 'video';
    const video = noteData.video;
    const imageList = noteData.imageList || [];

    return {
      title: noteData.title || '小红书内容',
      author: noteData.user?.nickname || '未知作者',
      cover: isVideo ? (video?.cover?.url || '') : (imageList[0]?.url || ''),
      videoUrl: isVideo ? (video?.media?.stream?.h264?.[0]?.masterUrl || '') : '',
      images: !isVideo ? imageList.map(img => img.url || img.urlDefault || '').filter(Boolean) : []
    };
  } catch (error) {
    console.error('小红书解析失败:', error.message);
    throw error;
  }
}

// B站解析
async function parseBilibili(url) {
  try {
    const bvMatch = url.match(/(?:bilibili\.com|b23\.tv)\/video\/(BV[\w]+)/);
    const avMatch = url.match(/av(\d+)/);
    const bvid = bvMatch ? bvMatch[1] : null;
    const aid = avMatch ? avMatch[1] : null;

    if (!bvid && !aid) {
      throw new Error('无法提取B站视频ID');
    }

    const apiUrl = bvid
      ? `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`
      : `https://api.bilibili.com/x/web-interface/view?aid=${aid}`;

    const apiResponse = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com/'
      },
      timeout: 10000
    });

    const data = apiResponse.data;
    if (data.code !== 0) {
      throw new Error(data.message || '获取B站视频信息失败');
    }

    const info = data.data;
    const videoStream = info.dash?.video?.[0];

    return {
      title: info.title || 'B站视频',
      author: info.owner?.name || '未知作者',
      cover: info.pic || '',
      videoUrl: videoStream?.baseUrl || ''
    };
  } catch (error) {
    console.error('B站解析失败:', error.message);
    throw error;
  }
}

// 微博解析
async function parseWeibo(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      maxRedirects: 10,
      validateStatus: () => true,
      timeout: 10000
    });

    const html = response.data;

    const videoMatch = html.match(/"stream_url":"([^"]+)"/);
    const coverMatch = html.match(/"image_url":"([^"]+)"/);
    const titleMatch = html.match(/"status_title":"([^"]*)"/);

    if (!videoMatch) {
      throw new Error('无法提取微博视频地址');
    }

    return {
      title: titleMatch ? decodeURIComponent(titleMatch[1]) : '微博视频',
      author: '微博用户',
      cover: coverMatch ? decodeURIComponent(coverMatch[1]) : '',
      videoUrl: decodeURIComponent(videoMatch[1]).replace(/\\/g, '')
    };
  } catch (error) {
    console.error('微博解析失败:', error.message);
    throw error;
  }
}
