export const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  "http://localhost:3000",
  "http://localhost:3006",
  "http://localhost:3007",
  "http://localhost:5006",
  "http://localhost:5007",
  "https://wonohostfe.vercel.app",
];

export const corsConfig = {
  origin: function (origin, callback) {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true,
};
