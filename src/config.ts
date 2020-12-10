import * as vscode from "vscode";
/**
 * 配置
 */
export class Config {
  private static get getConfigs(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration("swagger-codegen");
  }
  /**
   * 获取swagger域名地址(已去重)
   */
  static get urls(): string[] {
    const arr: string[] = this.getConfigs.get("urls") ?? [];
    return Array.from(new Set(arr));
  }
  /**
   * 生成的ts文件存放的目录
   */
  static get tsSavePath(): string {
    return this.getConfigs.get("tsSavePath") ?? "";
  }
}
