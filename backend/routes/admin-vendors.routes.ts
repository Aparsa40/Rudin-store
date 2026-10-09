import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { UserModel } from "../models/user.model.js";

const adminVendorsRouter = Router();
adminVendorsRouter.use(requireAuth, requireRole("ADMIN"));

adminVendorsRouter.get("/applications", async (req, res, next) => {
  try {
    const requestedStatus = typeof req.query.status === "string" ? req.query.status.toUpperCase() : "PENDING";
    if (!["PENDING", "APPROVED", "REJECTED", "ALL"].includes(requestedStatus)) {
      res.status(400).json({ error: { code: "INVALID_STATUS", message: "status must be PENDING, APPROVED, REJECTED, or ALL." } });
      return;
    }
    const filter = requestedStatus === "ALL" ? {} : { vendorApplicationStatus: requestedStatus };
    const applications = await UserModel.find(filter)
      .select("_id email firstName lastName storeName storeDescription vendorApplicationStatus role status createdAt")
      .sort({ createdAt: -1 }).lean();
    res.status(200).json({
      applications: applications.filter((user) => user.vendorApplicationStatus !== "NONE").map((user) => ({
        id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName,
        storeName: user.storeName ?? "", storeDescription: user.storeDescription ?? "",
        status: user.vendorApplicationStatus, role: user.role, accountStatus: user.status, createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

adminVendorsRouter.patch("/applications/:id", async (req, res, next) => {
  try {
    const decision = req.body?.decision;
    if (decision !== "APPROVED" && decision !== "REJECTED") {
      res.status(400).json({ error: { code: "INVALID_DECISION", message: "decision must be APPROVED or REJECTED." } });
      return;
    }

    const update = decision === "APPROVED"
      ? { $set: { role: "VENDOR", vendorApplicationStatus: "APPROVED" } }
      : { $set: { role: "CUSTOMER", vendorApplicationStatus: "REJECTED" } };
    const application = await UserModel.findOneAndUpdate(
      { _id: req.params.id, role: "CUSTOMER", status: "ACTIVE", vendorApplicationStatus: "PENDING" },
      update,
      { new: true, runValidators: true },
    ).select("_id email firstName lastName storeName vendorApplicationStatus role");

    if (!application) {
      res.status(404).json({ error: { code: "APPLICATION_NOT_FOUND", message: "A pending application for an active customer was not found." } });
      return;
    }

    res.status(200).json({
      application: {
        id: application._id, email: application.email, firstName: application.firstName,
        lastName: application.lastName, storeName: application.storeName,
        status: application.vendorApplicationStatus, role: application.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default adminVendorsRouter;
