// var http = require("http");

// //create a server object:
// http
//   .createServer(function (req, res) {
//     res.write("Hello from CodeSandbox!"); //write a response to the client
//     res.end(); //end the response
//   })
//   .listen(8080); //the server object listens on port 8080
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const PORT = process.env.PORT || 8080;
const MONGOURL = process.env.MONGOURL;
const cors = require("cors");
const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "*",
  })
);

mongoose.connect(MONGOURL, {
  useNewUrlParser: true,#abc
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

const taskSchema = new mongoose.Schema({
  text: String,
  status: String,
  priority: String,
  userId: mongoose.Schema.Types.ObjectId,
});

const Task = mongoose.model("Task", taskSchema);

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt(password, 10);
  const user = new User({ username, password: hashed });
  await user.save();
  res.json({ message: "User has been registered" });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid Credentials" });
  }
  const token = jwt.sign({ userId: user._id }, "secret", { expiresIn: "1h" });
  res.json({ token });
});

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    const decode = jwt.verify(token, "secret");
    req.userId = decode.userId;
    next();
  } catch (e) {
    res.status(401).json({ message: "Invalid Token" });
  }
};

// GET task request
app.get("/tasks", authMiddleware, async (req, res) => {
  const tasks = await Task.find({ userId: req.userId });
  res.json(tasks);
});

// POST task request
app.post("/tasks", authMiddleware, async (req, res) => {
  const task = new Task({ ...req.body, userId: req.userId });
  await task.save();
});

// DELETE task request
app.delete("/tasks/:id", authMiddleware, async (req, res) => {
  await Task.findOneAndDelete({ _id: req.params.id });
  res.json({ message: "Task deleted" });
});

// PATCH
app.patch("/tasks/:id/status", authMiddleware, async (req, res) => {
  const { status } = req.body;
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { status },
    { new: true }
  );
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json({ task });
});

app.patch("/tasks/:id/priority", authMiddleware, async (req, res) => {
  const { priority } = req.body;
  const task = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { priority },
    { new: true }
  );
  if (!task) return res.status(404).json({ message: "Task not found" });
  res.json({ task });
});

app.listen(PORT, () => console.log("Server is running on 8080"));
