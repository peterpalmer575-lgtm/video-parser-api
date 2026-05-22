// pages/index/index.js
Page({
  data: {
    videoUrl: '',
    loading: false,
    result: null,
    error: null
  },

  // 输入框内容变化
  onInputChange(e) {
    this.setData({
      videoUrl: e.detail.value,
      error: null
    });
  },

  // 清空输入
  onClearInput() {
    this.setData({
      videoUrl: '',
      result: null,
      error: null
    });
  },

  // 解析视频
  async onParseVideo() {
    const { videoUrl } = this.data;

    // 验证输入
    if (!videoUrl || videoUrl.trim() === '') {
      this.setData({
        error: '请输入视频链接'
      });
      return;
    }

    // 简单的URL验证
    if (!videoUrl.includes('http')) {
      this.setData({
        error: '链接格式不正确，请检查是否完整复制了分享链接'
      });
      return;
    }

    this.setData({
      loading: true,
      error: null,
      result: null
    });

    try {
      // 调用Vercel API
      const response = await this.callParseAPI(videoUrl.trim());
      
      if (response.success) {
        this.setData({
          result: response.data,
          loading: false
        });
      } else {
        this.setData({
          error: response.error || '解析失败',
          loading: false
        });
      }
    } catch (err) {
      console.error('解析错误:', err);
      this.setData({
        error: '网络错误，请检查网络连接后重试',
        loading: false
      });
    }
  },

  // 调用解析API
  callParseAPI(url) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://your-vercel-app.vercel.app/api/parse', // 替换为你的Vercel部署地址
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: {
          url: url
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(new Error('服务器响应错误: ' + res.statusCode));
          }
        },
        fail: (err) => {
          reject(new Error('请求失败: ' + (err.errMsg || '网络连接错误')));
        }
      });
    });
  },

  // 下载视频
  onDownloadVideo() {
    const { result } = this.data;
    
    if (!result || !result.video_url) {
      wx.showToast({
        title: '视频链接不存在',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '正在下载...',
    });

    // 下载视频到本地
    wx.downloadFile({
      url: result.video_url,
      success: (res) => {
        wx.hideLoading();
        
        if (res.statusCode === 200) {
          // 保存到相册
          wx.saveVideoToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.showToast({
                title: '已保存到相册',
                icon: 'success'
              });
            },
            fail: (err) => {
              console.error('保存失败:', err);
              
              if (err.errMsg.includes('auth deny')) {
                wx.showModal({
                  title: '提示',
                  content: '需要您授权保存视频到相册',
                  confirmText: '去设置',
                  success: (res) => {
                    if (res.confirm) {
                      wx.openSetting();
                    }
                  }
                });
              } else {
                wx.showToast({
                  title: '保存失败',
                  icon: 'none'
                });
              }
            }
          });
        } else {
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('下载错误:', err);
        wx.showToast({
          title: '下载失败，请检查链接',
          icon: 'none'
        });
      }
    });
  },

  // 复制链接
  onCopyLink() {
    const { result } = this.data;
    
    if (!result || !result.video_url) {
      wx.showToast({
        title: '视频链接不存在',
        icon: 'none'
      });
      return;
    }

    wx.setClipboardData({
      data: result.video_url,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        });
      }
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '视频去水印工具 - 支持抖音快手小红书',
      path: '/pages/index/index'
    };
  }
});
