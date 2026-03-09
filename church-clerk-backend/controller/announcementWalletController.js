import https from "https";
import crypto from "crypto";
import AnnouncementWallet from "../models/announcementWalletModel.js";
import AnnouncementWalletTransaction from "../models/announcementWalletTransactionModel.js";

const ghsToCredits = (ghs) => {
  const n = Number(ghs || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
};

const paystackRequest = ({ path, method, body }) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : "";

    const secretKey = process.env.PAYSTACK_SECRET_KEY || process.env.TEST_SECRET_KEY;

    if (!secretKey) {
      return reject(new Error("Paystack secret key is not configured"));
    }

    const req = https.request(
      {
        hostname: "api.paystack.co",
        path,
        method,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const statusCode = res.statusCode || 0;

          let json = null;
          try {
            json = data ? JSON.parse(data) : {};
          } catch {
            json = null;
          }

          if (statusCode < 200 || statusCode >= 300) {
            const msg = json?.message || (data ? String(data).slice(0, 500) : "Paystack request failed");
            return reject(new Error(`${msg} (${statusCode})`));
          }

          if (!json) {
            return reject(new Error("Paystack returned a non-JSON response"));
          }

          if (json?.status === false) {
            return reject(new Error(json?.message || "Paystack returned an error"));
          }

          resolve(json);
        });

        res.on("error", reject);
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });

const getOrCreateWallet = async ({ churchId }) => {
  const wallet = await AnnouncementWallet.findOneAndUpdate(
    { church: churchId },
    { $setOnInsert: { balanceCredits: 0 } },
    { new: true, upsert: true }
  );
  return wallet;
};

export const getWallet = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const wallet = await getOrCreateWallet({ churchId: req.activeChurch._id });

    return res.status(200).json({ wallet });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const paystackWalletWebhook = async (req, res) => {
  try {
    if (!req.rawBody) {
      return res.status(400).send("Missing raw body");
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY || process.env.TEST_SECRET_KEY || "";
    if (!secretKey) {
      return res.status(500).send("Paystack secret key is not configured");
    }

    const signature = req.headers["x-paystack-signature"] || "";
    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(req.rawBody)
      .digest("hex");

    if (!signature || hash !== signature) {
      return res.status(401).send("Invalid signature");
    }

    let event = null;
    try {
      event = JSON.parse(req.rawBody.toString());
    } catch {
      event = null;
    }

    const eventType = String(event?.event || "");
    const reference = String(event?.data?.reference || "");
    if (!reference) return res.sendStatus(200);

    const tx = await AnnouncementWalletTransaction.findOne({
      provider: "paystack",
      providerReference: reference,
      type: "fund"
    }).sort({ createdAt: -1 });

    if (!tx) return res.sendStatus(200);

    if (eventType === "charge.success") {
      if (tx.status === "success") return res.sendStatus(200);

      const wallet = await getOrCreateWallet({ churchId: tx.church });
      wallet.balanceCredits = Number(wallet.balanceCredits || 0) + Math.max(0, Number(tx.amountCredits || 0));
      await wallet.save();

      tx.status = "success";
      tx.balanceAfterCredits = wallet.balanceCredits;
      await tx.save();

      return res.sendStatus(200);
    }

    if (eventType === "charge.failed") {
      if (tx.status !== "failed") {
        tx.status = "failed";
        await tx.save();
      }
      return res.sendStatus(200);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("Announcement Wallet Webhook Error:", error);
    return res.sendStatus(500);
  }
};

export const getWalletTransactions = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const wallet = await getOrCreateWallet({ churchId: req.activeChurch._id });

    const { limit = 100 } = req.query;
    const limitNum = Math.max(1, Math.min(500, parseInt(limit, 10) || 100));

    const transactions = await AnnouncementWalletTransaction.find({
      church: req.activeChurch._id,
      wallet: wallet._id,
      status: "success"
    })
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    return res.status(200).json({ transactions });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const initiateWalletFunding = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const amount = Number(req.body?.amount || 0);
    if (!Number.isFinite(amount) || amount < 10) {
      return res.status(400).json({ message: "Minimum deposit is 10 GHS" });
    }

    const email = String(req.user?.email || "").trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).json({ message: "Your account email is missing or invalid. Please update your profile email and try again." });
    }

    const wallet = await getOrCreateWallet({ churchId: req.activeChurch._id });

    const amountCredits = ghsToCredits(amount);

    const tx = await AnnouncementWalletTransaction.create({
      church: req.activeChurch._id,
      wallet: wallet._id,
      type: "fund",
      status: "pending",
      amountCredits,
      description: "Wallet funding",
      provider: "paystack",
      createdBy: req.user?._id || null
    });

    const reference = `CCK_AW_${tx._id.toString()}`;

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const init = await paystackRequest({
      method: "POST",
      path: "/transaction/initialize",
      body: {
        email,
        amount: Math.round(amount * 100),
        currency: "GHS",
        reference,
        callback_url: `${frontendUrl}/dashboard?page=announcements`,
        metadata: {
          announcementWalletTransactionId: tx._id.toString(),
          churchId: req.activeChurch._id.toString(),
          type: "announcement_wallet_fund"
        }
      }
    });

    tx.providerReference = reference;
    await tx.save();

    return res.status(200).json({
      authorizationUrl: init?.data?.authorization_url,
      accessCode: init?.data?.access_code,
      reference
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const verifyWalletFunding = async (req, res) => {
  try {
    if (!req.activeChurch?._id) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const reference = String(req.body?.reference || "").trim();
    if (!reference) {
      return res.status(400).json({ message: "Payment reference is required" });
    }

    const verification = await paystackRequest({
      method: "GET",
      path: `/transaction/verify/${encodeURIComponent(reference)}`
    });

    const status = String(verification?.data?.status || "").toLowerCase();

    const tx = await AnnouncementWalletTransaction.findOne({
      church: req.activeChurch._id,
      provider: "paystack",
      providerReference: reference,
      type: "fund"
    }).sort({ createdAt: -1 });

    if (!tx) {
      return res.status(404).json({ message: "Wallet transaction not found" });
    }

    if (status === "success") {
      if (tx.status !== "success") {
        const wallet = await getOrCreateWallet({ churchId: req.activeChurch._id });

        wallet.balanceCredits = Number(wallet.balanceCredits || 0) + Math.max(0, Number(tx.amountCredits || 0));
        await wallet.save();

        tx.status = "success";
        tx.balanceAfterCredits = wallet.balanceCredits;
        await tx.save();

        return res.status(200).json({ wallet, transaction: tx });
      }

      const wallet = await getOrCreateWallet({ churchId: req.activeChurch._id });
      return res.status(200).json({ wallet, transaction: tx });
    }

    if (status === "failed") {
      if (tx.status !== "failed") {
        tx.status = "failed";
        await tx.save();
      }
      return res.status(200).json({ status: "failed" });
    }

    return res.status(200).json({ status: status || "pending" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
