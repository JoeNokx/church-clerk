import mongoose from "mongoose";
import dns from "node:dns";

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("MONGO_URI is required");
        }

        const dnsServersRaw = process.env.MONGO_DNS_SERVERS;
        if (dnsServersRaw) {
            const servers = dnsServersRaw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

            if (servers.length) dns.setServers(servers);
        }

        const dnsOrder = String(process.env.MONGO_DNS_RESULT_ORDER || "").trim();
        if (dnsOrder) {
            dns.setDefaultResultOrder(dnsOrder);
        }

        mongoose.connection.on("error", (err) => {
            console.log("MongoDB connection error", err?.message || err);
        });
        mongoose.connection.on("disconnected", () => {
            console.log("MongoDB disconnected");
        });
        mongoose.connection.on("reconnected", () => {
            console.log("MongoDB reconnected");
        });

        const serverSelectionTimeoutMS = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10_000);
        const connectTimeoutMS = Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 10_000);

        const mongoOpts = {
            serverSelectionTimeoutMS,
            connectTimeoutMS,
        };

        if (String(process.env.MONGO_TLS_INSECURE || "").trim().toLowerCase() === "true") {
            mongoOpts.tls = true;
            mongoOpts.tlsAllowInvalidCertificates = true;
            mongoOpts.tlsAllowInvalidHostnames = true;
        }

        await mongoose.connect(mongoUri, mongoOpts);
        console.log("MongoDB connected successfully to the server...");
    
    } catch (error) {
        console.log("MongoDB connection failed", error.message);
        process.exit(1);
    }
}

export default connectDB;