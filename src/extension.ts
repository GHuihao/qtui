// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { exec } from "child_process";
import net from "net";

const isWindows = process.platform === "win32";

class qtuiEditorProvider implements vscode.CustomTextEditorProvider {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new qtuiEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      qtuiEditorProvider.viewType,
      provider
    );
    return providerRegistration;
  }

  private static readonly viewType = "qtui.qtuiScratch";
  private server: net.Server;
  private client: net.Socket | undefined;
  private static newLine = isWindows
    ? String.fromCodePoint(0x0d, 0x0a)
    : String.fromCodePoint(0x0a);
  private webview: vscode.Webview | undefined;
  constructor(private readonly context: vscode.ExtensionContext) {
    this.server = net.createServer((socket) => {
      socket.pipe(socket);
    });
    this.client = void 0;
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
    this.webview = void 0;

    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("qtui.designerPath")) {
          const config = vscode.workspace.getConfiguration("qtui");
          const designerPath = config.get("designerPath");
          vscode.window.showInformationMessage(
            "检测到配置变更，正在重新加载..." + designerPath
          );
          this.webview?.postMessage({
            type: "updateDesignerPath",
            data: designerPath,
          });
        }
      })
    );
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
      this.client.write(path.toString() + qtuiEditorProvider.newLine);
    } catch (error) {
      this.client = void 0;
      throw error;
    }
  }
  stop() {
    console.log("Designer server is stopping");
    this.server.close();
  }
  /**
   * Called when our custom editor is opened.
   *
   *
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Setup initial content for the webview
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    // Receive message from the webview.
    webviewPanel.webview.onDidReceiveMessage((e) => {
      switch (e.type) {
        case "open":
          this.openDesigner(document);
          break;
        case "updateCfg":
          this.updateCfg(document, e.data);
          break;
        case "getDesignerPath":
          this.sendDesignerPath(webviewPanel);
          break;
      }
    });
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
  }
  private openDesigner(document: vscode.TextDocument) {
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

      const command = `${designerPath}  "${document.uri.fsPath}" --client ${port}`;
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
        this.sendFile(document.uri.fsPath);
      } catch (error) {
        vscode.window.showErrorMessage(
          `open qtui designer error:${document.uri.fsPath}${error}`
        );
        this.openDesigner(document);
      }
    }
    //
    // vscode.commands.executeCommand('vscode.openWith', vscode.Uri.parse('qtui://scratch'), vscode.ViewColumn.One);
  }
  private updateCfg(document: vscode.TextDocument, data: string) {
    const config = vscode.workspace.getConfiguration("qtui");
    if (!data || typeof data !== "string") {
      config.update("designerPath", "", vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage("update designer path success:''");
    } else {
      config.update("designerPath", data, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(
        `update designer path success:${data}`
      );
    }
  }
  private sendDesignerPath(webviewPanel: vscode.WebviewPanel) {
    const config = vscode.workspace.getConfiguration("qtui");
    const designerPath = config.get("designerPath");
    webviewPanel.webview.postMessage({
      type: "updateDesignerPath",
      data: designerPath,
    });
  }
  /**
   * Get the static html used for the editor webviews.
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    this.webview = webview;
    // Local path to script and css for the webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "qtuiScratch.js")
    );
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "reset.css")
    );

    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "vscode.css")
    );

    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "qtui.css")
    );
    const config = vscode.workspace.getConfiguration("qtui");
    const designerPath = config.get("designerPath");
    // Use a nonce to whitelist which scripts can be run
    const nonce = getNonce();
    return /* html */ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet" />
				<link href="${styleVSCodeUri}" rel="stylesheet" />
				<link href="${styleMainUri}" rel="stylesheet" />
				<title>qtui</title>
			</head>
			<body >
				
				<div class="add-button">
					<button>编辑ui!</button>
				</div>
				
				<div class="cfg">
					<input type="text" id="pathinput" value="${designerPath}" />
					<input type="file"  id ="fileinput"/ >
				</div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}

export function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(qtuiEditorProvider.register(context));
}

// This method is called when your extension is deactivated
export function deactivate() {}
