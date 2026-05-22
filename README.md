# 视频去水印小程序 - 完整部署教程

> **完全零基础小白教程** | 无需懂代码 | 零成本部署

## 📚 目录

1. [项目介绍](#项目介绍)
2. [准备工作](#准备工作)
3. [部署后端API（Vercel）](#部署后端apivercel)
4. [部署前端（微信小程序）](#部署前端微信小程序)
5. [测试使用](#测试使用)
6. [常见问题](#常见问题)

---

## 项目介绍

这是一个**完全免费**的视频去水印小程序，支持：
- ✅ 抖音视频去水印
- ✅ 快手视频去水印  
- ✅ 小红书视频去水印

### 技术架构
```
微信小程序前端 (免费)
    ↓
Vercel Serverless API (免费)
    ↓
视频解析服务
```

### 成本
- **完全零成本** 🎉
- Vercel免费套餐：100GB带宽/月，足够个人使用
- 微信小程序：个人注册免费

---

## 准备工作

### 需要注册的账号（全部免费）

1. **GitHub账号** - 用于托管代码
2. **Vercel账号** - 用于部署后端API
3. **微信小程序账号** - 用于发布小程序

### 步骤1：注册GitHub账号

1. 访问 https://github.com
2. 点击 "Sign up" 注册
3. 输入用户名、邮箱、密码
4. 验证邮箱

✅ **完成标志**：能登录 https://github.com

### 步骤2：注册Vercel账号

1. 访问 https://vercel.com
2. 点击 "Sign Up"
3. **选择 "Continue with GitHub"** （用GitHub账号登录，最简单）
4. 授权Vercel访问GitHub

✅ **完成标志**：能登录 https://vercel.com

### 步骤3：注册微信小程序账号

1. 访问 https://mp.weixin.qq.com
2. 点击 "立即注册"
3. 选择 "小程序"
4. 填写信息（需要邮箱、手机号）
5. 完成实名认证（需要身份证）

⚠️ **注意**：个人小程序需要实名认证，但完全免费

✅ **完成标志**：能获得小程序的 AppID

---

## 部署后端API（Vercel）

### 步骤1：创建GitHub仓库

由于你是小白，我为你准备了完整的代码。你有两个选择：

**选择A：使用我提供的代码（推荐）**

1. 我会将代码打包成ZIP文件
2. 你下载后上传到GitHub
3. 具体步骤见下方

**选择B：自己创建仓库（进阶）**

如果你懂一点Git，可以自己推送代码到GitHub

### 步骤2：上传代码到GitHub

#### 方法1：网页上传（最简单，推荐小白）

1. 登录 GitHub
2. 点击右上角 "+" → "New repository"
3. 填写仓库名：`video-watermark-remover`
4. 选择 "Public"
5. 勾选 "Add a README file"
6. 点击 "Create repository"

7. 进入仓库页面，点击 "Add file" → "Upload files"
8. 将我为你创建的项目文件夹中的所有文件拖拽上传
9. 下滑，点击 "Commit changes"

✅ **完成标志**：能在GitHub上看到你的代码文件

#### 方法2：使用GitHub Desktop（推荐）

1. 下载安装 GitHub Desktop：https://desktop.github.com
2. 登录GitHub账号
3. 点击 "Clone a repository"
4. 选择你刚创建的 `video-watermark-remover` 仓库
5. 将我为你创建的项目文件夹中的所有文件复制到本地仓库文件夹
6. 在GitHub Desktop中提交并推送

### 步骤3：部署到Vercel

1. 登录 https://vercel.com
2. 点击 "Add New..." → "Project"
3. 选择 "Import Git Repository"
4. 找到并选择你的 `video-watermark-remover` 仓库
5. 点击 "Import"

6. **配置项目**（重要！）：
   - Framework Preset: 选择 "Other"
   - Root Directory: `./` (不改)
   - Build Command: 留空
   - Output Directory: `api` (改成这个)

7. 点击 "Deploy" 按钮

⏳ 等待部署完成（约1-2分钟）

✅ **完成标志**：
- 看到 "Congratulations!" 页面
- 获得一个网址，类似：`https://your-project.vercel.app`

### 步骤4：测试后端API

1. 打开浏览器
2. 访问：`https://your-project.vercel.app/api/parse`
   - 将 `your-project` 改成你的实际项目名

3. 如果看到 `{"error":"只支持POST请求"}` 或类似信息，说明API部署成功！

📋 **复制你的API地址**，格式类似：
```
https://your-project.vercel.app/api/parse
```

---

## 部署前端（微信小程序）

### 步骤1：下载微信开发者工具

1. 访问 https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
2. 下载Windows版本
3. 安装

### 步骤2：导入小程序项目

1. 打开微信开发者工具
2. 用微信扫码登录
3. 点击 "+" 新建项目
4. 填写：
   - 项目名称：`视频去水印`
   - 目录：选择 `miniprogram` 文件夹（在我为你创建的项目中）
   - AppID：填写你在微信公众平台获得的AppID（测试可以用测试号）
   - 后端服务：选择 "不使用云服务"

5. 点击 "确定"

✅ **完成标志**：能看到小程序的预览界面

### 步骤3：修改API地址（重要！）

1. 在微信开发者工具中，打开 `miniprogram/app.js` 文件
2. 找到这一行：
   ```javascript
   apiBaseUrl: 'https://your-vercel-app.vercel.app',
   ```
3. **将地址改成你的Vercel API地址**（步骤4中获得的那个月）
   ```javascript
   apiBaseUrl: 'https://your-project.vercel.app',
   ```

4. 保存（Ctrl+S）

5. 打开 `miniprogram/pages/index/index.js` 文件
6. 找到这一行：
   ```javascript
   url: 'https://your-vercel-app.vercel.app/api/parse',
   ```
7. **同样改成你的Vercel API地址**
   ```javascript
   url: 'https://your-project.vercel.app/api/parse',
   ```

8. 保存

### 步骤4：测试小程序

1. 在微信开发者工具中，点击 "编译" 按钮
2. 应该能看到小程序的界面
3. 尝试粘贴一个抖音视频链接
4. 点击 "开始解析"

✅ **成功标志**：能成功解析视频

---

## 测试使用

### 如何获取视频链接？

#### 抖音
1. 打开抖音APP
2. 找到想要去水印的视频
3. 点击 "分享" 按钮
4. 点击 "复制链接"

#### 快手
1. 打开快手APP
2. 找到想要去水印的视频
3. 点击 "分享" 按钮
4. 点击 "复制链接"

#### 小红书
1. 打开小红书APP
2. 找到想要去水印的视频
3. 点击 "分享" 按钮
4. 点击 "复制链接"

### 使用小程序

1. 打开小程序
2. 粘贴视频链接
3. 点击 "开始解析"
4. 解析成功后，点击 "下载视频"
5. 视频会保存到手机相册

---

## 常见问题

### Q1: Vercel部署失败怎么办？

**A**: 检查以下几点：
- GitHub仓库中是否有 `api/parse.js` 文件
- `vercel.json` 文件是否存在
- 在Vercel部署页面，查看 "Build Logs" 错误信息

### Q2: 小程序无法解析视频？

**A**: 可能的原因：
- API地址填写错误（检查 `app.js` 和 `index.js`）
- 视频链接格式不正确（确保完整复制链接）
- Vercel API部署失败（访问API地址测试）

### Q3: 解析后无法下载视频？

**A**: 
- 检查手机是否授权小程序访问相册
- 有些视频可能有版权保护，无法下载

### Q4: Vercel免费套餐够用吗？

**A**: 完全够用！
- 100GB带宽/月
- 100次服务器端渲染/天
- 个人使用完全足够

### Q5: 小程序审核不通过？

**A**: 微信对视频类小程序审核较严，注意：
- 不要包含违规内容
- 功能要完整
- 提供清晰的隐私政策

---

## 项目文件结构

```
video-watermark-remover/
├── api/
│   └── parse.js          # Vercel Serverless API
├── miniprogram/
│   ├── pages/
│   │   └── index/
│   │       ├── index.js   # 页面逻辑
│   │       ├── index.json # 页面配置
│   │       ├── index.wxml # 页面结构
│   │       └── index.wxss # 页面样式
│   ├── app.js            # 小程序入口
│   ├── app.json          # 小程序配置
│   ├── app.wxss          # 全局样式
│   ├── project.config.json # 项目配置
│   └── sitemap.json      # 搜索引擎配置
├── package.json          # 项目依赖
├── vercel.json           # Vercel配置
└── README.md             # 本文件
```

---

## 技术说明

### 后端API（Vercel Serverless）

- 使用Node.js编写
- 部署在Vercel平台
- 免费、自动扩容、HTTPS

### 前端（微信小程序）

- 使用微信小程序原生开发
- 无需服务器
- 调用Vercel API进行视频解析

---

## 下一步

部署完成后，你可以：

1. **完善功能**：添加更多平台支持（B站、微博等）
2. **优化UI**：改进界面设计
3. **发布上线**：提交微信审核，发布正式版
4. **添加广告**：接入微信广告组件，实现盈利

---

## 需要帮助？

如果遇到问题：
1. 检查本教程的"常见问题"部分
2. 查看Vercel的部署日志
3. 在微信开发者工具中查看控制台错误

---

## 总结

恭喜！你现在已经拥有：
- ✅ 一个完全免费的视频去水印小程序
- ✅ 部署在Vercel的后端API
- ✅ 可以解析抖音、快手、小红书视频

**整个项目零成本，且可以永久免费使用！** 🎉

---

**制作：OpenClaw AI**  
**日期：2026-05-23**
