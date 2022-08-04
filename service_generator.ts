import path = require("path");
import { ServiceDefinition } from "./definition";
import { OutputContentBuilder } from "./output_content_builder";
import { TypeLoader } from "./type_loader";
import {
  normalizeRelativePathForNode,
  reverseImport,
  toUpperSnaked,
  transitImport,
} from "./util";

let PRIMITIVE_TYPE_BLOB = "blob";
let PRIMITIVE_TYPES = new Set<string>([PRIMITIVE_TYPE_BLOB]);

export function generateServiceDescriptor(
  modulePath: string,
  serviceName: string,
  serviceDefinition: ServiceDefinition,
  typeLoader: TypeLoader,
  contentMap: Map<string, OutputContentBuilder>
): void {
  let serviceDescriptorName = toUpperSnaked(serviceName);
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
    let requestDefinition = typeLoader.getDefinition(
      serviceDefinition.body,
      serviceDefinition.importBody
    );
    if (!requestDefinition || !requestDefinition.message) {
      throw new Error(
        `Request body ${serviceDefinition.body} is not found or not a message.`
      );
    }

    let requestDescriptorName = toUpperSnaked(serviceDefinition.body);
    outputContentBuilder.importFromPath(
      serviceDefinition.importBody,
      requestDescriptorName
    );
    outputContentBuilder.push(`
  body: {
    messageType: ${requestDescriptorName},
  },`);
  }

  if (serviceDefinition.signedUserSession) {
    let signedUserSessionDescriptorName = toUpperSnaked(
      serviceDefinition.signedUserSession.type
    );
    outputContentBuilder.importFromPath(
      serviceDefinition.signedUserSession.import,
      signedUserSessionDescriptorName
    );
    outputContentBuilder.push(`
  signedUserSession: {
    key: "${serviceDefinition.signedUserSession.key}",
    type: ${signedUserSessionDescriptorName}
  },`);
  }

  if (serviceDefinition.side) {
    let sideDescriptorName = toUpperSnaked(serviceDefinition.side.type);
    outputContentBuilder.importFromPath(
      serviceDefinition.side.import,
      sideDescriptorName
    );
    outputContentBuilder.push(`
  side: {
    key: "${serviceDefinition.side.key}",
    type: ${sideDescriptorName},
  },`);
  }

  let responseDescriptorName = toUpperSnaked(serviceDefinition.response);
  outputContentBuilder.importFromPath(
    serviceDefinition.importResponse,
    responseDescriptorName
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
  contentMap: Map<string, OutputContentBuilder>
): void {
  let serviceDescriptorName = toUpperSnaked(serviceName);
  let outputWebClientPath = normalizeRelativePathForNode(
    path.join(path.dirname(modulePath), serviceDefinition.outputWebClient)
  );
  let outputWebClientContentBuilder = OutputContentBuilder.get(
    contentMap,
    outputWebClientPath
  );
  let importDescriptorPath = reverseImport(modulePath, outputWebClientPath);
  outputWebClientContentBuilder.push(`
export interface ${serviceName}ClientRequest {`);

  if (PRIMITIVE_TYPES.has(serviceDefinition.body)) {
    if (serviceDefinition.body === PRIMITIVE_TYPE_BLOB) {
      outputWebClientContentBuilder.push(`
  body: Blob;`);
    } else {
      throw new Error(
        `${serviceName} has defined unsupported service request body ${serviceDefinition.body} when generating web client.`
      );
    }
  } else {
    outputWebClientContentBuilder.importFromPath(
      transitImport(importDescriptorPath, serviceDefinition.importBody),
      serviceDefinition.body
    );
    outputWebClientContentBuilder.push(`
  body: ${serviceDefinition.body};`);
  }

  if (serviceDefinition.side) {
    outputWebClientContentBuilder.importFromPath(
      transitImport(importDescriptorPath, serviceDefinition.side.import),
      serviceDefinition.side.type
    );
    outputWebClientContentBuilder.push(`
  side: ${serviceDefinition.side.type};`);
  }
  outputWebClientContentBuilder.push(`
}
`);

  outputWebClientContentBuilder.importFromPath(
    transitImport(importDescriptorPath, serviceDefinition.importResponse),
    serviceDefinition.response
  );
  outputWebClientContentBuilder.importFromPath(
    importDescriptorPath,
    serviceDescriptorName
  );
  outputWebClientContentBuilder.push(`
export function new${serviceName}ServiceRequest(
  request: ${serviceName}ClientRequest
): WebServiceRequest<${serviceName}ClientRequest, ${serviceDefinition.response}> {
  return {
    descriptor: ${serviceDescriptorName},
    request,
  };
}
`);
}

function generateHandler(
  modulePath: string,
  serviceName: string,
  serviceDefinition: ServiceDefinition,
  contentMap: Map<string, OutputContentBuilder>
): void {
  let serviceDescriptorName = toUpperSnaked(serviceName);
  let outputHandlerPath = normalizeRelativePathForNode(
    path.join(path.dirname(modulePath), serviceDefinition.outputHandler)
  );
  let outputHandlerContentBuilder = OutputContentBuilder.get(
    contentMap,
    outputHandlerPath
  );
  let importDescriptorPath = reverseImport(modulePath, outputHandlerPath);
  outputHandlerContentBuilder.push(`
export interface ${serviceName}HandlerRequest {
  requestId: string;`);

  if (PRIMITIVE_TYPES.has(serviceDefinition.body)) {
    if (serviceDefinition.body === PRIMITIVE_TYPE_BLOB) {
      outputHandlerContentBuilder.importFromPath("stream", "Readable");
      outputHandlerContentBuilder.push(`
  body: Readable;`);
    } else {
      throw new Error(
        `${serviceName} has defined unsupported service request body ${serviceDefinition.body} when generating handler.`
      );
    }
  } else {
    outputHandlerContentBuilder.importFromPath(
      transitImport(importDescriptorPath, serviceDefinition.importBody),
      serviceDefinition.body
    );
    outputHandlerContentBuilder.push(`
  body: ${serviceDefinition.body};`);
  }

  if (serviceDefinition.signedUserSession) {
    outputHandlerContentBuilder.importFromPath(
      transitImport(
        importDescriptorPath,
        serviceDefinition.signedUserSession.import
      ),
      serviceDefinition.signedUserSession.type
    );
    outputHandlerContentBuilder.push(`
  userSession: ${serviceDefinition.signedUserSession.type}`);
  }

  if (serviceDefinition.side) {
    outputHandlerContentBuilder.importFromPath(
      transitImport(importDescriptorPath, serviceDefinition.side.import),
      serviceDefinition.side.type
    );
    outputHandlerContentBuilder.push(`
  side: ${serviceDefinition.side.type};`);
  }
  outputHandlerContentBuilder.push(`
}
`);

  outputHandlerContentBuilder.importFromPath(
    transitImport(importDescriptorPath, serviceDefinition.importResponse),
    serviceDefinition.response
  );
  outputHandlerContentBuilder.importFromPath(
    importDescriptorPath,
    serviceDescriptorName
  );
  outputHandlerContentBuilder.push(`
export abstract class ${serviceName}HandlerInterface
  implements ServiceHandler<${serviceName}HandlerRequest, ${serviceDefinition.response}>
{
  public descriptor = ${serviceDescriptorName};
  public abstract handle(
    args: ${serviceName}HandlerRequest
  ): Promise<${serviceDefinition.response}>;
}
`);
}
