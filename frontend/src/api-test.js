import { apiFetch, login } from "./api";
async function testApi() {
    try {
        await login("admin@flowops.ai", "FlowOps!2026");
        const dashboard = await apiFetch("/api/v1/dashboard");
        console.log("Backend connection successful!");
        console.log("Dashboard data:", dashboard);
    }
    catch (error) {
        console.error("API test failed:", error);
    }
}
testApi();
