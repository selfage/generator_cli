import path = require("path");
import { ServiceDefinition } from "./definition";
import { DefinitionFinder } from "./definition_finder";
import { OutputContentBuilder } from "./output_content_builder";
import {
  normalizeRelativePathForNode,
  reverseImport,
  toInitalLowercased,
  toUppercaseSnaked,
  transitImport,
} from "./util";

let PRIMITIVE_TYPE_BYTES = "bytes";
let PRIMITIVE_TYPES = new Set<string>([PRIMITIVE_TYPE_BYTES]);

export function generateServiceDescriptor(
  modulePath: string,
  serviceName: string,
  serviceDefinition: ServiceDefinition,
  definitionFinder: DefinitionFinder,
  contentMap: Map<string, OutputContentBuilder>,
): void {
  let serviceDescriptorName = toUppercaseSnaked(serviceName);
  let outputContentBuilder = OutputContentBuilder.get(contentMap, modulePath);
  outputContentBuilder.importFromServiceDescriptor("ServiceDescriptor");
  outputContentBuilder.push(`
export let ${serviceDescriptorName}: ServiceDescriptor = {
  name: "${serviceName}",
  path: "${serviceDefinition.path}",`);

  if (PRIMITIVE_TYPES.has(serviceDefinition.body)) {
    outputContentBuilder.importFromServiceDescriptor("PrimitveTypeForBody");
    outputContentBuilder.push(`
  body: {
    primitiveType: PrimitveTypeForBody.${serviceDefinition.body.toUpperCase()},
  },`);
  } else {
    let requestDefinition = definitionFinder.getDefinition(
      serviceDefinition.body,
      serviceDefinition.importBody,
    );
    if (!requestDefinition || !requestDefinition.message) {
      throw new Error(
        `Request body ${serviceDefinition.body} is not found or not a message.`,
      );
    }

    let requestDescriptorName = toUppercaseSnaked(serviceDefinition.body);
    outputContentBuilder.importFromPath(
      serviceDefinition.importBody,
      requestDescriptorName,
    );
    outputContentBuilder.push(`
  body: {
    messageType: ${requestDescriptorName},
  },`);
  }

  if (serviceDefinition.auth) {
    let authDescriptorName = toUppercaseSnaked(serviceDefinition.auth.type);
    outputContentBuilder.importFromPath(
      serviceDefinition.auth.import,
      authDescriptorName,
    );
    outputContentBuilder.push(`
  auth: {
    key: "${serviceDefinition.auth.key}",
    type: ${authDescriptorName}
  },`);
  }

  if (serviceDefinition.metadata) {
    let metadataDescriptorName = toUppercaseSnaked(
      serviceDefinition.metadata.type,
    );
    outputContentBuilder.importFromPath(
      serviceDefinition.metadata.import,
      metadataDescriptorName,
    );
    outputContentBuilder.push(`
  metadata: {
    key: "${serviceDefinition.metadata.key}",
    type: ${metadataDescriptorName},
  },`);
  }

  let responseDescriptorName = toUppercaseSnaked(serviceDefinition.response);
  outputContentBuilder.importFromPath(
    serviceDefinition.importResponse,
    responseDescriptorName,
  );
  outputContentBuilder.push(`
  response: {
    messageType: ${responseDescriptorName},
  },`);
  outputContentBuilder.push(`
}
`);

  if (serviceDefinition.outputWebClient) {
    generateWebClient(modulePath, serviceName, serviceDefinition, contentMap);
  }
  if (serviceDefinition.outputHandler) {
    generateHandler(modulePath, serviceName, serviceDefinition, contentMap);
  }
}

