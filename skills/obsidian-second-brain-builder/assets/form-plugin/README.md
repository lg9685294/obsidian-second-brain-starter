# 记一笔本地表单

用途为在桌面Obsidian内按场景保存文字、图片和文件。

运行需要manifest.json、main.js、styles.css。源码在src中，使用Node运行build.js生成打包文件，运行test.js检查核心保存逻辑。

表单有五个场景，每场景一份草稿。保存目标为Calendar（日历记录）/Notes（每日记录）/表单记录，附件在x（系统支持）/Attachments（图片与素材）/表单附件。保存正式记录后，再通过聊天指令或人工整理。

默认时间来自设备时区。附件由用户选择、拖入或粘贴，单文件上限200 MiB，图片可以加说明。正式笔记为Markdown。草稿存在插件自己的data.json中，已保存笔记在Obsidian编辑器中修改。

插件读取当前库中的项目名与近期表单记录，创建笔记、附件和自身草稿数据。运行代码中没有AI接口、遥测、自动网络请求或库外扫描。Obsidian插件运行在应用环境中，首次启用前请阅读源码并选择是否信任。

独立preview.html使用同一UI组件，演示数据保存在浏览器本地，点击已保存记录可以下载Markdown。它用于试填与界面预览，原生Obsidian结果按实际安装验证。

## 如何预览

下载并解压整个仓库后，用 Chrome 或 Edge 打开本目录的 `preview.html`。填写虚构内容，试试切换场景、添加图片和保存。浏览器中的演示保存在这个浏览器内，不会同步到 Obsidian。清除浏览器数据会移除演示记录。

## 开发与检查

使用现代 Node.js（本轮以 Node.js 24 检查）。在本目录运行 `node build.js` 和 `node test.js`，不需要下载其他依赖。`build.js` 将 core、UI 与 Obsidian 适配层合并为 main.js，Obsidian 在运行时提供自身 API。

公开发行时，将 manifest.json、main.js、styles.css 同步到示例库 `.obsidian/plugins/second-brain-capture/`。目前为本地安装版，未上架 Obsidian 社区插件目录。
