import mongoose from "mongoose";
import dns from "node:dns";

const connectDB = async () => {
    try {
        const dnsServersRaw = process.env.MONGO_DNS_SERVERS;
        if (dnsServersRaw) {
            const servers = dnsServersRaw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

            if (servers.length) dns.setServers(servers);
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected successfully to the server...");
    
    } catch (error) {
        console.log("MongoDB connection failed", error.message);
        process.exit(1);
    }
}

export default connectDB;