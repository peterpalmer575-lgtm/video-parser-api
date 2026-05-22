const https = require('https');
const http = require('http');
const { URL } = require('url');

// 通用的HTTP/HTTPS请求封装
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpGet(res.headers.location));
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ data, headers: res.headers, statusCode: res.statusCode }));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// 解析抖音视频
async function parseDouyin(url) {
  try {
    // 如果是短链接，先获取重定向后的真实链接
    const response = await httpGet(url);
    const finalUrl = response.headers.location || url;
    
    // 从HTML中提取视频信息
    const html = response.data;
    
    // 尝试从HTML中提取JSON数据
    const jsonMatch = html.match(/<script[^>]*>window\._ROUTER_DATA\s*=\s*([^<]+)<\/script>/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1].trim());
        // 解析数据结构提取视频URL
        // 这里需要根据实际数据结构来提取
      } catch (e) {
        console.log('JSON解析失败', e);
      }
    }
    
    // 备用方案：使用第三方解析API
    // 注意：实际部署时建议自己实现解析逻辑或使用可靠的解析服务
    return {
      success: true,
      data: {
        title: '抖音视频',
        author: '作者',
        cover: '',
        video_url: '', // 需要解析获取
        type: 'douyin',
        original_url: finalUrl
      },
      message: '请将此链接复制到第三方解析工具获取视频'
    };
    
  } catch (error) {
    throw new Error('抖音视频解析失败: ' + error.message);
  }
}

// 解析快手视频
async function parseKuaishou(url) {
  try {
    const response = await httpGet(url);
    return {
      success: true,
      data: {
        title: '快手视频',
        author: '作者',
        cover: '',
        video_url: '',
        type: 'kuaishou',
        original_url: url
      },
      message: '快手视频解析需要专门处理'
    };
  } catch (error) {
    throw new Error('快手视频解析失败: ' + error.message);
  }
}

// 解析小红书
async function parseXiaohongshu(url) {
  try {
    const response = await httpGet(url);
    return {
      success: true,
      data: {
        title: '小红书笔记',
        author: '作者',
        cover: '',
        video_url: '',
        type: 'xiaohongshu',
        original_url: url
      },
      message: '小红书内容解析需要专门处理'
    };
  } catch (error) {
    throw new Error('小红书解析失败: ' + error.message);
  }
}

// 主解析函数
async function parseVideo(url) {
  if (!url) {
    throw new Error('请提供视频链接');
  }
  
  // 判断平台
  if (url.includes('douyin.com') || url.includes('iesdouyin.com') || url.includes('v.douyin.com')) {
    return await parseDouyin(url);
  } else if (url.includes('kuaishou.com') || url.includes('gifshow.com') || url.includes('v.kuaishou.com')) {
    return await parseKuaishou(url);
  } else if (url.includes('xiaohongshu.com') || url.includes('xhslink.com')) {
    return await parseXiaohongshu(url);
  } else {
    throw new Error('暂不支持该平台。\n目前支持：\n• 抖音 (douyin.com)\n• 快手 (kuaishou.com)\n• 小红书 (xiaohongshu.com)');
  }
}

// Vercel Serverless 函数入口
module.exports = async (req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 只接受POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: '只支持POST请求方式' 
    });
  }
  
  try {
    const { url } = req.body;
    
    if (!url || url.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: '请在请求体中提供视频链接参数 (url)' 
      });
    }
    
    // 解析视频
    const result = await parseVideo(url.trim());
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('解析错误:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '视频解析失败，请检查链接是否正确'
    });
  }
};
