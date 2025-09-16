import jwt from "jsonwebtoken"

const verifyJwt = (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.sendStatus(401);
  }

  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = decoded.userInfo._id;
    next();
  });
};

export default verifyJwt;