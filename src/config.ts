import * as vscode from "vscode";
/**
 * 配置
 */
export class Config {
  private static get getConfigs(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration("swagger-codegen");
  }
  /**
   * 获取swagger域名地址
   */
  static get urls(): string[] {
    return this.getConfigs.get("urls") ?? [];
  }
  /**
   * 生成的ts文件存放的目录
   */
  static get tsSavePath(): string {
    return this.getConfigs.get("tsSavePath") ?? "";
  }
  /**
   * 生成的ts文件顶部附加的代码
   */
  static get tsAdditionCode(): string | undefined {
    return this.getConfigs.get("tsAdditionCode");
  }
}
