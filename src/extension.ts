import { join } from "path";
import * as vscode from "vscode";
import { Config } from "./config";
import { getSwagger, Swagger } from "./fetch";
import { Utils } from "./utils";
export function activate(context: vscode.ExtensionContext) {
  vscode.commands.registerCommand("swagger-codegen.start", async () => {
    const urls = Config.urls;
    if (!urls.length) {
      return vscode.window.showWarningMessage("No swagger-url defined.");
    }
    const swaggers: { [key: string]: Swagger.Response } = {};

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

    const select = await vscode.window.showQuickPick<CustomQuickPickItem>(
      getList()
    );

    if (!select) {
      return;
    }
    const workUri = vscode?.workspace?.workspaceFolders?.[0]?.uri;
    if (!workUri) {
      return vscode.window.showErrorMessage("没有找到工作区");
    }
    const url = select.url;
    const path = select.label;
    const method = select.method;
    const swagger = swaggers[url];
    ///文件名 ${下划线}/${end}_${method}
    const displayName = Utils.toLine(
      path.replace(/^(.*)(\/.*)$/g, ($0, $1, $2) => {
        const $$1 = $1.replace(/\//g, "_").replace(/^_/, "");
        return `${$$1 ?? ""}${$2}`;
      }) + `_${method}`
    );
    const savePath = vscode.Uri.joinPath(workUri, Config.tsSavePath);
    const savePathName = vscode.Uri.joinPath(savePath, displayName + ".ts");
    const $namespace = Utils.toUpperCaseHump(
      displayName.replace(/\//g, "_").replace(/\W/g, "")
    );

    let content = buildTs(swagger, path, method);
    content = `export namespace ${$namespace} {\n${content}\n}`;
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

/**
 * 生成ts请求代码
 * @param swagger
 * @param path
 * @param method
 */
function buildTs(
  swagger: Swagger.Response,
  path: string,
  method: string
): string {
  const definitions = swagger.definitions ?? {};
  const inter = swagger.paths?.[path]?.[method];
  const tags = inter?.tags ?? [];
  const summary = inter?.summary ?? "";
  const description = inter?.description ?? "";
  const parameters = inter?.parameters ?? [];
  const responses = inter?.responses?.["200"];
  ///类型转换
  function typeShift(type: string | undefined): string {
    const obj: any = {
      integer: "number",
      string: "string",
      boolean: "boolean",
      any: "any",
    };
    return obj[type ?? "any"] ?? "any";
  }
  function recursion(name: string, obj: any): string[] {
    let back: string[] = [];
    const data = <SchemaNode>obj;

    if (data?.$ref) {
      const definitionField = data.$ref.replace("#/definitions/", "");
      back = back.concat(recursion(name, definitions[definitionField]));
    }
    //
    else if (data?.properties) {
      const properties = data?.properties;
      const annotation = [];
      const items: string[] = [];
      for (const field in properties) {
        const fieldUpperCase = Utils.toFirstUpperCase(field);
        const property = properties[field];
        //注释
        annotation.push(
          `   * @param ${field}  ${property?.description ?? ""}${
            property?.required ? "  必须" : ""
          }${
            property?.["x-example"]
              ? "  `示例:" + property?.["x-example"] + "`"
              : ""
          }`
        );
        if (property?.$ref || property?.properties) {
          items.push(`    ${field}?: ${fieldUpperCase};`);
          back = back.concat(recursion(fieldUpperCase, property));
        }
        //array
        else if (property?.items) {
          if (property?.items?.$ref || property?.items?.properties) {
            items.push(`    ${field}?: ${fieldUpperCase}[];`);
            back = back.concat(recursion(fieldUpperCase, property?.items));
          } else {
            items.push(`    ${field}?: ${typeShift(property?.items?.type)}[];`);
          }
        }
        //type
        else {
          items.push(`    ${field}?: ${typeShift(property?.type)};`);
        }
      }
      const content1 = `\n  /**\n${annotation.join("\n")}*\n   */`;
      back.push(content1);
      const content2 = `  export interface ${name} {\n${items.join("\n")}\n  }`;
      back.push(content2);
    }
    return back;
  }

  ///
  let strblocks: string[] = [];

  ///生成请求函数
  const requestContent = `
  /**
   * @title    ${swagger?.info?.title}
   * @tags     ${tags?.join(",") ?? ""}
   * @summary  ${summary ?? ""}
   * @desc     ${description ?? ""} 
   */
  export function request(requester: (params: any) => any,params?: RequestInput): Promise<${
    responses?.schema ? "ResponsesBody" : "any"
  }> {
    return requester({
         url: '${path}',
         method: '${method}',
         params: params?.params,
         paths: params?.paths,
         data: params?.data,
    });
  }`;
  strblocks.push(requestContent);

  const queryParameters = parameters.filter((e) => e.in === "query");
  const bodyParameters = parameters.filter((e) => e.in === "body");
  const pathParameters = parameters.filter((e) => e.in === "path");
  //生成请求类
  const requestInput = `
  export interface RequestInput {\n    [x: string]: any;\n${
    queryParameters.length ? `    query?: RequestQuery;\n` : ""
  }${bodyParameters.length ? `    data?: RequestData` : ""}${
    pathParameters.length ? `    path?: RequestPath` : ""
  }
  }\n`;
  strblocks.push(requestInput);

  ///生成query请求
  if (queryParameters.length) {
    const annotation = [];
    const querys = [];
    for (const item of queryParameters) {
      //注释
      annotation.push(
        `   * @param ${item.name}  ${item?.description ?? ""}${
          item?.required ? "  必须" : ""
        }${item?.["x-example"] ? "  `示例:" + item?.["x-example"] + "`" : ""}`
      );
      querys.push(`    ${item.name}?: ${typeShift(item.type)};`);
    }
    const content1 = `\n  /**\n${annotation.join("\n")}*\n   */`;
    strblocks.push(content1);
    const content2 = `  export interface RequestQuery {\n${querys.join(
      "\n"
    )}\n  }`;
    strblocks.push(content2);
  }
  ///生成path请求
  if (pathParameters.length) {
    const annotation = [];
    const paths = [];
    for (const item of pathParameters) {
      //注释
      annotation.push(
        `   * @param ${item.name}  ${item?.description ?? ""}${
          item?.required ? "  必须" : ""
        }${item?.["x-example"] ? "  `示例:" + item?.["x-example"] + "`" : ""}`
      );
      paths.push(`    ${item.name}?: ${typeShift(item.type)};`);
    }
    const content1 = `\n  /**\n${annotation.join("\n")}*\n   */`;
    strblocks.push(content1);
    const content2 = `  export interface RequestPath {\n${paths.join(
      "\n"
    )}\n  }`;
    strblocks.push(content2);
  }
  ///生成body请求
  if (bodyParameters.length) {
    for (const item of bodyParameters) {
      strblocks = strblocks.concat(recursion("RequestData", item?.schema));
    }
  }
  ///生成响应
  if (responses?.schema) {
    strblocks = strblocks.concat(recursion("ResponsesBody", responses?.schema));
  }
  return strblocks?.join("\n");
}

interface SchemaNode {
  type: string;
  $ref: string;
  description: string;
  required: string;
  "x-example": string;
  schema: SchemaNode;
  properties: {
    [key: string]: SchemaNode;
  };
  items: SchemaNode;
}
