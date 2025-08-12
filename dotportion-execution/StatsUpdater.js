// import Project from "../layers/common/nodejs/models/ProjectModel.js";
// import Workflow from "../layers/common/nodejs/models/WorkflowModel.js";
// import Log from "../layers/common/nodejs/models/LogModel.js";
import Project from "/opt/nodejs/models/ProjectModel.js";
import Workflow from "/opt/nodejs/models/WorkflowModel.js";
import Log from "/opt/nodejs/models/LogModel.js";
import mongoose from "mongoose";

export class StatsUpdater {
  /**
   * Updates stats and logs for a workflow execution.
   * @param {object} params - The details of the execution.
   */
  async update({
    projectId,
    workflowId,
    status,
    durationMs,
    request,
    response,
  }) {
    // 1. Create a log entry (this is atomic)
    await Log.create({
      project: projectId,
      workflow: workflowId,
      status,
      request,
      response,
      durationMs,
    });

    // 2. Update workflow stats using atomic operators
    await this.#updateWorkflowStats(workflowId, status, durationMs);

    // 3. Update project stats
    await this.#updateProjectStats(projectId, workflowId, status);
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
}
