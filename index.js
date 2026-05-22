const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// 解析视频接口
app.post('/api/parse', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: '请提供视频链接' });
  }

  try {
    let videoInfo = null;

    // 判断平台并解析
    if (url.includes('douyin.com') || url.includes('iesdouyin.com')) {
      videoInfo = await parseDouyin(url);
    } else if (url.includes('kuaishou.com') || url.includes('gifshow.com')) {
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
});

// 抖音解析
async function parseDouyin(url) {
  try {
    // 获取重定向后的真实链接
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      },
      maxRedirects: 10,
      validateStatus: () => true
    });

    const finalUrl = response.request.res.responseUrl || url;

    // 从URL中提取视频ID
    let videoId = '';
    const idMatch = finalUrl.match(/video\/(\d+)/);
    if (idMatch) {
      videoId = idMatch[1];
    } else {
      const noteMatch = finalUrl.match(/note\/(\d+)/);
      if (noteMatch) videoId = noteMatch[1];
    }

    if (!videoId) {
      // 尝试从分享链接中提取
      const shareMatch = url.match(/(\d{10,})/);
      if (shareMatch) videoId = shareMatch[1];
    }

    if (!videoId) {
      throw new Error('无法提取视频ID');
    }

    // 调用抖音无水印API
    const apiResponse = await axios.get(`https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.douyin.com/'
      },
      timeout: 10000
    });

    const itemData = apiResponse.data.item_list?.[0];
    if (!itemData) {
      throw new Error('获取视频信息失败');
    }

    return {
      title: itemData.desc || '抖音视频',
      author: itemData.author?.nickname || '未知作者',
      cover: itemData.video?.cover?.url_list?.[0] || '',
      videoUrl: itemData.video?.play_addr?.url_list?.[0]?.replace('playwm', 'play') || ''
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
      validateStatus: () => true
    });

    const finalUrl = response.request.res.responseUrl || url;
    
    // 提取视频ID
    const idMatch = finalUrl.match(/short-video\/([\w-]+)/) || finalUrl.match(/photo\/([\w-]+)/);
    const photoId = idMatch ? idMatch[1] : '';

    if (!photoId) {
      throw new Error('无法提取快手视频ID');
    }

    // 快手API
    const apiResponse = await axios.get(`https://www.kuaishou.com/graphql`, {
      params: {
        operationName: 'visionVideoDetail',
        variables: JSON.stringify({ photoId, shootIndex: -1 }),
        query: `query visionVideoDetail($photoId: String!) { visionVideoDetail(photoId: $photoId) { photo { caption, userName, coverUrl, playUrl } } }`
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
      validateStatus: () => true
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

    // 判断是视频还是图片
    const isVideo = noteData.type === 'video';
    const video = noteData.video;
    const imageList = noteData.imageList || [];

    return {
      title: noteData.title || '小红书内容',
      author: noteData.user?.nickname || '未知作者',
      cover: isVideo ? (video?.cover?.url || '') : (imageList[0]?.url || ''),
      videoUrl: isVideo ? (video?.media?.stream?.h264?.[0]?.masterUrl || video?.consumer?.originVideoKey || '') : '',
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
    // 提取BV号或AV号
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
    const audioStream = info.dash?.audio?.[0];

    return {
      title: info.title || 'B站视频',
      author: info.owner?.name || '未知作者',
      cover: info.pic || '',
      videoUrl: videoStream?.baseUrl || videoStream?.backupUrl?.[0] || '',
      audioUrl: audioStream?.baseUrl || audioStream?.backupUrl?.[0] || ''
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
      validateStatus: () => true
    });

    const html = response.data;

    // 尝试从页面中提取视频信息
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

// 健康检查
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: '视频去水印API运行中',
    supportedPlatforms: ['抖音', '快手', '小红书', 'B站', '微博']
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
