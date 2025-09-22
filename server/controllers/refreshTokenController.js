import jwt from "jsonwebtoken";
import Employee from "../models/User.js";
import Company from "../models/Company.js";

const refreshTokenController = async (req, res, next) => {
  try {
    const cookie = req.cookies;
    if (!cookie?.clientCookie) {
      return res.sendStatus(401);
    }
    const refreshToken = cookie?.clientCookie;
    const user = await Employee.findOne({ refreshToken }).lean().exec();
    const company = await Company.findOne({ _id: user?.company }).lean().exec();
    if (!user) {
      return res.sendStatus(401);
    }
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
        res
          .status(200)
          .json({ user: { ...user, logo: company?.logo }, accessToken });
      }
    );
  } catch (error) {
    next(error);
  }
};

export default refreshTokenController;
