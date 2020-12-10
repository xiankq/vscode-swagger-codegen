import { join } from "path";
import * as vscode from "vscode";
import { Config } from "./config";
import { getSwagger, Swagger } from "./fetch";
import { GenTs } from "./gen_ts";
import { Utils } from "./utils";
export function activate(context: vscode.ExtensionContext) {
  vscode.commands.registerCommand("swagger-codegen.start", async () => {
    //检测工作区（必须在工作区内打开）
    const workUri = vscode?.workspace?.workspaceFolders?.[0]?.uri;
    if (!workUri) {
      return vscode.window.showErrorMessage(
        "Please open it in your workspace."
      );
    }
    const urls = Config.urls;
    //没有设置swagger URL
    if (!urls.length) {
      return vscode.window.showWarningMessage("No swagger-url defined.");
    }

    //存放多个域名的swagger数据
    const swaggers: { [key: string]: Swagger.Response } = {};

    //去请求数据  并返回QuickPickItem[]
    const getList = async () => {
      const fetch = urls.map(async (url) => {
        const res = await getSwagger(url);
        if (res) {
          swaggers[url] = res;
        } else {
          vscode.window.showWarningMessage(`${url} error request.`);
        }
      });
      await Promise.all(fetch);
      const quickList: CustomQuickPickItem[] = [];
      for (const url in swaggers) {
        const res = swaggers[url];
        for (const path in res?.paths ?? {}) {
          const pathcat = res?.paths?.[path] ?? {};
          for (const method in pathcat) {
            const inte = pathcat[method];
            const item = new CustomQuickPickItem(
              path,
              method,
              url,
              method,
              `${res?.info?.title ?? ""}--${inte?.tags?.join(",")}--${
                inte?.summary ?? ""
              }`
            );
            quickList.push(item);
          }
        }
      }
      return quickList;
    };
    //显示PICKER
    const select = await vscode.window.showQuickPick<CustomQuickPickItem>(
      getList()
    );
    if (!select) {
      return;
    }

    const url = select.url;
    const path = select.label;
    const method = select.method;
    const swagger = swaggers[url];
    //     /api/x1/x2/x3/ => api_x1_x2/x3
    let fileName = path.replace(/^(.*)(\/.*)$/g, ($0, $1, $2) => {
      const $$1 = $1.replace(/\//g, "_").replace(/^_/, "");
      return `${$$1 ?? ""}${$2}`;
    });
    fileName = Utils.toLine(fileName) + `_${method}`;
    const savePath = vscode.Uri.joinPath(workUri, Config.tsSavePath);
    const savePathName = vscode.Uri.joinPath(savePath, fileName + ".ts");
    const content = new GenTs(swagger, path, method).codegen();
    await vscode.workspace.fs.writeFile(savePathName, Buffer.from(content));

    vscode.commands.executeCommand("vscode.open", savePathName);
  });
}

class CustomQuickPickItem implements vscode.QuickPickItem {
  constructor(
    public label: string,
    public method: string,
    public url: string,
    public description?: string,
    public detail?: string
  ) {}
  picked?: boolean | undefined;
  alwaysShow?: boolean | undefined;
}