function generateWebClient(
  modulePath: string,
  serviceName: string,
  serviceDefinition: ServiceDefinition,
  contentMap: Map<string, OutputContentBuilder>,
): void {
  let serviceDescriptorName = toUppercaseSnaked(serviceName);
  let outputWebClientPath = normalizeRelativePathForNode(
    path.posix.join(
      path.posix.dirname(modulePath),
      serviceDefinition.outputWebClient,
    ),
  );
  let outputWebClientContentBuilder = OutputContentBuilder.get(
    contentMap,
    outputWebClientPath,
  );
  let importDescriptorPath = reverseImport(modulePath, outputWebClientPath);

  outputWebClientContentBuilder.importFromWebServiceClientInterface(
    "WebServiceClientInterface",
  );
  outputWebClientContentBuilder.push(`
export function ${toInitalLowercased(serviceName)}(
  client: WebServiceClientInterface,`);

  if (PRIMITIVE_TYPES.has(serviceDefinition.body)) {
    if (serviceDefinition.body === PRIMITIVE_TYPE_BYTES) {
      outputWebClientContentBuilder.push(`
  body: Blob,`);
    } else {
      throw new Error(
        `${serviceName} has defined unsupported service request body ${serviceDefinition.body} when generating web client.`,
      );
    }
  } else {
    outputWebClientContentBuilder.importFromPath(
      transitImport(importDescriptorPath, serviceDefinition.importBody),
      serviceDefinition.body,
    );
    outputWebClientContentBuilder.push(`
  body: ${serviceDefinition.body},`);
  }

  if (serviceDefinition.metadata) {
    outputWebClientContentBuilder.importFromPath(
      transitImport(importDescriptorPath, serviceDefinition.metadata.import),
      serviceDefinition.metadata.type,
    );
    outputWebClientContentBuilder.push(`
  metadata: ${serviceDefinition.metadata.type},`);
  }

  outputWebClientContentBuilder.importFromWebServiceClientInterface(
    "WebServiceClientOptions",
  );
  outputWebClientContentBuilder.importFromPath(
    transitImport(importDescriptorPath, serviceDefinition.importResponse),
    serviceDefinition.response,
  );
  outputWebClientContentBuilder.importFromPath(
    importDescriptorPath,
    serviceDescriptorName,
  );
  outputWebClientContentBuilder.push(`
  options?: WebServiceClientOptions,
): Promise<${serviceDefinition.response}> {
  return client.send(
    {
      descriptor: ${serviceDescriptorName},
      body,`);

  if (serviceDefinition.metadata) {
    outputWebClientContentBuilder.push(`
      metadata,`);
  }

  outputWebClientContentBuilder.push(`
    },
    options,
  );
}
`);
}

function generateHandler(
  modulePath: string,
  serviceName: string,
  serviceDefinition: ServiceDefinition,
  contentMap: Map<string, OutputContentBuilder>,
): void {
  let serviceDescriptorName = toUppercaseSnaked(serviceName);
  let outputHandlerPath = normalizeRelativePathForNode(
    path.posix.join(
      path.posix.dirname(modulePath),
      serviceDefinition.outputHandler,
    ),
  );
  let outputHandlerContentBuilder = OutputContentBuilder.get(
    contentMap,
    outputHandlerPath,
  );
  let importDescriptorPath = reverseImport(modulePath, outputHandlerPath);

  outputHandlerContentBuilder.importFromServiceHandlerInterface(
    "ServiceHandlerInterface",
  );
  outputHandlerContentBuilder.importFromPath(
    importDescriptorPath,
    serviceDescriptorName,
  );
  outputHandlerContentBuilder.push(`
export abstract class ${serviceName}HandlerInterface implements ServiceHandlerInterface {
  public descriptor = ${serviceDescriptorName};
  public abstract handle(
    loggingPrefix: string,`);

  if (PRIMITIVE_TYPES.has(serviceDefinition.body)) {
    if (serviceDefinition.body === PRIMITIVE_TYPE_BYTES) {
      outputHandlerContentBuilder.importFromPath("stream", "Readable");
      outputHandlerContentBuilder.push(`
    body: Readable,`);
    } else {
      throw new Error(
        `${serviceName} has defined unsupported service request body ${serviceDefinition.body} when generating handler.`,
      );
    }
  } else {
    outputHandlerContentBuilder.importFromPath(
      transitImport(importDescriptorPath, serviceDefinition.importBody),
      serviceDefinition.body,
    );
    outputHandlerContentBuilder.push(`
    body: ${serviceDefinition.body},`);
  }

  if (serviceDefinition.metadata) {
    outputHandlerContentBuilder.importFromPath(
      transitImport(importDescriptorPath, serviceDefinition.metadata.import),
      serviceDefinition.metadata.type,
    );
    outputHandlerContentBuilder.push(`
    metadata: ${serviceDefinition.metadata.type},`);
  }

  if (serviceDefinition.auth) {
    outputHandlerContentBuilder.importFromPath(
      transitImport(importDescriptorPath, serviceDefinition.auth.import),
      serviceDefinition.auth.type,
    );
    outputHandlerContentBuilder.push(`
    auth: ${serviceDefinition.auth.type},`);
  }

  outputHandlerContentBuilder.importFromPath(
    transitImport(importDescriptorPath, serviceDefinition.importResponse),
    serviceDefinition.response,
  );
  outputHandlerContentBuilder.push(`
  ): Promise<${serviceDefinition.response}>;
}
`);
}
