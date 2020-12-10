import Axios from "axios";

/**
 * 请求swagger json
 * @param url
 */
export async function getSwagger(
  url: string
): Promise<Swagger.Response | undefined> {
  try {
    const res = await Axios.get<Swagger.Response>(url);
    return res?.data;
  } catch (error) {
    return;
  }
}

export namespace Swagger {
  export interface Response {
    basePath?: string;
    swagger?: string;
    host?: string;
    tags?: {
      name: string;
      description: string;
    }[];
    paths?: Paths;
    definitions?: Definitions;
    info?: {
      description: string;
      version: string;
      title: string;
      termsOfService: string;
      contact: {
        name: string;
        url: string;
      };
    };
  }

  export interface Paths {
    [key: string]: {
      [key: string]: {
        tags: string[];
        summary: string;
        description: string;
        operationId: string;
        consumes: string[];
        produces: string[];
        parameters: SchemaNode[];
        responses: {
          [key: string]: {
            description: string;
            schema: SchemaNode;
          };
        };
      };
    };
  }

  export interface Definitions {
    [key: string]: SchemaNode;
  }
}
export interface SchemaNode {
  in: string;
  name: string;
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
