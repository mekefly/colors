/**
 * 调试用 Sample — 查看 zToolsApi.db.put 冲突时的实际返回格式
 *
 * 在浏览器 console 中执行这段代码，观察 DbReturn 的结构。
 */
import zToolsApi from "./ztoolsapi";

const SAMPLE_ID = "_test_conflict_check";

function run() {
  // 1. 先创建一个文档
  const create = zToolsApi.db.put({ _id: SAMPLE_ID, test: true });
  console.log("[第一次创建]", create);
  // {
  //     "id": "_test_conflict_check",
  //     "ok": true,
  //     "rev": "1-0283b2b6f16415544235c24bb6ceef18"
  // }

  if (create?.ok) {
    // 2. 用同一个 _id 但不带 _rev，触发 conflict
    const conflict = zToolsApi.db.put({ _id: SAMPLE_ID, test: true });
    console.log("[冲突写入（无 _rev）]", conflict);
    // {
    //     "id": "_test_conflict_check",
    //     "error": true,
    //     "name": "conflict",
    //     "message": "Document update conflict"
    // }

    // 3. 用旧的 _rev 再试一次
    const stale = zToolsApi.db.put({
      _id: SAMPLE_ID,
      _rev: "999-deadbeef",
      test: true,
    });
    console.log("[冲突写入（旧 _rev）]", stale);
    // {
    //     "id": "_test_conflict_check",
    //     "error": true,
    //     "name": "conflict",
    //     "message": "Document update conflict"
    // }

    const doc = zToolsApi.db.get(SAMPLE_ID);
    // 4. 清理测试文档
    let v = doc && zToolsApi.db.remove(doc);
    console.log("[remove doc]", v);
    // {
    //     "id": "_test_conflict_check",
    //     "ok": true
    // }
  }
}

/**
 * 输出示例（预期）：
 *   [第一次创建]         { ok: true, id: "_test_conflict_check", rev: "1-xxx" }
 *   [冲突写入（无 _rev）] { ok: false, error: { message: "conflict", ... }, status: 409 }
 *   [冲突写入（旧 _rev）] { ok: false, error: "conflict", reason: "Document update conflict." }
 *
 * 实际格式以你跑出来的为准。请把 console 输出贴给我。🤝
 */
export default run;
