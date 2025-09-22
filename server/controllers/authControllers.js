import jwt from "jsonwebtoken";
import Employee from "../models/User.js";
import bcrypt from "bcryptjs";
import Company from "../models/Company.js";

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Invalid data" });

    const emailRegex = /^[a-zA-Z0-9_.±]+@[a-zA-Z0-9-]+.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "invalid data" });

    const user = await Employee.findOne({ email }).lean().exec();
    const company = await Company.findOne({ companyId: user?.companyId }).lean().exec();
    if (!user) return res.status(404).json({ message: "No user found" });

    const isPasswordValid = bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.status(400).json({ message: "invalid password" });

    delete user.password;
    delete user.refreshToken;

    const accessToken = jwt.sign(
      { userInfo: { ...user } },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { userInfo: { ...user } },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "15d" }
    );

    await Employee.findOneAndUpdate({ email }, { refreshToken }).lean().exec();

    res.cookie("clientCookie", refreshToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: 15 * 24 * 60 * 60 * 1000,
    });

    res
      .status(200)
      .json({
        user: {
          ...user,
          companyName: company?.companyName,
          logo: company?.logo,
        },
        accessToken,
      });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.clientCookie) {
      return res.sendStatus(201);
    }

    const refreshToken = cookies?.clientCookie;
    const user = await Employee.findOne({ refreshToken }).lean().exec();
    if (!user) {
      res.clearCookie("clientCookie", {
        httpOnly: true,
        sameSite: "None",
        secure: true,
      });
      return res.sendStatus(201);
    }

    await Employee.findOneAndUpdate({ refreshToken }, { refreshToken: "" })
      .lean()
      .exec();
    res.clearCookie("clientCookie", {
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });
    res.sendStatus(201);
  } catch (error) {
    next(error);
  }
};
