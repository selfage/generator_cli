import { MessageResolver } from "./message_resolver";

export class MockMessageResolver extends MessageResolver {
  public called = 0;
  public constructor() {
    super("");
  }
}
