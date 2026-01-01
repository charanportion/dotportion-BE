// import Project from "../layers/common/nodejs/models/ProjectModel.js";
// import Workflow from "../layers/common/nodejs/models/WorkflowModel.js";
import Project from "/opt/nodejs/models/ProjectModel.js";
import Workflow from "/opt/nodejs/models/WorkflowModel.js";
// import Log from "../layers/common/nodejs/models/LogModel.js";
// import Log from "/opt/nodejs/models/LogModel.js";
import mongoose from "mongoose";

export class StatsUpdater {
  constructor() {
    // Get API base URL from environment variable
    this.API_BASE_URL =
      process.env.BASE_URL || "https://api-dev.dotportion.com";
  }

  async update({
    projectId,
    workflowId,
    status,
    durationMs,
    request,
    response,
  }) {
    // 1. Create a log entry (this is atomic)
    // await Log.create({
    //   project: projectId,
    //   workflow: workflowId,
    //   status,
    //   request,
    //   response,
    //   durationMs,
    // });

    // Map status for stats: "error" -> "fail", keep others as is
    const statsStatus = status === "error" ? "fail" : status;

    // 2. Update workflow stats using atomic operators
    await this.#updateWorkflowStats(workflowId, statsStatus, durationMs);

    // 3. Update project stats
    await this.#updateProjectStats(projectId, workflowId, statsStatus);
  }

  async #updateWorkflowStats(workflowId, status, durationMs) {
    const workflow = await Workflow.findById(workflowId)
      .select("stats.totalCalls stats.avgResponseTime")
      .lean();
    if (!workflow) return;

    // Calculate moving average
    const prevTotal = workflow.stats.totalCalls || 0;
    const prevAvg = workflow.stats.avgResponseTime || 0;
    const newAvg = prevAvg + (durationMs - prevAvg) / (prevTotal + 1);

    await Workflow.updateOne(
      { _id: workflowId },
      {
        $inc: {
          "stats.totalCalls": 1,
          [`stats.${status === "success" ? "successCalls" : "failedCalls"}`]: 1,
        },
        $set: { "stats.avgResponseTime": newAvg },
      }
    );
  }

  async #updateProjectStats(projectId, workflowId, status) {
    // 💡 OPTIMIZATION NOTE: This block has a potential race condition.
    // Reading the document, modifying an array in JS, and writing it back
    // is not an atomic operation. For high concurrency, consider a more
    // robust solution like using an aggregation pipeline for the update
    // or offloading this to a background worker.
    const project = await Project.findById(projectId)
      .select("stats.topWorkflows")
      .lean();
    if (!project) return;

    let topWorkflows = project.stats.topWorkflows || [];
    const workflowIndex = topWorkflows.findIndex(
      (wf) => wf.workflowId.toString() === workflowId.toString()
    );

    if (workflowIndex > -1) {
      topWorkflows[workflowIndex].calls += 1;
    } else {
      topWorkflows.push({
        workflowId: new mongoose.Types.ObjectId(workflowId),
        calls: 1,
      });
    }

    // Sort and keep the top 5
    topWorkflows.sort((a, b) => b.calls - a.calls);
    if (topWorkflows.length > 5) {
      topWorkflows = topWorkflows.slice(0, 5);
    }

    await Project.updateOne(
      { _id: projectId },
      {
        $inc: {
          "stats.totalApiCalls": 1,
          [`stats.${status === "success" ? "successCalls" : "failedCalls"}`]: 1,
        },
        $set: { "stats.topWorkflows": topWorkflows },
      }
    );
  }

  async createLog({ workflowId, projectId, triggerData, userPlan }) {
    try {
      console.log(
        `Creating log for workflow: ${workflowId}, project: ${projectId}`
      );
      const createResponse = await fetch(`${this.API_BASE_URL}/logs/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: projectId,
          workflow: workflowId,
          trigger: triggerData,
          plan: userPlan, // Pass the user's plan for retention calculation
        }),
      });

      if (!createResponse.ok) {
        console.error(
          `Failed to create log: ${createResponse.status} ${createResponse.statusText}`
        );
        return null;
      }

      const log = await createResponse.json();
      const logId = log?.data?._id;
      console.log(`Log created successfully with ID: ${logId}`);
      return logId;
    } catch (error) {
      console.error("Error creating log:", error);
      return null;
    }
  }

  async finalizeLog({ logId, status, durationMs, response }) {
    try {
      console.log(`Finalizing log: ${logId} with status: ${status}`);
      const finalizeResponse = await fetch(
        `${this.API_BASE_URL}/logs/${logId}/finalize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            durationMs,
            response,
          }),
        }
      );

      if (!finalizeResponse.ok) {
        console.error(
          `Failed to finalize log: ${finalizeResponse.status} ${finalizeResponse.statusText}`
        );
        return false;
      }

      console.log(`Log finalized successfully: ${logId}`);
      return true;
    } catch (error) {
      console.error("Error finalizing log:", error);
      return false;
    }
  }

  async addStep({ logId, stepData }) {
    try {
      console.log(`Adding step to log: ${logId}`);
      const stepResponse = await fetch(
        `${this.API_BASE_URL}/logs/${logId}/steps`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stepData,
          }),
        }
      );

      if (!stepResponse.ok) {
        console.error(
          `Failed to add step: ${stepResponse.status} ${stepResponse.statusText}`
        );
        return false;
      }

      console.log(`Step added successfully to log: ${logId}`);
      return true;
    } catch (error) {
      console.error("Error adding step:", error);
      return false;
    }
  }
}
