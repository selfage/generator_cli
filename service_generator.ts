import {
  RemoteCallDefinition,
  RemoteCallsGroupDefinition,
  ServiceDefinition,
} from "./definition";
import { DefinitionResolver } from "./definition_resolver";
import {
  OutputContentBuilder,
  TsContentBuilder,
} from "./output_content_builder";
import { toInitialUppercased, toUppercaseSnaked } from "./util";

let PRIMITIVE_TYPE_BYTES = "bytes";
let PRIMITIVE_TYPES = new Set<string>([PRIMITIVE_TYPE_BYTES]);

export function generateService(
  definitionModulePath: string,
  serviceDefinition: ServiceDefinition,
  outputContentMap: Map<string, OutputContentBuilder>,
): void {
  let contentBuilder = TsContentBuilder.get(
    outputContentMap,
    definitionModulePath,
  );
  if (!serviceDefinition.name) {
    throw new Error(`"name" is missing on a service.`);
  }
  if (!serviceDefinition.clientType) {
    throw new Error(
      `"clientType" is missing on service ${serviceDefinition.name}.`,
    );
  }
  let defaultProtocol = "";
  let defaultPort = 0;
  if (serviceDefinition.clientType === "WEB") {
    defaultProtocol = "https";
    defaultPort = 443;
  } else if (serviceDefinition.clientType === "NODE") {
    defaultProtocol = "http";
    defaultPort = 80;
  } else {
    throw new Error(
      `Unknown client type ${serviceDefinition.clientType} on service ${serviceDefinition.name}.`,
    );
  }
  let protocol = serviceDefinition.protocol ?? defaultProtocol;
  let port = serviceDefinition.port ?? defaultPort;
  contentBuilder.importFromServiceClientType("ClientType");
  contentBuilder.importFromServiceDescriptor(
    `${toInitialUppercased(protocol)}ServiceDescriptor`,
  );
  contentBuilder.push(`
export let ${toUppercaseSnaked(serviceDefinition.name)}: ${toInitialUppercased(protocol)}ServiceDescriptor = {
  name: "${serviceDefinition.name}",
  clientType: ClientType.${serviceDefinition.clientType},
  protocol: "${protocol}",
  port: ${port},
}
`);
}

export function generateRemoteCallsGroup(
  definitionModulePath: string,
  remoteCallsGroupDefinition: RemoteCallsGroupDefinition,
  definitionResolver: DefinitionResolver,
  outputContentMap: Map<string, OutputContentBuilder>,
): void {
  let descriptorContentBuilder = TsContentBuilder.get(
    outputContentMap,
    definitionModulePath,
  );
  if (!remoteCallsGroupDefinition.service) {
    throw new Error(
      `"service" is missing on remote calls group ${remoteCallsGroupDefinition.name}.`,
    );
  }
  let definition = definitionResolver.resolve(
    `When looking for service definition for remote calls group ${remoteCallsGroupDefinition.name},`,
    remoteCallsGroupDefinition.service,
    remoteCallsGroupDefinition.importService,
  );
  if (definition.kind !== "Service") {
    throw new Error(
      `Service name ${remoteCallsGroupDefinition.service} on remote calls group ${remoteCallsGroupDefinition.name} is not a service.`,
    );
  }
  let serviceName = toUppercaseSnaked(remoteCallsGroupDefinition.service);
  descriptorContentBuilder.importFromDefinition(
    remoteCallsGroupDefinition.importService,
    serviceName,
  );

  if (!remoteCallsGroupDefinition.outputClient) {
    throw new Error(
      `"outputClient" is missing on remote calls group ${remoteCallsGroupDefinition.name}.`,
    );
  }
  let clientContentBuilder = TsContentBuilder.get(
    outputContentMap,
    definitionModulePath,
    remoteCallsGroupDefinition.outputClient,
  );

  if (!remoteCallsGroupDefinition.outputHandler) {
    throw new Error(
      `"outputHandler" is missing on remote calls group ${remoteCallsGroupDefinition.name}.`,
    );
  }
  let handlerContentBuilder = TsContentBuilder.get(
    outputContentMap,
    definitionModulePath,
    remoteCallsGroupDefinition.outputHandler,
  );

  if (!remoteCallsGroupDefinition.calls) {
    throw new Error(
      `"calls" is either missing or not an array on remote calls group ${remoteCallsGroupDefinition.name}.`,
    );
  }
  for (let remoteCall of remoteCallsGroupDefinition.calls) {
    generateRemoteCall(
      definitionModulePath,
      remoteCall,
      serviceName,
      definitionResolver,
      descriptorContentBuilder,
      clientContentBuilder,
      handlerContentBuilder,
    );
  }
}

