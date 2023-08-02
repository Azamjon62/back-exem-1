import jwt from "jsonwebtoken";

const sign = (payload) =>
  jwt.sign(payload, process.env.SECRET_KEY, {
    expiresIn: 700,
  });

const verify = (token) => jwt.verify(token, process.env.SECRET_KEY);

export { sign, verify };
