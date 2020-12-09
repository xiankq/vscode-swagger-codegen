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
        parameters: {
          in: string;
          name: string;
          description: string;
          type: string;
          required: boolean;
          "x-example": string;
          schema: {
            $ref: string;
          };
        }[];
        responses: {
          [key: string]: {
            description: string;
            schema: {
              $ref: string;
            };
          };
        };
      };
    };
  }

  export interface Definitions {
    [key: string]: {
      type: string;
      properties: {
        [key: string]: {
          type: string;
          $ref: string;
        };
      };
      items: {
        $ref: string;
      };
    };
  }
}