export function generateRemoteCall(
  definitionModulePath: string,
  remoteCallDefinition: RemoteCallDefinition,
  serviceName: string,
  definitionResolver: DefinitionResolver,
  descriptorContentBuilder: TsContentBuilder,
  clientContentBuilder: TsContentBuilder,
  handlerContentBuilder: TsContentBuilder,
): void {
  if (!remoteCallDefinition.name) {
    throw new Error(`"name" is missing on a RemoteCall.`);
  }
  let loggingPrefix = `When generating descriptor for remote call ${remoteCallDefinition.name},`;
  let bodyDescriptor = "";
  if (!remoteCallDefinition.body) {
    throw new Error(`${loggingPrefix} "body" is missing.`);
  }
  if (PRIMITIVE_TYPES.has(remoteCallDefinition.body)) {
    descriptorContentBuilder.importFromServiceDescriptor("PrimitveTypeForBody");
    bodyDescriptor = `
  body: {
    primitiveType: PrimitveTypeForBody.${remoteCallDefinition.body.toUpperCase()},
  },`;
  } else {
    let requesBodytDefinition = definitionResolver.resolve(
      loggingPrefix,
      remoteCallDefinition.body,
      remoteCallDefinition.importBody,
    );
    if (requesBodytDefinition.kind !== "Message") {
      throw new Error(
        `${loggingPrefix} request body ${remoteCallDefinition.body} is not a message.`,
      );
    }
    let requestBodyDescriptorName = toUppercaseSnaked(
      remoteCallDefinition.body,
    );
    descriptorContentBuilder.importFromDefinition(
      remoteCallDefinition.importBody,
      requestBodyDescriptorName,
    );
    bodyDescriptor = `
  body: {
    messageType: ${requestBodyDescriptorName},
  },`;
  }

  let metadataDescriptor = "";
  if (remoteCallDefinition.metadata) {
    if (!remoteCallDefinition.metadata.type) {
      throw new Error(
        `${loggingPrefix} "type" is missing in the "metadata" field.`,
      );
    }
    let metadataDefinition = definitionResolver.resolve(
      loggingPrefix,
      remoteCallDefinition.metadata.type,
      remoteCallDefinition.metadata.import,
    );
    if (metadataDefinition.kind !== "Message") {
      throw new Error(
        `${loggingPrefix} metadata type ${remoteCallDefinition.metadata.type} is not a message.`,
      );
    }
    let metadataDescriptorName = toUppercaseSnaked(
      remoteCallDefinition.metadata.type,
    );
    descriptorContentBuilder.importFromDefinition(
      remoteCallDefinition.metadata.import,
      metadataDescriptorName,
    );
    if (!remoteCallDefinition.metadata.key) {
      throw new Error(
        `${loggingPrefix} "key" is missing in the "metadata" field.`,
      );
    }
    metadataDescriptor = `
  metadata: {
    key: "${remoteCallDefinition.metadata.key}",
    type: ${metadataDescriptorName},
  },`;
  }

  let authKey = "";
  if (remoteCallDefinition.authKey) {
    authKey = `
  authKey: "${remoteCallDefinition.authKey}",`;
  }

  if (!remoteCallDefinition.response) {
    throw new Error(`${loggingPrefix} "response" is missing.`);
  }
  let responseDefinition = definitionResolver.resolve(
    loggingPrefix,
    remoteCallDefinition.response,
    remoteCallDefinition.importResponse,
  );
  if (responseDefinition.kind !== "Message") {
    throw new Error(
      `${loggingPrefix} response type ${remoteCallDefinition.response} is not a message.`,
    );
  }
  let responseDescriptorName = toUppercaseSnaked(remoteCallDefinition.response);
  descriptorContentBuilder.importFromDefinition(
    remoteCallDefinition.importResponse,
    responseDescriptorName,
  );
  let responseDescriptor = `
  response: {
    messageType: ${responseDescriptorName},
  },`;

  descriptorContentBuilder.importFromServiceDescriptor("RemoteCallDescriptor");
  let remoteCallDescriptorName = toUppercaseSnaked(remoteCallDefinition.name);
  descriptorContentBuilder.push(`
export let ${remoteCallDescriptorName}: RemoteCallDescriptor = {
  name: "${remoteCallDefinition.name}",
  service: ${serviceName},
  path: "${remoteCallDefinition.path}",${bodyDescriptor}${metadataDescriptor}${authKey}${responseDescriptor}
}
`);

  generateClient(
    definitionModulePath,
    remoteCallDefinition,
    clientContentBuilder,
  );
  generateHandler(
    definitionModulePath,
    remoteCallDefinition,
    handlerContentBuilder,
  );
}

