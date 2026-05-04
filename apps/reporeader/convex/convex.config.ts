import { defineApp } from "convex/server";
import workflow from "@convex-dev/workflow/convex.config";
import launchthat_ai from "@launchthatapp/ai/convex/component/convex.config";

const app = defineApp();
app.use(workflow);
app.use(launchthat_ai);

export default app;
