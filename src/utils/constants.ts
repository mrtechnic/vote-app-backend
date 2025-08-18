import { IUser } from "./interfaces";

export const authCookieName = 'authToken'

declare global {
  namespace Express {
    interface Request {
      user: IUser;
    }
  }
}


export const frontendUrl = process.env.FRONTEND_URL