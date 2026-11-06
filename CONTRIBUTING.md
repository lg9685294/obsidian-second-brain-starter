# 参与改进

欢迎提交具体的使用问题、清晰的复现步骤或小范围改进。

提交问题时说明Obsidian版本、桌面系统、操作步骤、预期与实际结果。可以使用示例库中的虚构记录重现问题。

修改表单后，在插件目录执行 `node build.js` 和 `node test.js`，并同步示例库内的三个运行文件。检查默认时区、中文文件名、附件和重复保存。改笔记结构时检查内部链接与Bases过滤路径。

在仓库根目录维护。`starter-vault` 和 `plugins/second-brain-capture` 是公开模板与表单的来源，Skill 内的 `assets` 与下载 ZIP 由打包脚本同步。修改后运行：

```sh
node plugins/second-brain-capture/build.js
python3 scripts/package_skill.py
python3 scripts/check_project.py --with-plugin-tests
```

检查脚本只在临时目录试建库，不会处理正式知识库；可使用 `--report` 保存结果。运行需要 Python 3.9 或以上，表单源码构建与测试需要 Node.js。检查覆盖链接、包内容一致性、已有笔记保护和表单保存逻辑，原生 Obsidian 操作需单独验证。

发布版本时更新 `CHANGELOG.md`，运行检查，再把 Skill ZIP 和 `SHA256SUMS.txt` 附到 Release。保留已有版本，方便回退。

提交目录应只包含可公开的源码、演示与文档。个人工作库、插件data.json草稿、真实聊天、原录屏及访问凭据保存在自己的位置。
