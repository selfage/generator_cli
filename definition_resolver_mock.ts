import { DefinitionResolver } from "./definition_resolver";

export class MockDefinitionResolver extends DefinitionResolver {
  public called = 0;
  public constructor() {
    super("");
  }
}
