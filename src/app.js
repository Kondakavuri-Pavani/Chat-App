require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
app.use(express.static('public'));


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// Mongoose Schema
const chatSchema = new mongoose.Schema({
    username: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model("Chat", chatSchema);

// Serve static files
app.use(express.static("public"));

// Socket.io Connection
io.on("connection", async (socket) => {
    console.log("A user connected");

    // Load previous chat messages
    try {
        const messages = await Chat.find().sort({ timestamp: 1 }).limit(50);
        socket.emit("loadMessages", messages);
    } catch (err) {
        console.error("Error loading chat history:", err);
    }

    // Handle chat message
    socket.on("chatMessage", async (data) => {
        const { username, message } = data;

        if (!username || !message.trim()) return;
        if (message.length > 200) {
            socket.emit("errorMessage", "Message is too long! Max 200 characters.");
            return;
        }

        // Save message to database
        const chatMessage = new Chat({ username, message });
        await chatMessage.save();

        // Broadcast message to all users
        io.emit("chatMessage", { username, message });
    });

    // Handle user disconnect
    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

// Contact Schema
const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    username: String,
    issue: String,
    timestamp: { type: Date, default: Date.now }
});
const Contact = mongoose.model("Contact", contactSchema);

// Handle Contact Form Submission
app.post("/contact", async (req, res) => {
    const { name, email, username, issue } = req.body;

    if (!name || !email || !username || !issue) {
        return res.status(400).json({ error: "All fields are required!" });
    }

    try {
        const newIssue = new Contact({ name, email, username, issue });
        await newIssue.save();
        res.status(200).json({ message: "Issue submitted successfully!" });
    } catch (err) {
        console.error("Error saving contact issue:", err);
        res.status(500).json({ error: "Server error, try again later." });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
