import type { BuildRequest, EngineId, KazProvider, ProviderResult } from "./provider";

type LocalNavigator = Navigator & {
  gpu?: { requestAdapter(): Promise<unknown | null> };
  deviceMemory?: number;
};

type LocalPerformance = Performance & {
  memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
};

export type LocalRuntimeStatus = {
  ready: boolean;
  label: string;
  detail: string;
  deviceMemoryGb?: number;
  fallbackEngine?: EngineId;
};

export type LocalPerformanceStatus = {
  memoryUsedMb?: number;
  memoryLimitMb?: number;
  heapPercent?: number;
  eventLoopLagMs: number;
  cores?: number;
};

function memoryDetail(deviceMemoryGb: number | undefined) {
  return deviceMemoryGb === undefined
    ? "ذاكرة الجهاز: غير معلنة من المتصفح."
    : `ذاكرة الجهاز: ${deviceMemoryGb.toLocaleString("ar-EG")} جيجابايت تقريبًا (تقدير المتصفح).`;
}

export async function inspectLocalRuntime(): Promise<LocalRuntimeStatus> {
  if (typeof navigator === "undefined") {
    return { ready: false, label: "غير متاح", detail: "الفحص يحتاج متصفحًا فعليًا." };
  }

  const localNavigator = navigator as LocalNavigator;
  const deviceMemoryGb = localNavigator.deviceMemory;
  if (!localNavigator.gpu) {
    return { ready: false, label: "غير مدعوم", detail: `WebGPU غير متاح في هذا المتصفح. سيتم التحويل تلقائيًا إلى محرك الويب. ${memoryDetail(deviceMemoryGb)}`, deviceMemoryGb, fallbackEngine: "html_js" };
  }

  const adapter = await localNavigator.gpu.requestAdapter();
  if (!adapter) {
    return { ready: false, label: "غير متاح", detail: `المتصفح يدعم WebGPU لكن الجهاز لم يوفّر محولًا مناسبًا. سيتم التحويل تلقائيًا إلى محرك الويب. ${memoryDetail(deviceMemoryGb)}`, deviceMemoryGb, fallbackEngine: "html_js" };
  }

  return { ready: true, label: "جاهز مبدئيًا", detail: `WebGPU متاح؛ لم يتم تنزيل أو تشغيل نموذج. ${memoryDetail(deviceMemoryGb)}`, deviceMemoryGb };
}

export function monitorLocalPerformance(onUpdate: (status: LocalPerformanceStatus) => void) {
  let previousTick = performance.now();
  const timer = window.setInterval(() => {
    const now = performance.now();
    const eventLoopLagMs = Math.max(0, Math.round(now - previousTick - 1000));
    previousTick = now;
    const runtimePerformance = performance as LocalPerformance;
    const heap = runtimePerformance.memory;
    const heapPercent = heap ? Math.round((heap.usedJSHeapSize / heap.jsHeapSizeLimit) * 100) : undefined;
    onUpdate({
      memoryUsedMb: heap ? Math.round(heap.usedJSHeapSize / 1024 / 1024) : undefined,
      memoryLimitMb: heap ? Math.round(heap.jsHeapSizeLimit / 1024 / 1024) : undefined,
      heapPercent,
      eventLoopLagMs,
      cores: navigator.hardwareConcurrency,
    });
  }, 1000);
  return () => window.clearInterval(timer);
}

export class LocalKazProvider implements KazProvider {
  readonly id = "local" as const;

  async analyze(_request: BuildRequest): Promise<ProviderResult> {
    throw new Error("المحرك المحلي غير مهيأ بعد: لم يتم تنزيل أو تحميل نموذج محلي.");
  }
}
