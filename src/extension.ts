import * as vscode from "vscode";
import { exec } from "child_process";
import * as path from "path";
import net from "net";

class DesignerClient {
  private server: net.Server;
  private client: net.Socket | undefined;
  static newLine: string = "\n";
  constructor() {
    this.server = net.createServer((socket) => {
      socket.pipe(socket);
    });
    this.server
      .listen(0, () => {
        console.info(`Designer server is listening on port 0`);
      })
      .on("connection", (client) => {
        this.onConnection(client);
      })
      .on("error", (r) => {
        throw (console.error(r.message), r);
      });
    this.client = void 0;
  }
  onConnection(client: net.Socket) {
    this.client = client;
    client.address();
  }
  getPort(): number | undefined {
    const addr = this.server.address();
    if (addr && typeof addr === "object") {
      return addr.port;
    }
  }
  sendFile(path: string) {
    if (!this.client) {
      let t = "No client connected";
      throw (console.error(t), new Error(t));
    }
    console.info("Sending file:" + path);
    try {
      this.client.write(path.toString() + DesignerClient.newLine);
    } catch (error) {
      this.client = void 0;
      throw error;
    }
  }
  openDesigner(filePath: string) {
    // 执行操作系统系统命令
    if (!this.client) {
      const config = vscode.workspace.getConfiguration("qtui");
      const designerPath = config.get("designerPath");
      if (!designerPath) {
        vscode.window.showErrorMessage("qtui designer path not found");
        return;
      }
      const port = this.getPort();
      vscode.window.showInformationMessage("port " + port);

      const command = `${designerPath}  "${filePath}" --client ${port}`;
      exec(command, (error) => {
        if (error) {
          vscode.window.showErrorMessage(
            `Failed to open file manager: ${error.message}`
          );
        }
        vscode.window.showInformationMessage("open qtui designer success");
        this.client = void 0;
      });
      vscode.window.showInformationMessage("open qtui designer exec...");
    } else {
      try {
        this.sendFile(filePath);
      } catch (error) {
        vscode.window.showErrorMessage(
          `open qtui designer error:${filePath}${error}`
        );
        // this.openDesigner(filePath);
      }
    }
    //
    // vscode.commands.executeCommand('vscode.openWith', vscode.Uri.parse('qtui://scratch'), vscode.ViewColumn.One);
  }
}
const c = new DesignerClient();

export function activate(context: vscode.ExtensionContext) {
  // 注册一个命令，从资源管理器、命令面板或编辑器标题按钮调用都可以
  const disposable = vscode.commands.registerCommand(
    "qtui.openDesigner",
    async (resource: vscode.Uri | undefined) => {
      // 支持从资源管理器传入 resource 或使用当前活动编辑器
      if (!resource) {
        const active = vscode.window.activeTextEditor;
        if (active) {
          resource = active.document.uri;
        }
      }

      if (!resource) {
        vscode.window.showErrorMessage("没有选中的 .ui 文件来打开 designer。");
        return;
      }

      // 从配置读取 designer 路径
      const config = vscode.workspace.getConfiguration("qtui");
      const designerPath = config.get<string>("designerPath", "designer.exe");

      try {
        // 在后台启动 designer
        c.openDesigner(resource.fsPath);
      } catch (err) {
        vscode.window.showErrorMessage(`启动 designer 失败: ${String(err)}`);
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
