import {
  NodeRemoteCallDefinition,
  NodeServiceDefinition,
  WebRemoteCallDefinition,
  WebServiceDefinition,
} from "./definition";
import { MessageResolver } from "./message_resolver";
import {
  OutputContentBuilder,
  TsContentBuilder,
} from "./output_content_builder";
import { toInitalLowercased, toUppercaseSnaked } from "./util";

let PRIMITIVE_TYPE_BYTES = "bytes";
let PRIMITIVE_TYPES = new Set<string>([PRIMITIVE_TYPE_BYTES]);

export function generateService(
  definitionModulePath: string,
  serviceDefinition: NodeServiceDefinition | WebServiceDefinition,
  kind: "node" | "web",
  messageResolver: MessageResolver,
  outputContentMap: Map<string, OutputContentBuilder>,
): void {
  let descriptorContentBuilder = TsContentBuilder.get(
    outputContentMap,
    definitionModulePath,
  );
  let clientContentBuilder = TsContentBuilder.get(
    outputContentMap,
    definitionModulePath,
    serviceDefinition.outputClient,
  );
  let handlerContentBuilder = TsContentBuilder.get(
    outputContentMap,
    definitionModulePath,
    serviceDefinition.outputHandler,
  );
  for (let remoteCall of serviceDefinition.remoteCalls) {
    generateRemoteCall(
      definitionModulePath,
      remoteCall,
      kind,
      messageResolver,
      descriptorContentBuilder,
      clientContentBuilder,
      handlerContentBuilder,
    );
  }
}

export function generateRemoteCall(
  definitionModulePath: string,
  remoteCallDefinition: NodeRemoteCallDefinition | WebRemoteCallDefinition,
  kind: "node" | "web",
  messageResolver: MessageResolver,
  descriptorContentBuilder: TsContentBuilder,
  clientContentBuilder: TsContentBuilder,
  handlerContentBuilder: TsContentBuilder,
): void {
  let loggingPrefix = `When generating descriptor for ${kind} remote call ${remoteCallDefinition.name},`;
  let bodyDescriptor = "";
  if (PRIMITIVE_TYPES.has(remoteCallDefinition.body)) {
    descriptorContentBuilder.importFromServiceDescriptor("PrimitveTypeForBody");
    bodyDescriptor = `
  body: {
    primitiveType: PrimitveTypeForBody.${remoteCallDefinition.body.toUpperCase()},
  },`;
  } else {
    let requesBodytDefinition = messageResolver.resolve(
      loggingPrefix,
      remoteCallDefinition.body,
      remoteCallDefinition.importBody,
    );
    if (!requesBodytDefinition.message) {
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
    let metadataDefinition = messageResolver.resolve(
      loggingPrefix,
      remoteCallDefinition.metadata.type,
      remoteCallDefinition.metadata.import,
    );
    if (!metadataDefinition.message) {
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
    metadataDescriptor = `
  metadata: {
    key: "${remoteCallDefinition.metadata.key}",
    type: ${metadataDescriptorName},
  },`;
  }

  let sessionKey = "";
  if (kind === "web") {
    let webDefinition = remoteCallDefinition as WebRemoteCallDefinition;
    if (webDefinition.sessionKey) {
      sessionKey = `
  sessionKey: "${webDefinition.sessionKey}",`;
    }
  }

  let responseDefinition = messageResolver.resolve(
    loggingPrefix,
    remoteCallDefinition.response,
    remoteCallDefinition.importResponse,
  );
  if (!responseDefinition.message) {
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

  let remoteCallDescriptor =
    kind === "node" ? "NodeRemoteCallDescriptor" : "WebRemoteCallDescriptor";
  descriptorContentBuilder.importFromServiceDescriptor(remoteCallDescriptor);
  let remoteCallDescriptorName = toUppercaseSnaked(remoteCallDefinition.name);
  descriptorContentBuilder.push(`
export let ${remoteCallDescriptorName}: ${remoteCallDescriptor} = {
  name: "${remoteCallDefinition.name}",
  path: "${remoteCallDefinition.path}",${bodyDescriptor}${metadataDescriptor}${sessionKey}${responseDescriptor}
}
`);

  generateClient(
    definitionModulePath,
    remoteCallDefinition,
    kind,
    clientContentBuilder,
  );
  generateHandler(
    definitionModulePath,
    remoteCallDefinition,
    kind,
    handlerContentBuilder,
  );
}

function generateClient(
  definitionModulePath: string,
  remoteCallDefinition: NodeRemoteCallDefinition,
  kind: "node" | "web",
  clientContentBuilder: TsContentBuilder,
): void {
  let loggingPrefix = `When generating ${kind} client for ${remoteCallDefinition.name},`;
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
  let clientInterface =
    kind === "node"
      ? "NodeClientInterface"
      : "WebClientInterface";
  let clientOptions =
    kind === "node" ? "NodeClientOptions" : "WebClientOptions";
  clientContentBuilder.importFromServiceClientInterface(
    clientInterface,
    clientOptions,
  );
  clientContentBuilder.push(`
export function ${toInitalLowercased(remoteCallDefinition.name)}(
  client: ${clientInterface},${bodyParam}${metadataParam}
  options?: ${clientOptions},
): Promise<${remoteCallDefinition.response}> {
  return client.send(
    {
      descriptor: ${remoteCallDescriptorName},
      body,${metdataVariable}
    },
    options,
  );
}
`);
}

function generateHandler(
  definitionModulePath: string,
  remoteCallDefinition: NodeRemoteCallDefinition,
  kind: "node" | "web",
  handlerContentBuilder: TsContentBuilder,
): void {
  let loggingPrefix = `When generating ${kind} handler for ${remoteCallDefinition.name},`;
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

  let sessionStrParam = "";
  if (kind === "web") {
    let webDefinition = remoteCallDefinition as WebRemoteCallDefinition;
    if (webDefinition.sessionKey) {
      sessionStrParam = `
    sessionStr: string,`;
    }
  }

  let handlerInterface =
    kind === "node" ? "NodeHandlerInterface" : "WebHandlerInterface";
  let remoteCallDescriptorName = toUppercaseSnaked(remoteCallDefinition.name);
  handlerContentBuilder.importFromDefinition(
    definitionModulePath,
    remoteCallDescriptorName,
  );
  handlerContentBuilder.importFromDefinition(
    remoteCallDefinition.importResponse,
    remoteCallDefinition.response,
  );
  handlerContentBuilder.importFromServiceHandlerInterface(handlerInterface);
  handlerContentBuilder.push(`
export abstract class ${remoteCallDefinition.name}HandlerInterface implements ${handlerInterface} {
  public descriptor = ${remoteCallDescriptorName};
  public abstract handle(
    loggingPrefix: string,${bodyParam}${metadataParam}${sessionStrParam}
  ): Promise<${remoteCallDefinition.response}>;
}
`);
}
