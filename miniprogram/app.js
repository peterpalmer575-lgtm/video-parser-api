// app.js
App({
  onLaunch() {
    console.log('视频去水印小程序启动');
    
    // 检查更新
    this.checkUpdate();
  },

  // 检查小程序更新
  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();

      updateManager.onCheckForUpdate((res) => {
        console.log('检查更新结果:', res.hasUpdate);
      });

      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success(res) {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });

      updateManager.onUpdateFailed(() => {
        console.log('更新失败');
      });
    }
  },

  globalData: {
    // API地址 - 部署Vercel后替换为你自己的地址
    apiBaseUrl: 'https://your-vercel-app.vercel.app',
    
    // 支持的平台列表
    supportedPlatforms: [
      { name: '抖音', key: 'douyin', color: '#000000' },
      { name: '快手', key: 'kuaishou', color: '#FF6600' },
      { name: '小红书', key: 'xiaohongshu', color: '#FF2442' }
    ]
  }
});
