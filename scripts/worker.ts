import { startScheduler } from "@/server/scheduler";

// 独立的探测进程：多实例部署时，Web 进程设置 SCHEDULER=off，由这里单独跑调度
startScheduler();
