const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: '只支持POST请求' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ success: false, message: '请提供视频链接' });

  try {
    const u = url.toLowerCase();
    let result = null;

    if (u.includes('douyin.com') || u.includes('v.douyin.com') || u.includes('iesdouyin.com')) {
      result = await parseDouyin(url);
    } else if (u.includes('kuaishou.com') || u.includes('gifshow.com')) {
      result = await parseKuaishou(url);
    } else if (u.includes('xiaohongshu.com') || u.includes('xhslink.com')) {
      result = await parseXiaohongshu(url);
    } else if (u.includes('bilibili.com') || u.includes('b23.tv')) {
      result = await parseBilibili(url);
    } else {
      return res.status(400).json({ success: false, message: '不支持该平台，支持：抖音、快手、小红书、B站' });
    }

    if (result && result.videoUrl) {
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, message: '解析失败，请检查链接是否正确' });
    }
  } catch (err) {
    console.error('解析错误:', err.message);
    res.status(500).json({ success: false, message: '服务器错误：' + err.message });
  }
};

// ============ 抖音解析 ============
async function parseDouyin(url) {
  const resp = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15' },
    maxRedirects: 10,
    validateStatus: () => true,
    timeout: 10000
  });

  const finalUrl = resp.request?.res?.responseUrl || url;
  let videoId = '';
  const m = finalUrl.match(/\/video\/(\d+)/);
  if (m) videoId = m[1];

  if (!videoId) throw new Error('无法提取抖音视频ID，请检查链接');
  if (!videoId) throw new Error('无法提取抖音视频ID，请检查链接');

  const apiResp = await axios.get(`https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 11)', 'Referer': 'https://www.douyin.com/' },
    timeout: 10000
  });

  const item = apiResp.data?.item_list?.[0];
  if (!item) throw new Error('获取抖音视频信息失败');

  let videoUrl = '';
  const urlList = item.video?.play_addr?.url_list || [];
  if (urlList.length > 0) videoUrl = urlList[0].replace('playwm', 'play');

  return {
    title: item.desc || '抖音视频',
    author: item.author?.nickname || '未知',
    cover: item.video?.cover?.url_list?.[0] || '',
    videoUrl: videoUrl
  };
}

// ============ 快手解析 ============
async function parseKuaishou(url) {
  const resp = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' },
    maxRedirects: 10,
    validateStatus: () => true,
    timeout: 10000
  });

  const html = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
  const photoIdMatch = url.match(/\/short-video\/([A-Za-z0-9_-]+)/) || url.match(/photoId=([A-Za-z0-9_-]+)/);
  const photoId = photoIdMatch ? photoIdMatch[1] : '';

  if (!photoId) throw new Error('无法提取快手视频ID');

  const apiResp = await axios.get('https://www.kuaishou.com/graphql', {
    params: {
      operationName: 'visionVideoDetail',
      variables: JSON.stringify({ photoId, shootIndex: -1 }),
      query: 'query visionVideoDetail($photoId: String) { visionVideoDetail(photoId: $photoId) { photo { caption userName coverUrl playUrl } } }'
    },
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.kuaishou.com/' },
    timeout: 10000
  });

  const photo = apiResp.data?.data?.visionVideoDetail?.photo;
  if (!photo) throw new Error('获取快手视频信息失败');

  return {
    title: photo.caption || '快手视频',
    author: photo.userName || '未知',
    cover: photo.coverUrl || '',
    videoUrl: photo.playUrl || ''
  };
}

// ============ 小红书解析 ============
async function parseXiaohongshu(url) {
  const resp = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' },
    maxRedirects: 10,
    validateStatus: () => true,
    timeout: 15000
  });

  const html = typeof resp.data === 'string' ? resp.data : '';
  const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
  if (!stateMatch) throw new Error('无法解析小红书页面，请检查链接');

  let state;
  try { state = JSON.parse(stateMatch[1]); } catch (e) { throw new Error('解析小红书数据失败'); }

  const noteMap = state.note?.noteDetailMap || {};
  const noteId = Object.keys(noteMap)[0];
  const note = noteMap[noteId]?.note;
  if (!note) throw new Error('获取小红书笔记信息失败');

  const isVideo = note.type === 'video';
  const video = note.video || {};
  const images = note.imageList || [];

  return {
    title: note.title || '小红书笔记',
    author: note.user?.nickname || '未知',
    cover: isVideo ? (video.cover?.url || '') : (images[0]?.url || ''),
    videoUrl: isVideo ? (video.media?.stream?.h264?.[0]?.masterUrl || '') : '',
    images: !isVideo ? images.map(i => i.url).filter(Boolean) : []
  };
}

// ============ B站解析 ============
async function parseBilibili(url) {
  const bvMatch = url.match(/\/(BV[\w]+)/);
  const bvid = bvMatch ? bvMatch[1] : '';
  if (!bvid) throw new Error('无法提取B站视频ID');

  const resp = await axios.get(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bilibili.com/' },
    timeout: 10000
  });

  if (resp.data.code !== 0) throw new Error(resp.data.message || 'B站API错误');

  const d = resp.data.data;

  // 获取播放地址
  const cidResp = await axios.get(`https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${d.cid}&qn=80&fnval=1`, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bilibili.com/' },
    timeout: 10000
  });

  const videoUrl = cidResp.data?.data?.durl?.[0]?.url || '';

  return {
    title: d.title || 'B站视频',
    author: d.owner?.name || '未知',
    cover: d.pic || '',
    videoUrl: videoUrl
  };
}
