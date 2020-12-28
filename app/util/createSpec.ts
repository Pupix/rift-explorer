/**
 * Legacy code from @Pupix which won't be updated.
 * @since 2.0.1
 */
/* eslint-disable */
import { AxiosInstance } from "axios";

import { Agent } from "https";

import mixin from "mixin-deep";
import axios from "axios";

interface createSpecInterface {
  address: string;
  port: number;
  protocol: string;
  username: string;
  password: string;
}

interface rpInterface {
  uri: string;
  json: any;
}

/**
 * Simple axios instance with disabled SSL to allow the self signed cert
 */
const instance: AxiosInstance = axios.create({
  httpsAgent: new Agent({
    rejectUnauthorized: false,
  }),
});

/**
 * Since were using legacy code and not using request-promise we just create a
 * small work wrapper
 * @param uri {string}
 * @param json {boolean}
 */
async function rp({ uri, json }: rpInterface): Promise<any> {
  const request = await instance.get(uri);
  return request.data;
}

/**
 * @param address
 * @param port
 * @param username
 * @param password
 * @param protocol
 * @returns {Promise<{basePath: string, paths: {}, host: string, produces: [string, string, string], schemes: [*], definitions: {}, swagger: string, consumes, info: {description: string, title: string, version: *}}>}
 */
