import type { ApiResponse } from "./_shared";

export class TestResponse implements ApiResponse {
  code = 200;
  body: unknown;
  headers = new Map<string, string>();

  status(code: number) {
    this.code = code;
    return this;
  }

  json(body: unknown) {
    this.body = body;
    return this;
  }

  setHeader(name: string, value: string) {
    this.headers.set(name, value);
  }

  end() {
    return this;
  }
}
