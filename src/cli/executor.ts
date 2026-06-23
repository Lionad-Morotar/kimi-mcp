import { execFile } from "child_process";
import { promisify } from "util";

// 包装在对象中，使 vitest spy/mock 可以正确拦截内部调用。
// detector 与 adapter 共用此单例，测试通过 spyOn executor.execFileAsync 拦截子进程调用，
// 无需真实登录 kimi。
export const executor = {
  execFileAsync: promisify(execFile),
};
