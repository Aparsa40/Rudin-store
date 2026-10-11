import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { UserModel } from "../models/user.model.js";

const vendorsRouter = Router();

vendorsRouter.post("/apply", requireAuth, requireRole("CUSTOMER"), async (req, res, next) => {
  try {
    const { storeName, storeDescription } = req.body ?? {};
    if (typeof storeName !== "string" || storeName.trim().length < 2 || storeName.trim().length > 120 ||
        (storeDescription !== undefined &&
          (typeof storeDescription !== "string" || storeDescription.trim().length > 2000))) {
      res.status(400).json({
        error: { code: "INVALID_VENDOR_APPLICATION", message: "Provide a store name of 2–120 characters and a description of at most 2000 characters." },
      });
      return;
    }

    const user = await UserModel.findOneAndUpdate(
      {
        _id: req.authUser!.id,
        role: "CUSTOMER",
        status: "ACTIVE",
        vendorApplicationStatus: { $nin: ["PENDING", "APPROVED"] },
      },
      {
        $set: {
          storeName: storeName.trim(),
          storeDescription: typeof storeDescription === "string" ? storeDescription.trim() : "",
          vendorApplicationStatus: "PENDING",
        },
      },
      { new: true, runValidators: true },
    ).select("_id email firstName lastName storeName storeDescription vendorApplicationStatus");

    if (!user) {
      res.status(409).json({
        error: { code: "VENDOR_APPLICATION_EXISTS", message: "Your account is not eligible for a new vendor application." },
      });
      return;
    }

    res.status(201).json({
      application: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        storeName: user.storeName,
        storeDescription: user.storeDescription,
        status: user.vendorApplicationStatus,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default vendorsRouter;
