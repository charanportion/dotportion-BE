import axios from "axios";
import jwt from "jsonwebtoken";
import crypto from "crypto";
// import { createLog } from "../../layers/common/nodejs/utils/activityLogger.js";
import { createLog } from "../opt/nodejs/utils/activityLogger.js";
import { syncUserAccessWithWaitlist } from "../utils/syncAccess.js";

const BASE_URL = "https://api-dev.dotportion.com";

//GOOGLE
const GOOGLE_CLIENT_ID =
  "1015959772301-m380trckisgj899dl578g2j7qiuuo3v4.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";

//GITHUB
const GITHUB_CLIENT_ID = "Ov23linSein9RzxW31BG";
const GITHUB_CLIENT_SECRET = "b04e78e44caa1546a16d200c3f872d3f67ef92e5";

export class OAuthService {
  constructor(dbHandler, logger, userModel, waitListModel) {
    this.dbHandler = dbHandler;
    this.userModel = userModel;
    this.waitListModel = waitListModel;
    this.logger = logger;
  }

  getGoogleAuthURL() {
    const root = "https://accounts.google.com/o/oauth2/v2/auth";

    const query = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${BASE_URL}/auth/oauth/google/callback`,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
    });

    return `${root}?${query.toString()}`;
  }

  async handleGoogleCallback(code) {
    try {
      await this.dbHandler.connectDb();

      createLog({
        action: "google-oauth-callback",
        type: "info",
        metadata: { reuest: code },
      });

      // 1. Exchange code for access token + id token
      const tokenRes = await axios.post(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: `${BASE_URL}/auth/oauth/google/callback`,
          grant_type: "authorization_code",
        })
      );

      const id_token = tokenRes.data.id_token;

      const payload = JSON.parse(
        Buffer.from(id_token.split(".")[1], "base64").toString()
      );

      const email = payload.email;
      const fullName = payload.name;
      const picture = payload.picture;

      const result = await this._upsertOAuthUser(
        email,
        fullName,
        picture,
        "google"
      );

      createLog({
        userId: result.user?._id,
        action: "google-login",
        type: "info",
        metadata: { email, fullName, picture, isNewUser: result.isNewUser },
      });

      return result;
    } catch (error) {
      createLog({
        action: "google-oauth-error",
        type: "error",
        metadata: { error: error.message, stack: error.stack },
      });
      throw error;
    }
  }

  getGitHubAuthURL() {
    const root = "https://github.com/login/oauth/authorize";
    const query = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      redirect_uri: `${BASE_URL}/auth/oauth/github/callback`,
      scope: "user:email",
    });

    return `${root}?${query.toString()}`;
  }

  async handleGitHubCallback(code) {
    try {
      await this.dbHandler.connectDb();

      createLog({
        action: "github-oauth-callback",
        type: "info",
        metadata: { request: code },
      });

      const tokenRes = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        },
        { headers: { Accept: "application/json" } }
      );

      const accessToken = tokenRes.data.access_token;

      const profileRes = await axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const emailRes = await axios.get("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const email =
        profileRes.data.email || emailRes.data.find((e) => e.primary)?.email;

      const fullName = profileRes.data.name || profileRes.data.login;
      const picture = profileRes.data.avatar_url;

      const result = await this._upsertOAuthUser(
        email,
        fullName,
        picture,
        "github"
      );

      createLog({
        userId: result.user?._id,
        action: "github-login",
        type: "info",
        metadata: {
          resuest: { email, fullName },
          response: { email, fullName, picture, isNewUser: result.isNewUser },
        },
      });

      return result;
    } catch (error) {
      createLog({
        action: "github-oauth-error",
        type: "error",
        metadata: { error: error.message, stack: error.stack },
      });
      throw error;
    }
  }

  async _upsertOAuthUser(email, fullName, picture, provider) {
    await this.dbHandler.connectDb();

    // username goes into user.name, not full_name
    const username =
      fullName.toLowerCase().replace(/\s+/g, "") +
      crypto.randomBytes(3).toString("hex");

    const waitlist = await this.waitListModel.findOne({ email });

    let user = await this.userModel.findOne({ email });

    const isNewUser = !user;

    if (waitlist && waitlist.invited) {
      waitlist.inviteUsed = true;
      await waitlist.save();
    }

    if (!user) {
      user = await this.userModel.create({
        email,
        full_name: fullName,
        name: username,
        picture,
        authProvider: provider,
        isVerified: true,
        isNewUser: true,
        access: {
          status: "none",
          source: "waitlist",
          requestedAt: null,
          approvedAt: null,
          rejectedAt: null,
          approvedBy: null,
        },
      });
      if (waitlist) {
        syncUserAccessWithWaitlist(user, waitlist);
        await user.save();
      }
      createLog({
        userId: user._id,
        action: "oauth-user-created",
        type: "info",
        metadata: { email, provider },
      });
    } else {
      user.isVerified = true;
      user.isNewUser = false;
      if (waitlist) {
        syncUserAccessWithWaitlist(user, waitlist);
      }

      await user.save();

      createLog({
        userId: user._id,
        action: "oauth-user-login",
        type: "info",
        metadata: { email, provider },
      });
    }

    const payload = {
      userId: user._id,
      email: user.email,
      name: user.name,
    };

    const token = jwt.sign(payload, "my_secret_key_for_dotportion", {
      expiresIn: "6h",
    });

    return { user, token, isNewUser };
  }

  async saveUsernameAndRefreshTokenByEmail(email, username) {
    try {
      this.logger.info(
        "--> saveUsernameAndRefreshTokenByEmail service initialised"
      );
      await this.dbHandler.connectDb();

      const user = await this.userModel.findOne({ email });

      if (!user) {
        throw new Error("User not found");
      }

      // Update username
      user.name = username;
      user.isNewUser = false;
      await user.save();

      const payload = {
        userId: user._id,
        email: user.email,
        name: user.name,
      };

      const token = jwt.sign(payload, "my_secret_key_for_dotportion", {
        expiresIn: "6h",
      });

      return { user, token };
    } catch (err) {
      this.logger.error("saveUsernameAndRefreshTokenByEmail error", {
        error: err?.message || err,
        stack: err?.stack || null,
      });
      throw err;
    }
  }
}
