import type { BuildRequest, KazProvider, ProviderResult } from "./provider";

type ApiResponse = { ok?: boolean; message?: string; model?: string; plan?: ProviderResult["plan"] };

export class CloudKazProvider implements KazProvider {
  readonly id = "cloud" as const;

  async analyze(request: BuildRequest): Promise<ProviderResult> {
    const response = await fetch("/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const body = await response.json() as ApiResponse;
    if (!response.ok || !body.plan) throw new Error(body.message ?? "تعذر الحصول على نتيجة من محرك KAZ.");
    return { provider: this.id, model: body.model, plan: body.plan };
  }
}
