# Qt UI Extension for Visual Studio Code
This extension provides support for designing widget-based UIs with Qt Widgets Designer using .ui files.

config
```json
"qtui.designerPath": {
  "type": "string",
  "description": "qt designer path",
  "default": "designer.exe"
}
```
## Issues
If you encounter any issues with the extension, please report the [issues](https://github.com/GHuihao/qtui/issues).

## 使用说明

- 在 VS Code 中打开或选中一个 `.ui` 文件。
- 编辑器右上角（editor title）会显示一个 "Qt UI: 在 Designer 中打开 .ui 文件" 按钮，或者在资源管理器右键菜单中选择同名命令来用 Qt Designer 打开当前文件。
- 可通过设置 `qtui.designerPath` 指定 designer 可执行程序路径（默认：`designer.exe`）。