export default async ({
  address = "127.0.0.1",
  port,
  username = "riot",
  password,
  protocol = "https",
}: createSpecInterface): Promise<any> => {
  const helpConsole = await rp({
    uri: `${protocol}://${username}:${password}@${address}:${port}/help?format=Console`,
    json: true,
  });
  const helpFull = await rp({
    uri: `${protocol}://${username}:${password}@${address}:${port}/help?format=Full`,
    json: true,
  });
  const builds = await rp({
    uri: `${protocol}://${username}:${password}@${address}:${port}/system/v1/builds`,
    json: true,
  });
  const swagger = {
    host: `${address}:${port}`,
    schemes: [protocol],

    consumes: [
      "application/json",
      "application/vnd.api+json",
      "application/x-yaml",
      "application/x-msgpack",
      "application/octet-stream",
      "application/x-www-form-urlencoded",
      "multipart/form-data",
    ],
    definitions: {},
    paths: {},
    info: {
      description: "Always up to date LCU API documentation",
      title: "Rift Explorer 7",
      version: builds.version,
    },
    produces: [
      "application/json",
      "application/x-yaml",
      "application/x-msgpack",
    ],
    swagger: "2.0",
    components: {
      securitySchemes: {
        basicAuth: {
          type: "http",
          scheme: "basic",
        },
      },
    },
    security: {
      basicAuth: [],
    },
  };

  // Mix helps to get a more complete version
  const funcs = {};
  const types = {};
  const events = {};
  helpFull.functions.forEach((func) => {
    funcs[func.name] = func;
  });
  helpFull.types.forEach((type) => {
    types[type.name] = type;
  });
  helpFull.events.forEach((event) => {
    events[event.name] = event;
  });
  helpFull.functions = funcs;
  helpFull.types = types;
  helpFull.events = events;

  const help = mixin({}, helpConsole, helpFull);

  Object.keys(help.types).forEach((type) => {
    swagger.definitions[type] = {};

    if (help.types[type].description) {
      swagger.definitions[type].description = help.types[type].description;
    }

    // Object
    if (help.types[type].fields) {
      swagger.definitions[type].properties = {};

      help.types[type].fields.forEach((field) => {
        const fieldKey = field.name;
        swagger.definitions[type].properties[fieldKey] = {};
        swagger.definitions[type].properties[fieldKey].type = field.type.type;

        if (field.description) {
          swagger.definitions[type].properties[fieldKey].description =
            field.description;
        }

        // Check if the type of the field is an (u)int
        if (
          /^u?int/.test(swagger.definitions[type].properties[fieldKey].type)
        ) {
          swagger.definitions[type].properties[fieldKey].format =
            swagger.definitions[type].properties[fieldKey].type;
          swagger.definitions[type].properties[fieldKey].type = "integer";
          return;
        }

        // Check if the type of the field is a double
        if (swagger.definitions[type].properties[fieldKey].type === "string") {
          return;
        }

        // Check if the type of the field is a double
        if (swagger.definitions[type].properties[fieldKey].type === "double") {
          swagger.definitions[type].properties[fieldKey].format =
            swagger.definitions[type].properties[fieldKey].type;
          swagger.definitions[type].properties[fieldKey].type = "number";
          return;
        }

        // Check if the type of the field is a float
        if (swagger.definitions[type].properties[fieldKey].type === "float") {
          swagger.definitions[type].properties[fieldKey].format =
            swagger.definitions[type].properties[fieldKey].type;
          swagger.definitions[type].properties[fieldKey].type = "number";
          return;
        }

        // Check if the type of the field is signed as `object`
        if (swagger.definitions[type].properties[fieldKey].type === "object") {
          swagger.definitions[type].properties[
            fieldKey
          ].additionalProperties = true;
          return;
        }

        // Check if the type of the field is signed as `boolean`
        if (swagger.definitions[type].properties[fieldKey].type === "bool") {
          swagger.definitions[type].properties[fieldKey].type = "boolean";
          return;
        }

        if (swagger.definitions[type].properties[fieldKey].type === "map") {
          swagger.definitions[type].properties[fieldKey].type = "object";

          if (field.type.elementType === "object") {
            swagger.definitions[type].properties[
              fieldKey
            ].additionalProperties = {
              additionalProperties: true,
              type: "object",
            };
            return;
          }

          if (field.type.elementType === "string") {
            swagger.definitions[type].properties[
              fieldKey
            ].additionalProperties = {
              type: "string",
            };
            return;
          }

          if (/^u?int/.test(field.type.elementType)) {
            swagger.definitions[type].properties[
              fieldKey
            ].additionalProperties = {
              format: field.type.elementType,
              type: "integer",
            };
            return;
          }

          if (
            field.type.elementType === "double" ||
            field.type.elementType === "float"
          ) {
            swagger.definitions[type].properties[
              fieldKey
            ].additionalProperties = {
              format: field.type.elementType,
              type: "number",
            };
            return;
          }

          swagger.definitions[type].properties[
            fieldKey
          ].additionalProperties = {
            $ref: `#/definitions/${field.type.elementType}`,
          };

          return;
        }

        if (swagger.definitions[type].properties[fieldKey].type === "vector") {
          swagger.definitions[type].properties[fieldKey].type = "array";

          if (field.type.elementType === "object") {
            swagger.definitions[type].properties[fieldKey].items = {
              additionalProperties: true,
              type: "object",
            };
            return;
          }

          if (field.type.elementType === "string") {
            swagger.definitions[type].properties[fieldKey].items = {
              type: "string",
            };
            return;
          }

          if (/^u?int/.test(field.type.elementType)) {
            swagger.definitions[type].properties[fieldKey].items = {
              format: field.type.elementType,
              type: "integer",
            };
            return;
          }

          if (
            field.type.elementType === "double" ||
            field.type.elementType === "float"
          ) {
            swagger.definitions[type].properties[fieldKey].items = {
              format: field.type.elementType,
              type: "number",
            };
            return;
          }

          swagger.definitions[type].properties[fieldKey].items = {
            $ref: `#/definitions/${field.type.elementType}`,
          };

          return;
        }

        // Check if the type is an actual object
        // this is the case when a ref to another definition is made
        // if (typeof swagger.definitions[type].properties[fieldKey].type === 'object') {
        swagger.definitions[type].properties[
          fieldKey
        ].$ref = `#/definitions/${swagger.definitions[type].properties[fieldKey].type}`;
        delete swagger.definitions[type].properties[fieldKey].type;
        // }
      });

      swagger.definitions[type].type = "object";
    }

    // String
    if (help.types[type].values && help.types[type].values.length) {
      swagger.definitions[type].type = "string";
      swagger.definitions[type].enum = [];

      help.types[type].values.forEach((value) => {
        swagger.definitions[type].enum[value.value] = value.name;
      });

      swagger.definitions[type].enum = swagger.definitions[type].enum.filter(
        (item) => !!item
      );
    }
  });

  const functions = {};
  Object.keys(help.functions).forEach((func) => {
    const helpFunc = help.functions[func];

    if (!functions[helpFunc.url]) {
      functions[helpFunc.url] = [];
    }

    functions[helpFunc.url].push(
      Object.assign({ name: func }, help.functions[func])
    );
  });

  Object.keys(functions).forEach((key) => {
    const func = functions[key];
    const result = {};

    func.forEach((funcDef) => {
      const method = funcDef.http_method || "";

      result[method.toLowerCase()] = {
        operationId: funcDef.name,
        tags: funcDef.url
          ? [`Plugins ${funcDef.url.match("^/([^/]*)")[1]}`]
          : funcDef.tags,
      };

      if (funcDef.description) {
        result[method.toLowerCase()].summary = funcDef.description;
      }

      if (!result[method.toLowerCase()].tags.length) {
        result[method.toLowerCase()].tags = ["Untagged"];
      }

      result[method.toLowerCase()].parameters = funcDef.arguments.map(
        (argument) => {
          let argumentLocation = "body";

          if (new RegExp(`{${argument.name}}`).test(funcDef.url)) {
            argumentLocation = "path";
            // These are the only known header arguments
          } else if (["JWT", "if-none-match"].includes(argument.name)) {
            argumentLocation = "header";
          }

          const parameter = {
            in: argumentLocation,
            name: argument.name,
            required: !argument.optional,
            format: argument.format,
            type: argument.type,
            additionalProperties: argument.additionalProperties,
            items: argument.items,
            schema: argument.schema,
          };

          if (/^u?int/.test(argument.type.type)) {
            parameter.format = argument.type.type;
            parameter.type = "integer";
            return parameter;
          }

          // Check if the type of the field is a double
          if (argument.type.type === "string") {
            parameter.type = argument.type.type;
          }

          // Check if the type of the field is a double
          if (
            argument.type.type === "double" ||
            argument.type.type === "float"
          ) {
            parameter.format = argument.type.type;
            parameter.type = "number";
            return parameter;
          }

          // Check if the type of the field is signed as `object`
          if (argument.type.type === "object") {
            parameter.additionalProperties = true;
            parameter.type = argument.type.type;
            return parameter;
          }

          // Check if the type of the field is signed as `boolean`
          if (argument.type.type === "bool") {
            parameter.type = "boolean";
            return parameter;
          }

          if (argument.type.type === "map") {
            parameter.type = "object";

            if (argument.type.elementType === "object") {
              parameter.additionalProperties = {
                additionalProperties: true,
                type: "object",
              };
              return parameter;
            }

            if (argument.type.elementType === "string") {
              parameter.additionalProperties = {
                type: "string",
              };
              return parameter;
            }

            if (/^u?int/.test(argument.type.elementType)) {
              parameter.additionalProperties = {
                format: argument.type.elementType,
                type: "integer",
              };
              return parameter;
            }

            if (
              argument.type.elementType === "double" ||
              argument.type.elementType === "float"
            ) {
              parameter.additionalProperties = {
                format: argument.type.elementType,
                type: "number",
              };
              return parameter;
            }

            parameter.additionalProperties = {
              $ref: `#/definitions/${argument.type.elementType}`,
            };

            return parameter;
          }

          if (argument.type.type === "vector") {
            parameter.type = "array";

            if (argument.type.elementType === "object") {
              parameter.items = {
                additionalProperties: true,
                type: "object",
              };
              return parameter;
            }

            if (argument.type.elementType === "string") {
              parameter.items = {
                type: "string",
              };
              return parameter;
            }

            if (/^u?int/.test(argument.type.elementType)) {
              parameter.items = {
                format: argument.type.elementType,
                type: "integer",
              };
              return parameter;
            }

            if (
              argument.type.elementType === "double" ||
              argument.type.elementType === "float"
            ) {
              parameter.items = {
                format: argument.type.elementType,
                type: "number",
              };
              return parameter;
            }

            parameter.items = {
              $ref: `#/definitions/${argument.type.elementType}`,
            };

            return parameter;
          }

          parameter.schema = { $ref: `#/definitions/${argument.type.type}` };
          delete parameter.type;

          return parameter;
        }
      );

      if (funcDef.http_method === "GET" || funcDef.http_method === "POST") {
        if (funcDef.returns.type === "object") {
          result[method.toLowerCase()].responses = {
            200: {
              description: "Successful response",
              schema: {
                additionalProperties: true,
                type: "object",
              },
            },
          };

          return;
        }

        if (funcDef.returns.type === "string") {
          result[method.toLowerCase()].responses = {
            200: {
              description: "Successful response",
              schema: {
                type: "string",
              },
            },
          };

          return;
        }

        if (
          funcDef.returns.type === "double" ||
          funcDef.returns.type === "float"
        ) {
          result[method.toLowerCase()].responses = {
            200: {
              description: "Successful response",
              schema: {
                format: funcDef.returns.type,
                type: "number",
              },
            },
          };

          return;
        }

        if (funcDef.returns.type === "bool") {
          result[method.toLowerCase()].responses = {
            200: {
              description: "Successful response",
              schema: {
                type: "boolean",
              },
            },
          };

          return;
        }

        if (/^u?int/.test(funcDef.returns.type)) {
          result[method.toLowerCase()].responses = {
            200: {
              description: "Successful response",
              schema: {
                type: "integer",
              },
            },
          };

          return;
        }

        // Check if the type of the field is signed as array of definitions
        if (funcDef.returns.type === "vector") {
          if (funcDef.returns.elementType === "object") {
            result[method.toLowerCase()].responses = {
              200: {
                description: "Successful response",
                schema: {
                  type: "array",
                  items: {
                    additionalProperties: true,
                    type: funcDef.returns.elementType,
                  },
                },
              },
            };

            return;
          }

          if (funcDef.returns.elementType === "string") {
            result[method.toLowerCase()].responses = {
              200: {
                description: "Successful response",
                schema: {
                  type: "array",
                  items: {
                    type: funcDef.returns.elementType,
                  },
                },
              },
            };

            return;
          }

          if (
            funcDef.returns.elementType === "double" ||
            funcDef.returns.elementType === "float"
          ) {
            result[method.toLowerCase()].responses = {
              200: {
                description: "Successful response",
                schema: {
                  type: "array",
                  items: {
                    format: funcDef.returns.elementType,
                    type: "number",
                  },
                },
              },
            };
            return;
          }

          if (funcDef.returns.elementType === "bool") {
            result[method.toLowerCase()].responses = {
              200: {
                description: "Successful response",
                schema: {
                  type: "array",
                  items: {
                    type: "boolean",
                  },
                },
              },
            };
            return;
          }

          if (/^u?int/.test(funcDef.returns.elementType)) {
            result[method.toLowerCase()].responses = {
              200: {
                description: "Successful response",
                schema: {
                  type: "array",
                  items: {
                    type: "integer",
                  },
                },
              },
            };
            return;
          }

          result[method.toLowerCase()].responses = {
            200: {
              description: "Successful response",
              schema: {
                type: "array",
                items: {
                  $ref: `#/definitions/${funcDef.returns.elementType}`,
                },
              },
            },
          };

          return;
        }

        if (funcDef.returns.type === "map") {
          if (funcDef.returns.elementType === "object") {
            result[method.toLowerCase()].responses = {
              200: {
                description: "Successful response",
                schema: {
                  type: "object",
                  additionalProperties: {
                    additionalProperties: true,
                    type: funcDef.returns.elementType,
                  },
                },
              },
            };

            return;
          }

          if (funcDef.returns.elementType === "string") {
            result[method.toLowerCase()].responses = {
              200: {
                description: "Successful response",
                schema: {
                  type: "object",
                  additionalProperties: {
                    type: funcDef.returns.elementType,
                  },
                },
              },
            };

            return;
          }

          if (
            funcDef.returns.elementType === "double" ||
            funcDef.returns.elementType === "float"
          ) {
            result[method.toLowerCase()].responses = {
              200: {
                description: "Successful response",
                schema: {
                  type: "object",
                  additionalProperties: {
                    format: funcDef.returns.elementType,
                    type: "number",
                  },
                },
              },
            };
            return;
          }

          if (funcDef.returns.elementType === "bool") {
            result[method.toLowerCase()].responses = {
              200: {
                description: "Successful response",
                schema: {
                  type: "object",
                  additionalProperties: {
                    type: "boolean",
                  },
                },
              },
            };
            return;
          }

          if (/^u?int/.test(funcDef.returns.elementType)) {
            result[method.toLowerCase()].responses = {
              200: {
                description: "Successful response",
                schema: {
                  type: "object",
                  additionalProperties: {
                    type: "integer",
                  },
                },
              },
            };
            return;
          }

          result[method.toLowerCase()].responses = {
            200: {
              description: "Successful response",
              schema: {
                type: "object",
                additionalProperties: {
                  type: funcDef.returns.elementType,
                },
              },
            },
          };

          return;
        }

        if (funcDef.returns.type) {
          result[method.toLowerCase()].responses = {
            200: {
              description: "Successful response",
              schema: {
                $ref: `#/definitions/${Object.keys(funcDef.returns)[0]}`,
              },
            },
          };

          return;
        }

        result[method.toLowerCase()].responses = {
          204: {
            description: "No content",
          },
        };

        // Check if the type of the field is signed as map of definitions
        // if (/^map of .*$/.test(swagger.definitions[type].properties[fieldKey].type)) {
        //     const [, def] = swagger.definitions[type].properties[fieldKey].type.match(/^map of (.*)$/);
        //     swagger.definitions[type].properties[fieldKey].type = 'object';
        //     swagger.definitions[type].properties[fieldKey].additionalProperties = {
        //         $ref: `#/definitions/${def}`,
        //     };
        // }
      }

      if (funcDef.http_method === "DELETE") {
        result[method.toLowerCase()].responses = {
          204: {
            description: "No content",
          },
        };
      }
    });

    functions[key] = result;
  });

  swagger.paths = functions;

  return swagger;
};
/* eslint-enable */