function generateClient(
  definitionModulePath: string,
  remoteCallDefinition: RemoteCallDefinition,
  clientContentBuilder: TsContentBuilder,
): void {
  let loggingPrefix = `When generating client for ${remoteCallDefinition.name},`;
  let bodyParam = "";
  if (PRIMITIVE_TYPES.has(remoteCallDefinition.body)) {
    if (remoteCallDefinition.body === PRIMITIVE_TYPE_BYTES) {
      bodyParam = `
  body: Blob,`;
    } else {
      throw new Error(
        `${loggingPrefix} there is a new primitive type needs to be handled for its request body.`,
      );
    }
  } else {
    clientContentBuilder.importFromDefinition(
      remoteCallDefinition.importBody,
      remoteCallDefinition.body,
    );
    bodyParam = `
  body: ${remoteCallDefinition.body},`;
  }

  let metadataParam = "";
  let metdataVariable = "";
  if (remoteCallDefinition.metadata) {
    clientContentBuilder.importFromDefinition(
      remoteCallDefinition.metadata.import,
      remoteCallDefinition.metadata.type,
    );
    metadataParam = `
  metadata: ${remoteCallDefinition.metadata.type},`;
    metdataVariable = `
      metadata,`;
  }

  clientContentBuilder.importFromDefinition(
    remoteCallDefinition.importResponse,
    remoteCallDefinition.response,
  );
  let remoteCallDescriptorName = toUppercaseSnaked(remoteCallDefinition.name);
  clientContentBuilder.importFromDefinition(
    definitionModulePath,
    remoteCallDescriptorName,
  );
  clientContentBuilder.importFromServiceClientRequestInterface(
    "ClientRequestInterface",
  );
  clientContentBuilder.push(`
export function new${remoteCallDefinition.name}Request(${bodyParam}${metadataParam}
): ClientRequestInterface<${remoteCallDefinition.response}> {
  return {
    descriptor: ${remoteCallDescriptorName},
    body,${metdataVariable}
  };
}
`);
}

function generateHandler(
  definitionModulePath: string,
  remoteCallDefinition: RemoteCallDefinition,
  handlerContentBuilder: TsContentBuilder,
): void {
  let loggingPrefix = `When generating handler for ${remoteCallDefinition.name},`;
  let bodyParam = "";
  if (PRIMITIVE_TYPES.has(remoteCallDefinition.body)) {
    if (remoteCallDefinition.body === PRIMITIVE_TYPE_BYTES) {
      handlerContentBuilder.importFromStream("Readable");
      bodyParam = `
    body: Readable,`;
    } else {
      throw new Error(
        `${loggingPrefix} there is a new primitive type needs to be handled for its request body.`,
      );
    }
  } else {
    handlerContentBuilder.importFromDefinition(
      remoteCallDefinition.importBody,
      remoteCallDefinition.body,
    );
    bodyParam = `
    body: ${remoteCallDefinition.body},`;
  }

  let metadataParam = "";
  if (remoteCallDefinition.metadata) {
    handlerContentBuilder.importFromDefinition(
      remoteCallDefinition.metadata.import,
      remoteCallDefinition.metadata.type,
    );
    metadataParam = `
    metadata: ${remoteCallDefinition.metadata.type},`;
  }

  let authStrParam = "";
  if (remoteCallDefinition.authKey) {
    authStrParam = `
    authStr: string,`;
  }

  let remoteCallDescriptorName = toUppercaseSnaked(remoteCallDefinition.name);
  handlerContentBuilder.importFromDefinition(
    definitionModulePath,
    remoteCallDescriptorName,
  );
  handlerContentBuilder.importFromDefinition(
    remoteCallDefinition.importResponse,
    remoteCallDefinition.response,
  );
  handlerContentBuilder.importFromServiceRemoteCallHandlerInterface(
    "RemoteCallHandlerInterface",
  );
  handlerContentBuilder.push(`
export abstract class ${remoteCallDefinition.name}HandlerInterface implements RemoteCallHandlerInterface {
  public descriptor = ${remoteCallDescriptorName};
  public abstract handle(
    loggingPrefix: string,${bodyParam}${metadataParam}${authStrParam}
  ): Promise<${remoteCallDefinition.response}>;
}
`);
}
