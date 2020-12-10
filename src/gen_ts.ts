import { SchemaNode, Swagger } from "./fetch";
import { Utils } from "./utils";
/**
 * 生成Typescript代码
 */
export class GenTs {
  constructor(
    public readonly swagger: Swagger.Response,
    public readonly path: string,
    public readonly method: string
  ) {}

  /**
   * swagger返回的实体类集合
   */
  private get definitions(): Swagger.Definitions {
    return this.swagger.definitions ?? {};
  }
  /**
   * 接口详情
   */
  private get interface() {
    return this.swagger.paths?.[this.path]?.[this.method];
  }

  /**
   * 类型转换
   * @param type
   */
  private typeShift(type: string | undefined): string {
    const obj: any = {
      integer: "number",
      string: "string",
      boolean: "boolean",
      any: "any",
    };
    return obj[type ?? "any"] ?? "any";
  }

  /**
   * 递归生成多层嵌套的实体类代码  （接口返回的实体类，body请求的实体类）
   * @param name
   * @param obj
   */
  private recursion(name: string, obj: SchemaNode): string[] {
    let back: string[] = [];
    const data = <SchemaNode>obj; //类型强制转换

    //$ref为引用其他实体类，该实体类的名
    if (data?.$ref) {
      const definitionField = data.$ref.replace("#/definitions/", "");
      back = back.concat(
        this.recursion(name, this.definitions[definitionField])
      );
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
          back = back.concat(this.recursion(fieldUpperCase, property));
        }
        //array
        else if (property?.items) {
          if (property?.items?.$ref || property?.items?.properties) {
            items.push(`    ${field}?: ${fieldUpperCase}[];`);
            back = back.concat(this.recursion(fieldUpperCase, property?.items));
          } else {
            items.push(
              `    ${field}?: ${this.typeShift(property?.items?.type)}[];`
            );
          }
        }
        //type
        else {
          items.push(`    ${field}?: ${this.typeShift(property?.type)};`);
        }
      }
      const content1 = `\n  /**\n${annotation.join("\n")}*\n   */`;
      back.push(content1);
      const content2 = `  export interface ${name} {\n${items.join("\n")}\n  }`;
      back.push(content2);
    }
    return back;
  }

  /**
   * 请求参数的代码生成
   * @param parameters
   */
  private paramsgen(name: string, parameters: SchemaNode[]): string[] {
    const back: string[] = [];
    if (!parameters?.length) {
      return [];
    }
    const annotation = [];
    const querys = [];
    for (const item of parameters) {
      //注释
      annotation.push(
        `   * @param ${item.name}  ${item?.description ?? ""}${
          item?.required ? "  必须" : ""
        }${item?.["x-example"] ? "  `示例:" + item?.["x-example"] + "`" : ""}`
      );
      querys.push(`    ${item.name}?: ${this.typeShift(item.type)};`);
    }
    const content1 = `\n  /**\n${annotation.join("\n")}*\n   */`;
    back.push(content1);
    const content2 = `  export interface ${name} {\n${querys.join("\n")}\n  }`;
    back.push(content2);
    return back;
  }

  /**
   * 代码生成
   */
  codegen(): string {
    const title = this.swagger?.info?.title;
    const tags = this.interface?.tags ?? [];
    const summary = this.interface?.summary ?? "";
    const description = this.interface?.description ?? "";
    const parameters = this.interface?.parameters ?? [];
    const responses = this.interface?.responses?.["200"];
    //一个个代码块
    let codeBlocks: string[] = [];

    ///生成请求函数
    const requestContent = `
      /**
       * @title    ${title}
       * @tags     ${tags?.join(",") ?? ""}
       * @summary  ${summary ?? ""}
       * @desc     ${description ?? ""} 
       */
      export function request(requester: (params: any) => any,params?: RequestInput): Promise<${
        responses?.schema ? "ResponsesBody" : "any"
      }> {
        return requester({
             url: '${this.path}',
             method: '${this.method}',
             params: params?.params,
             paths: params?.paths,
             data: params?.data,
        });
      }`;
    codeBlocks.push(requestContent);

    const queryParameters = parameters.filter((e) => e.in === "query");
    const pathParameters = parameters.filter((e) => e.in === "path");
    const bodyParameters = parameters.filter((e) => e.in === "body");
    //生成请求类
    const requestInput = `
      export interface RequestInput {\n    [x: string]: any;\n${
        queryParameters.length ? `    query?: RequestQuery;\n` : ""
      }${bodyParameters.length ? `    data?: RequestData` : ""}${
      pathParameters.length ? `    path?: RequestPath` : ""
    }
      }\n`;
    codeBlocks.push(requestInput);
    //生成query请求参数
    codeBlocks = codeBlocks.concat(
      this.paramsgen("RequestQuery", queryParameters)
    );
    //生成path请求参数
    codeBlocks = codeBlocks.concat(
      this.paramsgen("RequestPath", pathParameters)
    );
    //生成body请求参数
    if (bodyParameters?.length) {
      codeBlocks = codeBlocks.concat(
        this.recursion("RequestData", bodyParameters[0]?.schema)
      );
    }
    //生成响应
    if (responses?.schema) {
      codeBlocks = codeBlocks.concat(
        this.recursion("ResponsesBody", responses?.schema)
      );
    }

    //     /api/x1/x2/x3/ => api_x1_x2/x3
    const $namespace = Utils.toUpperCaseHump(
      this.path.replace(/\//g, "_").replace(/\W/g, "")
    );

    const content = `
    /**
       * @title    ${title}
       * @tags     ${tags?.join(",") ?? ""}
       * @summary  ${summary ?? ""}
       * @desc     ${description ?? ""} 
       */
    export namespace $${$namespace} {\n${codeBlocks?.join("\n")}\n}`;

    return content;
  }
}
