export interface PushProvider {
  send(token: string, title: string, body: string): Promise<void>;
}
