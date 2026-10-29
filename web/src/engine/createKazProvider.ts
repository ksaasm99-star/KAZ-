import { CloudKazProvider } from "./cloudProvider";
import { LocalKazProvider } from "./localProvider";
import type { KazProvider, KazProviderId } from "./provider";

export function createKazProvider(id: KazProviderId): KazProvider {
  return id === "local" ? new LocalKazProvider() : new CloudKazProvider();
}
