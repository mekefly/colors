// ════════════════════════════════════════════════════════════════
//  通用取色器机制
//
//  调用方（如 gradient.vue）:
//     const { pickColor } = useColorPicker('gradient')
//     const color = await pickColor('#FF6B6B')  // 异步等待用户选择
//
//  取色器页面（index.vue）:
//     import { resolvePicker } from './use-color-picker'
//     resolvePicker('#FF0000')   // 确认选择
//     resolvePicker(null)        // 取消
//
//  要求: 调用方父组件使用 <KeepAlive> 保持页面状态
// ════════════════════════════════════════════════════════════════

import type { Colord } from "colord";
import { useRouter } from "vue-router";

// ── 模块级取色请求状态 ──
// 用于 picker 页面 → 调用方之间的异步通信
interface PickerState {
  sourceId: string;
  resolve: (color: Colord | null) => void;
  reject: (reason: unknown) => void;
}

let _pending: PickerState | null = null;

/**
 * 取色器确认选择 — 由取色器页面内部调用
 * @param color 选中的 hex（含 #），传 null 表示取消
 */
export function resolvePicker(color: Colord | null) {
  _pending?.resolve(color);
  _pending = null;
}

/**
 * useColorPicker — 通用取色器调用 hook
 *
 * 调用 `pickColor()` 后跳转到取色器页面 `/`，
 * 用户在取色器中选择并返回后，Promise resolve 选中的颜色（含 #）。
 * 若用户取消或页面被销毁，Promise resolve null。
 *
 * @param sourceId 来源标识（如 'gradient'），用于匹配取色请求
 */
export function useColorPicker(sourceId: string) {
  const router = useRouter();

  /**
   * 进入取色器页面，异步等待用户选择颜色
   * @param currentColor 当前颜色 hex（可选，预填到取色器）
   * @returns `#RRGGBB` 或 null（取消）
   */
  function pickColor(currentColor?: Colord): Promise<Colord | null> {
    return new Promise<Colord | null>((resolve, reject) => {
      _pending = { sourceId, resolve, reject };

      router.push({
        path: "/",
        query: {
          picker: sourceId,
          returnTo: router.currentRoute.value.fullPath,
          ...(currentColor ? { c: currentColor.toHex().replace("#", "") } : {}),
        },
      });
    });
  }

  return { pickColor };
}
