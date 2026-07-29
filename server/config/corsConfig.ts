// @ts-nocheck
export const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5000",
  "http://localhost:3000",
  "http://localhost:3006",
  "http://localhost:3007",
  "http://localhost:5006",
  "http://localhost:5007",
  "https://hostpanel.wono.co",
  "https://masterpanel.wono.co",
  "https://wono.co",
];

const regexAllowedOrigins = [/\.wono\.co$/, /^https:\/\/wono\.co$/];

export const corsConfig = {
  origin: function (origin, callback) {
    if (
      !origin ||
      allowedOrigins.indexOf(origin) !== -1 ||
      regexAllowedOrigins.some((regex) => regex.test(origin))
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true,
};

