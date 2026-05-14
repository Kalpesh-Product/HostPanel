// @ts-nocheck
import jwt from "jsonwebtoken";
import HostUser from "../models/HostUser.js";
import Company from "../models/Company.js";
import WorkspaceMember from "../models/WorkspaceMember.js";

const buildAuthUserPayload = (user: any, company: any, workspaceCount = 0) => ({
  ...user,
  companyName: company?.companyName,
  logo: company?.logo,
  isWebsiteTemplate: company?.isWebsiteTemplate,
  hasCompletedWorkspaceSetup: Boolean(user?.hasCompletedWorkspaceSetup),
  primaryWorkspace: user?.primaryWorkspace || null,
  workspaceCount,
});

const refreshTokenController = async (req, res, next) => {
  try {
    const cookie = req.cookies;
    if (!cookie?.clientCookie) {
      return res.sendStatus(401);
    }
    const refreshToken = cookie?.clientCookie;
    const user = await HostUser.findOne({ refreshToken }).lean().exec();
    const company = await Company.findOne({ companyId: user?.companyId })
      .lean()
      .exec();
    if (!user) {
      return res.sendStatus(401);
    }
    const workspaceCount = await WorkspaceMember.countDocuments({
      user: user._id,
      isActive: true,
    });
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      (err, decoded) => {
        if (err) {
          return res.sendStatus(403);
        }
        const accessToken = jwt.sign(
          { userInfo: { ...decoded.userInfo } },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "15m" }
        );
        delete user.password;
        delete user.refreshToken;
        res.status(200).json({
          user: buildAuthUserPayload(user, company, workspaceCount),
          accessToken,
        });
      }
    );
  } catch (error) {
    next(error);
  }
};

export default refreshTokenController;

